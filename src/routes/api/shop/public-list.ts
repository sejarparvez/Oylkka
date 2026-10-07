import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/shop/public-list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
          const limit = Math.min(
            20,
            Math.max(1, Number(url.searchParams.get('limit')) || 12),
          );
          const search = url.searchParams.get('search') || '';

          const where: Record<string, unknown> = {
            status: 'ACTIVE',
          };
          if (search) {
            where.name = { contains: search, mode: 'insensitive' };
          }

          const [shops, total] = await Promise.all([
            prisma.shop.findMany({
              where,
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                logoUrl: true,
                description: true,
                bannerUrl: true,
                rating: true,
                totalSales: true,
                totalReviews: true,
                city: true,
                country: true,
                createdAt: true,
                _count: { select: { products: true } },
              },
              orderBy: { rating: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.shop.count({ where }),
          ]);

          return Response.json(
            {
              shops,
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
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
