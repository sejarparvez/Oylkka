import { createFileRoute } from '@tanstack/react-router';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { orderCancellationHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import { unwindUnpaidOrder } from '@/lib/stock';

export const Route = createFileRoute('/api/orders/admin-cancel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

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

          const order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: { items: true },
          });

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
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

          // Any state where money moved must go through the refund path. Cancelling
          // here would return stock for units the customer still holds, and the
          // PARTIALLY_REFUNDED case additionally left the order cancellable
          // after money had already been returned (MONEY-46).
          if (
            order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'PARTIALLY_REFUNDED' ||
            order.paymentStatus === 'REFUNDED' ||
            order.status === 'CONFIRMED'
          ) {
            return Response.json(
              {
                error:
                  'Order has been paid. Use the refund endpoint instead of cancel.',
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

          await prisma.$transaction(async (tx) => {
            await unwindUnpaidOrder(
              tx,
              body.orderId,
              order.paymentMethod,
              activeItems.map((i) => i.id),
            );

            await tx.order.update({
              where: { id: body.orderId },
              data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelledBy: session.user.id,
                cancellationReason: body.reason,
              },
            });
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'ADMIN',
            action: 'ORDER_CANCELLED',
            entity: 'Order',
            entityId: body.orderId,
            details: { reason: body.reason, orderNumber: order.orderNumber },
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
              body.reason,
              order.items.map((i) => ({
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
