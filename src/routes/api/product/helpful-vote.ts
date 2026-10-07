import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { reviewLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

// CUST-21: toggle the "helpful" vote on a review. One vote per user per
// review; the denormalised `helpfulCount` is kept in sync in the same
// transaction.
export const Route = createFileRoute('/api/product/helpful-vote')({
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
          const rateLimitResponse = await checkRateLimit(reviewLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const body = await request.json();
          const reviewId =
            typeof body?.reviewId === 'string' ? body.reviewId : '';
          if (!reviewId) {
            return Response.json(
              { error: 'reviewId is required' },
              { status: 400 },
            );
          }

          const review = await prisma.review.findFirst({
            where: { id: reviewId, moderationStatus: 'APPROVED' },
            select: { id: true },
          });
          if (!review) {
            return Response.json(
              { error: 'Review not found' },
              { status: 404 },
            );
          }

          const userId = session.user.id;
          const existing = await prisma.reviewHelpfulVote.findUnique({
            where: { reviewId_userId: { reviewId, userId } },
            select: { id: true },
          });

          const result = await prisma.$transaction(async (tx) => {
            if (existing) {
              await tx.reviewHelpfulVote.delete({
                where: { id: existing.id },
              });
              const updated = await tx.review.update({
                where: { id: reviewId },
                data: { helpfulCount: { decrement: 1 } },
                select: { helpfulCount: true },
              });
              return {
                helpfulCount: Math.max(0, updated.helpfulCount),
                voted: false,
              };
            }

            await tx.reviewHelpfulVote.create({
              data: { reviewId, userId },
            });
            const updated = await tx.review.update({
              where: { id: reviewId },
              data: { helpfulCount: { increment: 1 } },
              select: { helpfulCount: true },
            });
            return { helpfulCount: updated.helpfulCount, voted: true };
          });

          return Response.json(result, { status: 200 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
