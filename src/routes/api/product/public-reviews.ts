import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/public-reviews')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const productId = url.searchParams.get('productId');
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
          const limit = Math.min(
            20,
            Math.max(1, Number(url.searchParams.get('limit')) || 10),
          );

          if (!productId) {
            return Response.json(
              { error: 'productId is required' },
              { status: 400 },
            );
          }

          const [reviews, total, reviewAgg] = await Promise.all([
            prisma.review.findMany({
              where: { productId, moderationStatus: 'APPROVED' },
              select: {
                id: true,
                productId: true,
                rating: true,
                title: true,
                content: true,
                verified: true,
                helpfulCount: true,
                vendorReply: true,
                vendorRepliedAt: true,
                createdAt: true,
                user: {
                  select: { id: true, name: true, imageUrl: true },
                },
                images: {
                  orderBy: { order: 'asc' },
                  select: { id: true, imageUrl: true, order: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.review.count({
              where: { productId, moderationStatus: 'APPROVED' },
            }),
            prisma.review.groupBy({
              by: ['rating'],
              where: { productId, moderationStatus: 'APPROVED' },
              _count: true,
            }),
          ]);

          const ratingBreakdown: Record<number, number> = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          };
          for (const r of reviewAgg) {
            ratingBreakdown[r.rating] = r._count;
          }

          // CUST-21: let the signed-in viewer see whether they already voted.
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          let votedIds = new Set<string>();
          if (session?.user && reviews.length > 0) {
            const votes = await prisma.reviewHelpfulVote.findMany({
              where: {
                userId: session.user.id,
                reviewId: { in: reviews.map((r) => r.id) },
              },
              select: { reviewId: true },
            });
            votedIds = new Set(votes.map((v) => v.reviewId));
          }

          return Response.json(
            {
              reviews: reviews.map((review) => ({
                ...review,
                viewerVoted: votedIds.has(review.id),
              })),
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
              ratingBreakdown,
            },
            { status: 200 },
          );
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
