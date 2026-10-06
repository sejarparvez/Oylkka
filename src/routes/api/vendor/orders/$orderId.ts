import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { sendOrderShippedNotification } from '@/actions/send-order-email';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};

function isValidTransition(current: string, next: string): boolean {
  const allowed = VALID_TRANSITIONS[current];
  return !!allowed && allowed.includes(next);
}

const ALLOWED_FULFILLMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

export const Route = createFileRoute('/api/vendor/orders/$orderId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const { orderId } = params;

          const order = await prisma.order.findFirst({
            where: { id: orderId },
            include: {
              items: {
                where: { shopId: shop.id },
              },
            },
          });

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }

          if (order.items.length === 0) {
            return Response.json(
              { error: 'No items from your shop in this order' },
              { status: 404 },
            );
          }

          const data = {
            id: order.id,
            orderNumber: order.orderNumber,
            orderDate: order.createdAt.toISOString(),
            customerName: order.shippingName,
            customerEmail: order.shippingEmail,
            customerPhone: order.shippingPhone,
            shippingAddress: order.shippingAddress,
            shippingUpzila: order.shippingUpzila,
            shippingDistrict: order.shippingDistrict,
            shippingPostalCode: order.shippingPostalCode,
            shippingComment: order.shippingComment,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            total: order.total,
            currency: order.currency,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            orderStatus: order.status,
            items: order.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              variantName: item.variantName,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPrice: item.discountPrice,
              total: item.total,
              commissionRate: item.commissionRate,
              commissionAmount: item.commissionAmount,
              vendorAmount: item.vendorAmount,
              fulfillmentStatus: item.fulfillmentStatus,
              trackingNumber: item.trackingNumber,
              trackingUrl: item.trackingUrl,
              shippedAt: item.shippedAt?.toISOString() ?? null,
              deliveredAt: item.deliveredAt?.toISOString() ?? null,
            })),
          };

          return Response.json(data, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const { orderId } = params;
          const body: {
            itemId: string;
            fulfillmentStatus: string;
            trackingNumber?: string;
            trackingUrl?: string;
          } = await request.json();

          if (!body.itemId) {
            return Response.json(
              { error: 'itemId is required' },
              { status: 400 },
            );
          }

          if (
            !body.fulfillmentStatus ||
            !ALLOWED_FULFILLMENT_STATUSES.includes(body.fulfillmentStatus)
          ) {
            return Response.json(
              { error: 'Invalid fulfillment status' },
              { status: 400 },
            );
          }

          // Fetch the item and verify ownership
          const item = await prisma.orderItem.findFirst({
            where: {
              id: body.itemId,
              orderId,
              shopId: shop.id,
            },
          });

          if (!item) {
            return Response.json(
              { error: 'Order item not found' },
              { status: 404 },
            );
          }

          if (item.fulfillmentStatus === body.fulfillmentStatus) {
            return Response.json(
              { error: 'Item is already in this status' },
              { status: 400 },
            );
          }

          if (
            !isValidTransition(item.fulfillmentStatus, body.fulfillmentStatus)
          ) {
            return Response.json(
              {
                error: `Cannot transition from ${item.fulfillmentStatus} to ${body.fulfillmentStatus}`,
              },
              { status: 400 },
            );
          }

          if (body.fulfillmentStatus === 'SHIPPED' && !body.trackingNumber) {
            return Response.json(
              { error: 'Tracking number is required when marking as shipped' },
              { status: 400 },
            );
          }

          const updateData: Record<string, unknown> = {
            fulfillmentStatus: body.fulfillmentStatus,
          };

          if (body.fulfillmentStatus === 'SHIPPED') {
            updateData.trackingNumber = body.trackingNumber ?? null;
            updateData.trackingUrl = body.trackingUrl ?? null;
            updateData.shippedAt = new Date();
          }

          if (body.fulfillmentStatus === 'DELIVERED') {
            updateData.deliveredAt = new Date();
          }

          const updated = await prisma.orderItem.update({
            where: { id: body.itemId },
            data: updateData,
          });

          // Fire-and-forget: send shipping notification email
          if (body.fulfillmentStatus === 'SHIPPED') {
            sendOrderShippedNotification(orderId, body.itemId).catch((err) =>
              logError('order-shipped-notification', err),
            );
          }

          return Response.json(
            {
              id: updated.id,
              fulfillmentStatus: updated.fulfillmentStatus,
              trackingNumber: updated.trackingNumber,
              trackingUrl: updated.trackingUrl,
              shippedAt: updated.shippedAt?.toISOString() ?? null,
              deliveredAt: updated.deliveredAt?.toISOString() ?? null,
            },
            { status: 200 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
