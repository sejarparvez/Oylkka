import { createFileRoute } from '@tanstack/react-router';
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
              where: { productId },
              select: {
                id: true,
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
            prisma.review.count({ where: { productId } }),
            prisma.review.groupBy({
              by: ['rating'],
              where: { productId },
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

          return Response.json(
            {
              reviews,
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
