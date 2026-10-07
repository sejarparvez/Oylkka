import { createFileRoute } from '@tanstack/react-router';
import { createAuditLog } from '@/lib/audit-log';
import { requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { orderCancellationHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import { unwindUnpaidOrder } from '@/lib/stock';

// Customer-initiated cancel (CUST-10). Deliberately narrower than the admin
// path: only before fulfilment starts (PENDING/CONFIRMED) and only while no
// money has moved - paid orders must go through the refund flow.
const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED'];
const MONEY_MOVED = ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'];

export const Route = createFileRoute('/api/orders/cancel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body: { orderId?: string; reason?: string } =
            await request.json();

          if (!body.orderId) {
            return Response.json(
              { error: 'orderId is required' },
              { status: 400 },
            );
          }

          const order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: { items: true },
          });

          // Non-owners get the same 404 as missing orders so order ids are
          // not enumerable across customers.
          if (!order || order.customerId !== session.user.id) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }

          if (!CANCELLABLE_STATUSES.includes(order.status)) {
            return Response.json(
              {
                error: `This order can no longer be cancelled (status: ${order.status.toLowerCase()})`,
              },
              { status: 400 },
            );
          }

          if (MONEY_MOVED.includes(order.paymentStatus)) {
            return Response.json(
              {
                error:
                  'This order has been paid. Contact support to request a refund instead.',
              },
              { status: 400 },
            );
          }

          const activeItems = order.items.filter(
            (i) => i.fulfillmentStatus !== 'CANCELLED',
          );

          if (activeItems.length === 0) {
            return Response.json(
              { error: 'All items in this order are already cancelled' },
              { status: 400 },
            );
          }

          const reason = body.reason?.trim() || 'Cancelled by customer';

          await prisma.$transaction(async (tx) => {
            await unwindUnpaidOrder(
              tx,
              order.id,
              order.paymentMethod,
              activeItems.map((i) => i.id),
            );

            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: session.user.id,
                cancellationReason: reason,
              },
            });
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'CUSTOMER',
            action: 'ORDER_CANCELLED',
            entity: 'Order',
            entityId: order.id,
            details: {
              reason,
              orderNumber: order.orderNumber,
              by: 'customer',
            },
            // biome-ignore lint/suspicious/noConsole: this is fine
          }).catch((err) => console.error('Failed to create audit log:', err));

          sendEmail({
            to: order.shippingEmail,
            subject: `Order #${order.orderNumber} Cancelled`,
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
              reason,
              activeItems.map((i) => ({
                productName: i.productName,
                quantity: i.quantity,
              })),
            ),
          }).catch((err) =>
            // biome-ignore lint/suspicious/noConsole: this is fine
            console.error('Failed to send cancellation email:', err),
          );

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
