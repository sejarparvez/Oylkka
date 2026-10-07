import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { UploadImage } from '@/cloudinary';
import type { ReturnReason } from '@/generated/prisma/enums';
import { auth } from '@/lib/auth';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { generalLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

const ResolutionEnum = z.enum(['REFUND', 'REPLACEMENT']);

export const Route = createFileRoute('/api/returns/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const rateLimitResponse = await checkRateLimit(generalLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const formData = await request.formData();
          const orderId = formData.get('orderId') as string;
          const reason = formData.get('reason') as string;
          const details = (formData.get('details') as string) || null;
          const resolution = ResolutionEnum.catch('REFUND').parse(
            (formData.get('resolution') as string) || 'REFUND',
          );
          const rawItemIds = formData.get('itemIds') as string;

          if (!orderId || !reason) {
            return Response.json(
              { error: 'orderId and reason are required' },
              { status: 400 },
            );
          }

          const VALID_REASONS = [
            'DEFECTIVE',
            'WRONG_ITEM',
            'NOT_AS_DESCRIBED',
            'SIZE_ISSUE',
            'DAMAGED',
            'UNWANTED',
            'OTHER',
          ];
          if (!VALID_REASONS.includes(reason)) {
            return Response.json({ error: 'Invalid reason' }, { status: 400 });
          }

          let itemIds: string[] = [];
          if (rawItemIds) {
            try {
              const parsed = JSON.parse(rawItemIds);
              if (Array.isArray(parsed)) {
                itemIds = parsed.filter(
                  (id): id is string => typeof id === 'string' && id.length > 0,
                );
              }
            } catch (error) {
              // biome-ignore lint/suspicious/noConsole: this is fine
              console.error('Failed to parse item IDs JSON:', error);
              itemIds = rawItemIds
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            }
          }
          itemIds = [...new Set(itemIds)];

          if (itemIds.length === 0) {
            return Response.json(
              { error: 'Select at least one item to return' },
              { status: 400 },
            );
          }

          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: true,
            },
          });

          if (!order || order.customerId !== session.user.id) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }

          if (order.status !== 'DELIVERED') {
            return Response.json(
              { error: 'Only delivered orders can be returned' },
              { status: 400 },
            );
          }

          // Every requested item must belong to this order.
          const orderItemIds = new Set(order.items.map((i) => i.id));
          if (itemIds.some((id) => !orderItemIds.has(id))) {
            return Response.json(
              { error: 'One or more items do not belong to this order' },
              { status: 400 },
            );
          }

          // Work only with the selected items (CUST-01).
          const selectedItems = order.items.filter((i) =>
            itemIds.includes(i.id),
          );
          const deliveredItems = selectedItems.filter(
            (i) => i.deliveredAt && i.fulfillmentStatus === 'DELIVERED',
          );
          if (deliveredItems.length !== selectedItems.length) {
            return Response.json(
              { error: 'Only delivered items can be returned' },
              { status: 400 },
            );
          }

          // Check return window (CUST-02: single source RETURN_WINDOW_DAYS).
          const windowStart = new Date(
            Date.now() - RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000,
          );
          const allWithinWindow = deliveredItems.every(
            (i) => i.deliveredAt && i.deliveredAt > windowStart,
          );
          if (!allWithinWindow) {
            return Response.json(
              {
                error: `Return window has expired (${RETURN_WINDOW_DAYS} days from delivery)`,
              },
              { status: 400 },
            );
          }

          // Check for existing pending return on same items (CUST-03: no
          // longer skipped when itemIds is empty — it can't be empty).
          const existing = await prisma.returnRequest.findFirst({
            where: {
              orderId,
              customerId: session.user.id,
              status: {
                in: [
                  'PENDING',
                  'APPROVED',
                  'AWAITING_SHIPMENT',
                  'SHIPPED',
                  'RECEIVED',
                ],
              },
              itemIds: { hasSome: itemIds },
            },
          });
          if (existing) {
            return Response.json(
              {
                error: 'A return request already exists for one of these items',
              },
              { status: 409 },
            );
          }

          // Upload images
          const imageEntries = formData
            .getAll('images')
            .filter((v): v is File => v instanceof File && v.size > 0);
          const imageUrls: string[] = [];
          for (const file of imageEntries) {
            const result = await UploadImage(file, 'returns');
            imageUrls.push(result.secure_url);
          }

          // One ReturnRequest per shop — a return may span vendors (CUST-01).
          const itemsByShop = new Map<string, { id: string }[]>();
          for (const item of selectedItems) {
            const group = itemsByShop.get(item.shopId) ?? [];
            group.push({ id: item.id });
            itemsByShop.set(item.shopId, group);
          }

          const returnRequests = await prisma.$transaction(async (tx) => {
            const created = [];
            for (const [shopId, items] of itemsByShop) {
              created.push(
                await tx.returnRequest.create({
                  data: {
                    orderId,
                    itemIds: items.map((i) => i.id),
                    customerId: session.user.id,
                    shopId,
                    reason: reason as ReturnReason,
                    details,
                    images: imageUrls,
                    resolution,
                  },
                }),
              );
            }
            return created;
          });

          return Response.json(
            { returnRequest: returnRequests[0], returnRequests },
            { status: 201 },
          );
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
