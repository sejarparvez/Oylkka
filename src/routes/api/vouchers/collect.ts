import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { couponLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

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

          const userVoucher = await prisma.$transaction(async (tx) => {
            await tx.coupon.update({
              where: { id: body.couponId },
              data: { claimedCount: { increment: 1 } },
            });

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
