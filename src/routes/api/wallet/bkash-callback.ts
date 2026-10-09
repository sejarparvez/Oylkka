import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { executeBkashPayment } from '@/lib/bkash';
import { prisma } from '@/lib/db';
import { checkoutLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

const AMOUNT_TOLERANCE = 0.01;

export const Route = createFileRoute('/api/wallet/bkash-callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
        const walletUrl = `${baseUrl}/dashboard/wallet`;

        try {
          const rateLimitResponse = await checkRateLimit(checkoutLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const url = new URL(request.url);
          const topUpId = url.searchParams.get('topUpId');
          const paymentID = url.searchParams.get('paymentID');
          const status = url.searchParams.get('status');

          if (!topUpId) {
            return Response.redirect(`${walletUrl}?topup=error`);
          }

          const topUp = await prisma.walletTopUp.findUnique({
            where: { id: topUpId },
          });

          if (!topUp) {
            return Response.redirect(`${walletUrl}?topup=error`);
          }

          // Ownership: either the signed-in owner, or the unguessable bKash
          // paymentID we stored when the payment was created. Without one of
          // these an attacker cannot fail an arbitrary top-up.
          let sessionOwns = false;
          try {
            const headers = getRequestHeaders();
            const session = await auth.api.getSession({ headers });
            sessionOwns = session?.user?.id === topUp.userId;
          } catch {
            sessionOwns = false;
          }
          const paymentIdMatches =
            !!paymentID && topUp.bkashPaymentID === paymentID;

          if (!sessionOwns && !paymentIdMatches) {
            return Response.redirect(`${walletUrl}?topup=error`);
          }

          if (status === 'cancel' || status === 'failure') {
            await prisma.walletTopUp.updateMany({
              where: { id: topUp.id, status: 'PENDING' },
              data: { status: 'FAILED' },
            });
            return Response.redirect(`${walletUrl}?topup=cancelled`);
          }

          if (!paymentID || topUp.bkashPaymentID !== paymentID) {
            return Response.redirect(`${walletUrl}?topup=error`);
          }

          const result = await executeBkashPayment(paymentID);

          if (result.transactionStatus !== 'Completed') {
            await prisma.walletTopUp.updateMany({
              where: { id: topUp.id, status: 'PENDING' },
              data: { status: 'FAILED' },
            });
            return Response.redirect(`${walletUrl}?topup=failed`);
          }

          const expected = Number(topUp.amount);
          const received = Number(result.amount);
          if (
            !Number.isFinite(received) ||
            Math.abs(received - expected) > AMOUNT_TOLERANCE
          ) {
            // Never credit a mismatched payment; flag it instead.
            await prisma.walletTopUp.updateMany({
              where: { id: topUp.id, status: 'PENDING' },
              data: { status: 'FAILED', bkashTrxID: result.trxID },
            });
            return Response.redirect(`${walletUrl}?topup=error`);
          }

          // Atomically claim the top-up and credit the wallet. The conditional
          // PENDING guard makes concurrent callbacks idempotent: exactly one
          // credits the wallet.
          await prisma.$transaction(async (tx) => {
            const claim = await tx.walletTopUp.updateMany({
              where: { id: topUp.id, status: 'PENDING' },
              data: { status: 'PAID', bkashTrxID: result.trxID },
            });
            if (claim.count === 0) return;

            let wallet = await tx.wallet.findUnique({
              where: { userId: topUp.userId },
            });

            if (!wallet) {
              wallet = await tx.wallet.create({
                data: { userId: topUp.userId },
              });
            }

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { increment: expected } },
            });

            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                type: 'CREDIT',
                amount: expected,
                reference: 'TOP_UP',
                description: 'Wallet top-up via bKash',
              },
            });
          });

          return Response.redirect(`${walletUrl}?topup=success`);
        } catch (_error) {
          return Response.redirect(`${walletUrl}?topup=error`);
        }
      },
    },
  },
});
