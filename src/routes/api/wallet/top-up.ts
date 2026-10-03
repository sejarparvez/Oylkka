import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createBkashPayment } from '@/lib/bkash';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { generalLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

const MIN_TOP_UP = 10;
const MAX_TOP_UP = 50_000;

const topUpSchema = z.object({
  amount: z
    .number()
    .min(MIN_TOP_UP, `Minimum top-up is ৳${MIN_TOP_UP}`)
    .max(MAX_TOP_UP, `Maximum top-up is ৳${MAX_TOP_UP.toLocaleString()}`)
    .refine(
      (value) => Number.isInteger(Math.round(value * 100)),
      'Amount can have at most 2 decimals',
    ),
});

export const Route = createFileRoute('/api/wallet/top-up')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const rateLimitResponse = await checkRateLimit(
            generalLimiter,
            `user:${session.user.id}`,
          );
          if (rateLimitResponse) return rateLimitResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const parsed = topUpSchema.safeParse(body);

          if (!parsed.success) {
            const firstError = parsed.error.issues[0];
            return Response.json(
              { error: firstError?.message || 'Invalid amount' },
              { status: 400 },
            );
          }

          const topUp = await prisma.walletTopUp.create({
            data: {
              userId: session.user.id,
              amount: parsed.data.amount,
              status: 'PENDING',
            },
          });

          const baseUrl =
            process.env.BETTER_AUTH_URL || 'http://localhost:3000';

          try {
            const result = await createBkashPayment({
              amount: parsed.data.amount,
              orderId: topUp.id,
              merchantInvoiceNumber: topUp.id,
              callbackURL: `${baseUrl}/api/wallet/bkash-callback?topUpId=${topUp.id}`,
            });

            if (result.statusCode && result.statusCode !== '0000') {
              await prisma.walletTopUp.update({
                where: { id: topUp.id },
                data: {
                  status: 'FAILED',
                  bkashPaymentID: result.paymentID,
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

            await prisma.walletTopUp.update({
              where: { id: topUp.id },
              data: {
                bkashPaymentID: result.paymentID,
                checkoutURL: result.bkashURL,
              },
            });

            return Response.json(
              { checkoutURL: result.bkashURL },
              { status: 200 },
            );
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'bKash payment failed';

            await prisma.walletTopUp
              .update({ where: { id: topUp.id }, data: { status: 'FAILED' } })
              .catch(() => {});

            const notConfigured = message === 'bKash is not configured';
            return Response.json(
              {
                error: notConfigured
                  ? 'Mobile wallet top-up is temporarily unavailable'
                  : message,
              },
              { status: notConfigured ? 503 : 500 },
            );
          }
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
