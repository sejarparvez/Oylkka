import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { refundBkashPayment } from '@/lib/bkash';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { orderRefundHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import type { OrderMetadata } from '@/types/orders';

class ReturnConflictError extends Error {
  constructor() {
    super('Return request was modified by another request');
    this.name = 'ReturnConflictError';
  }
}

// Statuses from which a refund may still be issued. REJECTED and REFUNDED
// are terminal and must never be refunded again.
const REFUNDABLE_SOURCES = [
  'PENDING',
  'APPROVED',
  'AWAITING_SHIPMENT',
  'SHIPPED',
  'RECEIVED',
];

export const Route = createFileRoute('/api/admin/returns/review')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const { returnId, status: newStatus, refundAmount, adminNote } = body;

          if (!returnId || !newStatus) {
            return Response.json(
              { error: 'returnId and status are required' },
              { status: 400 },
            );
          }

          const VALID_STATUSES = ['APPROVED', 'REJECTED', 'REFUNDED'];
          if (!VALID_STATUSES.includes(newStatus)) {
            return Response.json({ error: 'Invalid status' }, { status: 400 });
          }

          const returnRequest = await prisma.returnRequest.findUnique({
            where: { id: returnId },
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  customerId: true,
                  total: true,
                  refundAmount: true,
                  paymentMethod: true,
                  paymentStatus: true,
                  shippingName: true,
                  shippingEmail: true,
                  metadata: true,
                  paymentRef: true,
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

          // --- Approve / reject: simple one-way transition from PENDING ---
          if (newStatus !== 'REFUNDED') {
            if (returnRequest.status !== 'PENDING') {
              return Response.json(
                { error: 'Return request has already been reviewed' },
                { status: 400 },
              );
            }

            const updated = await prisma.returnRequest.updateMany({
              where: { id: returnId, status: 'PENDING' },
              data: {
                status: newStatus as never,
                adminNote: adminNote ?? null,
                reviewedBy: session.user.id,
                reviewedAt: new Date(),
              },
            });

            if (updated.count === 0) {
              return Response.json(
                { error: 'Return request was already reviewed' },
                { status: 409 },
              );
            }

            const returnRow = await prisma.returnRequest.findUniqueOrThrow({
              where: { id: returnId },
            });

            return Response.json({ return: returnRow });
          }

          // --- Refund transition ---
          if (!REFUNDABLE_SOURCES.includes(returnRequest.status)) {
            return Response.json(
              {
                error: `Return request cannot be refunded from status ${returnRequest.status}`,
              },
              { status: 400 },
            );
          }

          const order = returnRequest.order;
          const paymentMethod = order.paymentMethod;

          if (paymentMethod !== 'WALLET' && paymentMethod !== 'BKASH') {
            return Response.json(
              {
                error:
                  'Cash-on-delivery refunds must be processed from the order page',
                redirect: `/admin/orders/${order.id}`,
              },
              { status: 400 },
            );
          }

          // A refund must only ever touch money the customer actually paid.
          const wasPaid =
            order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'PARTIALLY_REFUNDED';
          if (!wasPaid) {
            return Response.json(
              { error: 'Order has not been paid; cannot issue a refund' },
              { status: 400 },
            );
          }

          const alreadyRefunded = Number(order.refundAmount ?? 0);
          const remaining = Number(order.total) - alreadyRefunded;
          const amount = Number(refundAmount ?? remaining);

          if (!Number.isFinite(amount) || amount <= 0) {
            return Response.json(
              { error: 'Refund amount must be positive' },
              { status: 400 },
            );
          }

          if (amount > remaining + 0.001) {
            return Response.json(
              {
                error: `Refund amount exceeds the remaining refundable balance (৳${remaining.toFixed(2)})`,
              },
              { status: 400 },
            );
          }

          const newRefundAmount = alreadyRefunded + amount;
          const fullyRefunded =
            newRefundAmount >= Number(order.total) - 0.001;

          // Dispatch per payment method. The gateway is called *before* the
          // DB transaction so a failure leaves no partial state, and nothing
          // is marked REFUNDED until the gateway confirms.
          let bkashRefundTrxID: string | undefined;
          if (paymentMethod === 'BKASH') {
            const metadata = (order.metadata ?? {}) as OrderMetadata;
            const paymentID = metadata.bkashPaymentID;
            const trxID = metadata.bkashTrxID ?? order.paymentRef ?? undefined;

            if (!paymentID || !trxID) {
              return Response.json(
                { error: 'Missing bKash payment reference; refund manually' },
                { status: 400 },
              );
            }

            try {
              const result = await refundBkashPayment({
                paymentID,
                trxID,
                amount,
                reason: returnRequest.details || 'Return refund',
              });
              bkashRefundTrxID = result?.refundTrxID;
            } catch (gatewayError) {
              // biome-ignore lint/suspicious/noConsole: this is fine
              console.error('bKash return refund failed:', gatewayError);
              return Response.json(
                {
                  error:
                    'bKash refund failed; no changes were made to the order',
                },
                { status: 502 },
              );
            }
          }

          let updated: Awaited<
            ReturnType<typeof prisma.returnRequest.findUniqueOrThrow>
          >;
          try {
            updated = await prisma.$transaction(async (tx) => {
              // Claim the return request atomically — prevents re-entry and
              // concurrent double refunds of the same request.
              const claimed = await tx.returnRequest.updateMany({
                where: {
                  id: returnId,
                  status: { in: REFUNDABLE_SOURCES as never },
                },
                data: {
                  status: 'REFUNDED',
                  refundAmount: amount,
                  adminNote: adminNote ?? null,
                  reviewedBy: session.user.id,
                  reviewedAt: new Date(),
                },
              });

              if (claimed.count === 0) {
                throw new ReturnConflictError();
              }

              // Optimistic guard on the order's running refund total so two
              // different returns cannot both credit against the same order.
              const orderClaim = await tx.order.updateMany({
                where: {
                  id: order.id,
                  refundAmount: order.refundAmount,
                  paymentStatus: { not: 'REFUNDED' },
                },
                data: {
                  refundAmount: newRefundAmount,
                  refundReason: returnRequest.details || 'Return refund',
                  refundedAt: new Date(),
                  paymentStatus: fullyRefunded
                    ? 'REFUNDED'
                    : 'PARTIALLY_REFUNDED',
                  ...(fullyRefunded ? { status: 'REFUNDED' } : {}),
                  ...(bkashRefundTrxID
                    ? {
                        metadata: {
                          ...((order.metadata as OrderMetadata) ?? {}),
                          bkashRefundTrxID,
                        },
                      }
                    : {}),
                },
              });

              if (orderClaim.count === 0) {
                throw new ReturnConflictError();
              }

              if (paymentMethod === 'WALLET') {
                const wallet = await tx.wallet.upsert({
                  where: { userId: order.customerId },
                  create: {
                    userId: order.customerId,
                    balance: amount,
                  },
                  update: {
                    balance: { increment: amount },
                  },
                });

                await tx.walletTransaction.create({
                  data: {
                    walletId: wallet.id,
                    type: 'CREDIT',
                    amount,
                    reference: 'REFUND',
                    orderId: order.id,
                    description: `Refund for return ${returnRequest.id}`,
                  },
                });
              }

              // Scope item updates to this order to prevent cross-order edits.
              if (returnRequest.itemIds.length > 0) {
                await tx.orderItem.updateMany({
                  where: {
                    id: { in: returnRequest.itemIds },
                    orderId: order.id,
                  },
                  data: { fulfillmentStatus: 'REFUNDED' },
                });
              }

              return tx.returnRequest.findUniqueOrThrow({
                where: { id: returnId },
              });
            });
          } catch (error) {
            if (error instanceof ReturnConflictError) {
              return Response.json(
                {
                  error:
                    'Return request was modified by another request. Refresh and try again.',
                },
                { status: 409 },
              );
            }
            throw error;
          }

          sendEmail({
            to: order.shippingEmail,
            subject: `Refund Processed — #${order.orderNumber}`,
            meta: {
              description: '',
              link: '',
              callToActionText: '',
            },
            html: orderRefundHtml(
              {
                orderNumber: order.orderNumber,
                customerName: order.shippingName,
              },
              amount,
              returnRequest.details || 'Return refund',
              paymentMethod || 'CASH_ON_DELIVERY',
            ),
          }).catch((err) =>
            // biome-ignore lint/suspicious/noConsole: this is fine
            console.error('Failed to send return refund email:', err),
          );

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
