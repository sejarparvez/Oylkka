import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { couponLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

class VoucherSoldOutError extends Error {
  constructor() {
    super('Voucher claim limit reached');
    this.name = 'VoucherSoldOutError';
  }
}

/** Prisma's unique-constraint failure; here it means a concurrent claim won. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export const Route = createFileRoute('/api/vouchers/collect')({
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
          const rateLimitResponse = await checkRateLimit(
            couponLimiter,
            `user:${session.user.id}`,
          );
          if (rateLimitResponse) return rateLimitResponse;

          const body: { couponId: string } = await request.json();

          if (!body.couponId) {
            return Response.json(
              { error: 'Coupon ID is required' },
              { status: 400 },
            );
          }

          const coupon = await prisma.coupon.findUnique({
            where: { id: body.couponId },
          });

          if (!coupon) {
            return Response.json(
              { error: 'Coupon not found' },
              { status: 404 },
            );
          }

          if (!coupon.isActive) {
            return Response.json(
              { error: 'This voucher is no longer active' },
              { status: 400 },
            );
          }

          if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            return Response.json(
              { error: 'This voucher has expired' },
              { status: 400 },
            );
          }

          // A voucher scheduled for a future date is not claimable yet. Nothing
          // checked this, so a campaign could be collected before it starts
          // (MONEY-38).
          if (coupon.startsAt && coupon.startsAt > new Date()) {
            return Response.json(
              {
                error: `This voucher is not active until ${coupon.startsAt.toISOString()}`,
              },
              { status: 400 },
            );
          }

          if (
            coupon.maxClaimCount > 0 &&
            coupon.claimedCount >= coupon.maxClaimCount
          ) {
            return Response.json(
              { error: 'This voucher is sold out' },
              { status: 400 },
            );
          }

          const existing = await prisma.userVoucher.findUnique({
            where: {
              userId_couponId: {
                userId: session.user.id,
                couponId: body.couponId,
              },
            },
          });

          if (existing) {
            return Response.json(
              { error: 'Voucher already collected' },
              { status: 409 },
            );
          }

          try {
            const userVoucher = await prisma.$transaction(async (tx) => {
              // Conditional increment instead of check-then-increment: the
              // `claimedCount < maxClaimCount` predicate is evaluated by the
              // database, so concurrent claims cannot oversell the cap. `0`
              // means unlimited, hence the two branches (MONEY-38).
              if (coupon.maxClaimCount > 0) {
                const { count } = await tx.coupon.updateMany({
                  where: {
                    id: body.couponId,
                    claimedCount: { lt: coupon.maxClaimCount },
                  },
                  data: { claimedCount: { increment: 1 } },
                });

                if (count === 0) {
                  throw new VoucherSoldOutError();
                }
              } else {
                await tx.coupon.update({
                  where: { id: body.couponId },
                  data: { claimedCount: { increment: 1 } },
                });
              }

              return tx.userVoucher.create({
                data: {
                  userId: session.user.id,
                  couponId: body.couponId,
                },
                include: {
                  coupon: {
                    select: {
                      id: true,
                      code: true,
                      description: true,
                      type: true,
                      value: true,
                    },
                  },
                },
              });
            });

            return Response.json(
              { success: true, voucher: userVoucher },
              { status: 200 },
            );
          } catch (error) {
            if (error instanceof VoucherSoldOutError) {
              return Response.json(
                { error: 'This voucher is sold out' },
                { status: 400 },
              );
            }

            // Two concurrent claims by the same user: the unique constraint on
            // (userId, couponId) rejected the loser.
            if (isUniqueViolation(error)) {
              return Response.json(
                { error: 'Voucher already collected' },
                { status: 409 },
              );
            }

            throw error;
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
