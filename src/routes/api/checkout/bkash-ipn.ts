import { createFileRoute } from '@tanstack/react-router';
import { executeBkashPayment, queryBkashPayment } from '@/lib/bkash';
import { finalizeBkashOrder } from '@/lib/bkash-finalize';
import { prisma } from '@/lib/db';
import { checkoutLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

export const Route = createFileRoute('/api/checkout/bkash-ipn')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rateLimitResponse = await checkRateLimit(checkoutLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const body: { paymentID?: string; trxID?: string; status?: string } =
            await request.json();

          const paymentID = body.paymentID;

          if (!paymentID) {
            return Response.json(
              { error: 'paymentID is required' },
              { status: 400 },
            );
          }

          // Query bKash for the actual payment status
          const status = await queryBkashPayment(paymentID);

          if (status.transactionStatus === 'Completed') {
            // Find the order by paymentID in metadata
            const order = await prisma.order.findFirst({
              where: {
                metadata: {
                  path: ['bkashPaymentID'],
                  equals: paymentID,
                },
              },
            });

            if (!order) {
              return Response.json(
                { error: 'Order not found' },
                { status: 404 },
              );
            }

            // Execute payment confirmation
            let executeResult: Awaited<ReturnType<typeof executeBkashPayment>>;
            try {
              executeResult = await executeBkashPayment(paymentID);
            } catch {
              return Response.json(
                { error: 'Failed to execute payment' },
                { status: 500 },
              );
            }

            if (executeResult.transactionStatus !== 'Completed') {
              return Response.json(
                { error: 'Payment not completed' },
                { status: 400 },
              );
            }

            // Idempotent finalization: the amount is verified against the
            // order total and concurrent IPNs/callbacks can only win once.
            const finalized = await finalizeBkashOrder({
              orderId: order.id,
              trxID: executeResult.trxID,
              capturedAmount: Number(executeResult.amount),
            });

            if (finalized.status === 'amount_mismatch') {
              return Response.json(
                { error: 'Payment amount does not match order total' },
                { status: 400 },
              );
            }

            if (finalized.status === 'not_found') {
              return Response.json(
                { error: 'Order not found' },
                { status: 404 },
              );
            }

            return Response.json(
              { message: 'Payment processed successfully' },
              { status: 200 },
            );
          }

          // Payment not completed — no action needed
          return Response.json(
            {
              message: 'Payment not completed',
              status: status.transactionStatus,
            },
            { status: 200 },
          );
        } catch {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
