import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { orderCancellationHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import { unwindUnpaidOrder } from '@/lib/stock';
import { requireActiveVendorShop } from '@/lib/vendor-guard';

export const Route = createFileRoute('/api/vendor/orders/cancel')({
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

          const guard = await requireActiveVendorShop(session.user.id);
          if (guard.response) return guard.response;
          const shop = guard.shop;

          const body: { orderId: string; reason: string } =
            await request.json();

          if (!body.orderId) {
            return Response.json(
              { error: 'orderId is required' },
              { status: 400 },
            );
          }

          if (!body.reason?.trim()) {
            return Response.json(
              { error: 'Cancellation reason is required' },
              { status: 400 },
            );
          }

          const order = await prisma.order.findFirst({
            where: { id: body.orderId },
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

          if (
            order.status === 'CANCELLED' ||
            order.status === 'REFUNDED' ||
            order.status === 'DELIVERED'
          ) {
            return Response.json(
              { error: `Order is already ${order.status.toLowerCase()}` },
              { status: 400 },
            );
          }

          if (
            order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'PARTIALLY_REFUNDED' ||
            order.paymentStatus === 'REFUNDED' ||
            order.status === 'CONFIRMED'
          ) {
            return Response.json(
              {
                error:
                  'Order has been paid. Contact admin to cancel and refund.',
              },
              { status: 400 },
            );
          }

          // Only cancel lines this vendor has not already cancelled. Restocking
          // the whole set on a repeat call is what inflated inventory without
          // bound (MONEY-44, MONEY-45, MONEY-46).
          const activeItems = order.items.filter(
            (i) => i.fulfillmentStatus !== 'CANCELLED',
          );

          if (activeItems.length === 0) {
            return Response.json(
              {
                error:
                  'All items from your shop in this order are already cancelled',
              },
              { status: 400 },
            );
          }

          const itemIds = activeItems.map((i) => i.id);

          const transitioned = await prisma.$transaction(async (tx) => {
            const unwound = await unwindUnpaidOrder(
              tx,
              body.orderId,
              order.paymentMethod,
              itemIds,
            );

            // Check if all items are now cancelled — mark entire order cancelled
            const remainingActive = await tx.orderItem.count({
              where: {
                orderId: body.orderId,
                fulfillmentStatus: { not: 'CANCELLED' },
              },
            });

            if (remainingActive === 0) {
              await tx.order.update({
                where: { id: body.orderId },
                data: {
                  status: 'CANCELLED',
                  cancelledAt: new Date(),
                  cancelledBy: session.user.id,
                  cancellationReason: body.reason,
                },
              });
            }

            return unwound;
          });

          // Report only the lines this request actually transitioned, so a
          // race that lost to a concurrent cancel does not tell the customer
          // about a cancellation that did not happen.
          const changedIds = new Set(transitioned.map((i) => i.id));
          const cancelledItems = order.items.filter((i) =>
            changedIds.has(i.id),
          );

          createAuditLog({
            actorId: session.user.id,
            actorRole: 'VENDOR',
            action: 'ORDER_CANCELLED',
            entity: 'Order',
            entityId: body.orderId,
            details: {
              reason: body.reason,
              orderNumber: order.orderNumber,
              shopId: shop.id,
              itemIds: cancelledItems.map((i) => i.id),
            },
          }).catch((e) => {
            // biome-ignore lint/suspicious/noConsole: this is fine
            console.error('Failed to create audit log:', e);
          });

          sendEmail({
            to: order.shippingEmail,
            subject: `Order #${order.orderNumber} — Item(s) Cancelled`,
            meta: {
              description: '',
              link: '',
              callToActionText: '',
            },
            html: orderCancellationHtml(
              {
                orderNumber: order.orderNumber,
                customerName: order.shippingName,
              },
              body.reason,
              cancelledItems.map((i) => ({
                productName: i.productName,
                quantity: i.quantity,
              })),
            ),
          }).catch((e) => {
            // biome-ignore lint/suspicious/noConsole: this is fine
            console.error('Failed to send cancellation email:', e);
          });

          return Response.json({ success: true }, { status: 200 });
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
