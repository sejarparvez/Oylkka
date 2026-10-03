import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { createBkashPayment } from '@/lib/bkash';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { checkoutLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

export const Route = createFileRoute('/api/checkout/bkash-pay')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });

        if (!session?.user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimitResponse = await checkRateLimit(
          checkoutLimiter,
          `user:${session.user.id}`,
        );
        if (rateLimitResponse) return rateLimitResponse;

        const csrfResponse = validateCsrf();
        if (csrfResponse) return csrfResponse;

        const body: { orderId: string } = await request.json();

        if (!body.orderId) {
          return Response.json(
            { error: 'Order ID is required' },
            { status: 400 },
          );
        }

        let order = await prisma.order.findUnique({
          where: { id: body.orderId },
        });

        if (!order) {
          return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.customerId !== session.user.id) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (order.paymentMethod !== 'BKASH') {
          return Response.json(
            { error: 'This order is not set for bKash payment' },
            { status: 400 },
          );
        }

        if (
          order.paymentStatus !== 'PENDING' &&
          order.paymentStatus !== 'FAILED'
        ) {
          return Response.json(
            { error: 'Payment already processed' },
            { status: 400 },
          );
        }

        // Allow retry for failed payments: reset to PENDING
        if (order.paymentStatus === 'FAILED') {
          const metadata = order.metadata as Record<string, unknown> | null;
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PENDING',
              metadata: {
                ...(metadata || {}),
                bkashError: undefined,
              },
            },
          });
          // Re-fetch to get updated metadata
          order = await prisma.order.findUnique({
            where: { id: order.id },
          });
          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }
        }

        // Idempotency: if a checkout URL was already generated, return it
        const existingMetadata = order.metadata as Record<
          string,
          unknown
        > | null;
        const existingCheckoutURL = existingMetadata?.bkashCheckoutURL as
          | string
          | undefined;

        if (existingCheckoutURL && order.paymentStatus === 'PENDING') {
          return Response.json(
            { checkoutURL: existingCheckoutURL },
            { status: 200 },
          );
        }

        try {
          const baseUrl =
            process.env.BETTER_AUTH_URL || `http://localhost:3000`;

          const result = await createBkashPayment({
            amount: Number(order.total),
            orderId: order.id,
            merchantInvoiceNumber: order.orderNumber,
            callbackURL: `${baseUrl}/api/checkout/bkash-callback?orderId=${order.id}`,
          });

          if (result.statusCode && result.statusCode !== '0000') {
            await prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'FAILED',
                metadata: {
                  ...(order.metadata as Record<string, unknown>),
                  bkashPaymentID: result.paymentID,
                  bkashError: result.statusMessage || result.statusCode,
                },
              },
            });

            return Response.json(
              {
                error:
                  result.statusMessage || 'bKash payment initiation failed',
              },
              { status: 400 },
            );
          }

          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentRef: result.merchantInvoiceNumber,
              metadata: {
                ...(order.metadata as Record<string, unknown>),
                bkashPaymentID: result.paymentID,
                bkashCheckoutURL: result.bkashURL,
              },
            },
          });

          return Response.json(
            { checkoutURL: result.bkashURL },
            { status: 200 },
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'bKash payment failed';

          await prisma.order
            .update({
              where: { id: order.id },
              data: {
                paymentStatus: 'FAILED',
                metadata: {
                  ...(order.metadata as Record<string, unknown>),
                  bkashError: message,
                },
              },
            })
            .catch(() => {});

          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
