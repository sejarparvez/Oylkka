import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { sendOrderConfirmation } from '@/actions/send-order-email';
import { auth } from '@/lib/auth';
import { executeBkashPayment } from '@/lib/bkash';
import { finalizeBkashOrder } from '@/lib/bkash-finalize';
import { prisma } from '@/lib/db';
import { checkoutLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { incrementStock, releaseReservedStock } from '@/lib/stock';
import type { OrderMetadata } from '@/types/orders';

export const Route = createFileRoute('/api/checkout/bkash-callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const rateLimitResponse = await checkRateLimit(checkoutLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const url = new URL(request.url);
          const paymentID = url.searchParams.get('paymentID');
          const status = url.searchParams.get('status');
          const orderIdParam = url.searchParams.get('orderId');

          const baseUrl =
            process.env.BETTER_AUTH_URL || 'http://localhost:3000';

          if (status === 'cancel' || status === 'failure') {
            if (orderIdParam) {
              const order = await prisma.order.findUnique({
                where: { id: orderIdParam },
                include: { items: true },
              });

              if (order) {
                // Ownership: either the signed-in customer owns the order, or
                // the callback carries the unguessable bKash paymentID we
                // stored when the payment was created. Without one of these
                // an attacker cannot fail an arbitrary order (MONEY-01).
                let sessionOwns = false;
                try {
                  const headers = getRequestHeaders();
                  const session = await auth.api.getSession({ headers });
                  sessionOwns = session?.user?.id === order.customerId;
                } catch {
                  sessionOwns = false;
                }
                const meta = (order.metadata ?? {}) as OrderMetadata;
                const paymentIdMatches =
                  !!paymentID && meta.bkashPaymentID === paymentID;

                if (sessionOwns || paymentIdMatches) {
                  await prisma.$transaction(async (tx) => {
                    // Conditional transition: only a still-PENDING order may
                    // be failed. A PAID order is never touched.
                    const claim = await tx.order.updateMany({
                      where: { id: order.id, paymentStatus: 'PENDING' },
                      data: { paymentStatus: 'FAILED' },
                    });
                    if (claim.count === 0) return;

                    for (const item of order.items) {
                      if (item.variantId) {
                        await releaseReservedStock(
                          tx,
                          item.variantId,
                          item.quantity,
                        ).catch(() => {});
                      } else {
                        await incrementStock(
                          tx,
                          item.productId,
                          item.quantity,
                        ).catch(() => {});
                      }
                    }
                  });
                }
              }
            }

            const redirectUrl = orderIdParam
              ? `${baseUrl}/checkout/confirmation?orderId=${orderIdParam}&error=payment-cancelled`
              : `${baseUrl}/checkout?error=payment-cancelled`;
            return Response.redirect(redirectUrl);
          }

          if (!paymentID) {
            return Response.redirect(
              `${baseUrl}/checkout?error=invalid-payment`,
            );
          }

          const result = await executeBkashPayment(paymentID);

          // Find order by paymentRef or by metadata, including items for stock decrement
          let order = await prisma.order.findFirst({
            where: {
              paymentRef: result.merchantInvoiceNumber || paymentID,
            },
            include: { items: true },
          });

          if (!order) {
            order = await prisma.order.findFirst({
              where: {
                metadata: {
                  path: ['bkashPaymentID'],
                  equals: paymentID,
                },
              },
              include: { items: true },
            });
          }

          if (!order) {
            return Response.redirect(
              `${baseUrl}/checkout?error=order-not-found`,
            );
          }

          if (result.transactionStatus === 'Completed') {
            const finalized = await finalizeBkashOrder({
              orderId: order.id,
              trxID: result.trxID,
              capturedAmount: Number(result.amount),
            });

            if (finalized.status === 'amount_mismatch') {
              return Response.redirect(
                `${baseUrl}/checkout/confirmation?orderId=${order.id}&error=payment-amount-mismatch`,
              );
            }

            if (finalized.status === 'not_found') {
              return Response.redirect(
                `${baseUrl}/checkout?error=order-not-found`,
              );
            }

            // Only send the confirmation when this callback performed the
            // finalization; a replay must not email the customer again.
            if (finalized.status === 'finalized') {
              sendOrderConfirmation(order.id).catch((e) => {
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to send order confirmation:', e);
              });
            }

            return Response.redirect(
              `${baseUrl}/checkout/confirmation?orderId=${order.id}`,
            );
          }

          // Payment failed — only a PENDING order may transition to FAILED,
          // and only then is the reservation released.
          await prisma.$transaction(async (tx) => {
            const claim = await tx.order.updateMany({
              where: { id: order.id, paymentStatus: 'PENDING' },
              data: { paymentStatus: 'FAILED' },
            });
            if (claim.count === 0) return;

            for (const item of order.items) {
              if (item.variantId) {
                await releaseReservedStock(tx, item.variantId, item.quantity);
              } else {
                await incrementStock(tx, item.productId, item.quantity);
              }
            }
          });

          return Response.redirect(
            `${baseUrl}/checkout/confirmation?orderId=${order.id}&error=payment-failed`,
          );
        } catch (_error) {
          const baseUrl =
            process.env.BETTER_AUTH_URL || 'http://localhost:3000';
          return Response.redirect(`${baseUrl}/checkout?error=payment-failed`);
        }
      },
    },
  },
});
