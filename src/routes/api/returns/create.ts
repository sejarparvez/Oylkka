import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { UploadImage } from '@/cloudinary';
import type { ReturnReason } from '@/generated/prisma/enums';
import { auth } from '@/lib/auth';
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
              itemIds = JSON.parse(rawItemIds);
            } catch (error) {
              // biome-ignore lint/suspicious/noConsole: this is fine
              console.error('Failed to parse item IDs JSON:', error);
              itemIds = rawItemIds
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            }
          }

          const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: {
                where: itemIds.length > 0 ? { id: { in: itemIds } } : undefined,
                include: { shop: { select: { id: true } } },
              },
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

          // Check 30-day return window
          const deliveredItems = order.items.filter(
            (i) => i.deliveredAt && i.fulfillmentStatus === 'DELIVERED',
          );
          if (deliveredItems.length === 0) {
            return Response.json(
              { error: 'No delivered items found in this order' },
              { status: 400 },
            );
          }

          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const allWithinWindow = deliveredItems.every(
            (i) => i.deliveredAt && i.deliveredAt > thirtyDaysAgo,
          );
          if (!allWithinWindow) {
            return Response.json(
              { error: 'Return window has expired (30 days from delivery)' },
              { status: 400 },
            );
          }

          // Check for existing pending return on same items
          if (itemIds.length > 0) {
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
                  error:
                    'A return request already exists for one of these items',
                },
                { status: 409 },
              );
            }
          }

          const shopIds = [...new Set(deliveredItems.map((i) => i.shopId))];
          if (shopIds.length !== 1) {
            return Response.json(
              { error: 'Return must be for items from the same shop' },
              { status: 400 },
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

          const returnRequest = await prisma.returnRequest.create({
            data: {
              orderId,
              itemIds,
              customerId: session.user.id,
              shopId: shopIds[0],
              reason: reason as ReturnReason,
              details,
              images: imageUrls,
              resolution,
            },
          });

          return Response.json({ returnRequest }, { status: 201 });
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
