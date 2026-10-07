import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { auth } from '@/lib/auth';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { generalLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { sendEmail } from '@/lib/send-email';
import { requireActiveVendorShop } from '@/lib/vendor-guard';

export const Route = createFileRoute('/api/vendor/returns/review')({
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

          const guard = await requireActiveVendorShop(session.user.id);
          if (guard.response) return guard.response;
          const shop = guard.shop;

          const body = await request.json();
          const { returnId, status: newStatus, adminNote } = body;

          if (!returnId || !newStatus) {
            return Response.json(
              { error: 'returnId and status are required' },
              { status: 400 },
            );
          }

          const VALID_STATUSES = ['APPROVED', 'REJECTED'];
          if (!VALID_STATUSES.includes(newStatus)) {
            return Response.json({ error: 'Invalid status' }, { status: 400 });
          }

          const returnRequest = await prisma.returnRequest.findFirst({
            where: { id: returnId, shopId: shop.id },
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  customerId: true,
                  shippingEmail: true,
                  shippingName: true,
                },
              },
            },
          });

          if (!returnRequest) {
            return Response.json(
              { error: 'Return request not found' },
              { status: 404 },
            );
          }

          if (returnRequest.status !== 'PENDING') {
            return Response.json(
              { error: 'Return request has already been reviewed' },
              { status: 400 },
            );
          }

          const updated = await prisma.returnRequest.update({
            where: { id: returnId },
            data: {
              status: newStatus as never,
              adminNote: adminNote ?? null,
              reviewedBy: session.user.id,
              reviewedAt: new Date(),
            },
          });

          // AUTH-11: a vendor return decision is a commercial action — record
          // it in the audit trail and tell the customer the outcome.
          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'VENDOR',
            action: 'RETURN_REVIEWED',
            entity: 'ReturnRequest',
            entityId: returnId,
            details: {
              status: newStatus,
              shopId: shop.id,
              orderId: returnRequest.order.id,
              adminNote: adminNote ?? null,
            },
            ipAddress: getClientIp(headers) ?? undefined,
          });

          const customerEmail = returnRequest.order.shippingEmail;
          if (customerEmail) {
            await sendEmail({
              to: customerEmail,
              subject:
                newStatus === 'APPROVED'
                  ? 'Your return request was approved'
                  : 'Your return request was rejected',
              meta: {
                greeting: returnRequest.order.shippingName ?? undefined,
                description:
                  newStatus === 'APPROVED'
                    ? `Good news — your return request for order #${returnRequest.order.orderNumber} has been approved. Please follow the return instructions and we'll process your refund once the item is received.`
                    : `Your return request for order #${returnRequest.order.orderNumber} was not approved.${adminNote ? ` Reason: ${adminNote}` : ''}`,
                link: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/dashboard/orders/returns`,
                callToActionText: 'View Return',
              },
            }).catch(() => {
              // Notification is best-effort and must not fail the review.
            });
          }

          return Response.json({ return: updated });
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
