import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';
import { getShopStats } from '@/lib/shop-stats';

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
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.shop.count({ where }),
          ]);

          // Shop rating/totalSales/totalReviews are never persisted (DATA-01),
          // so derive them live and sort the page by real rating.
          const stats = await getShopStats(shops.map((s) => s.id));
          const withStats = shops
            .map((s) => ({
              ...s,
              rating: stats.get(s.id)?.rating ?? 0,
              totalSales: stats.get(s.id)?.totalSales ?? 0,
              totalReviews: stats.get(s.id)?.totalReviews ?? 0,
              totalOrders: stats.get(s.id)?.totalOrders ?? 0,
            }))
            .sort(
              (a, b) => b.rating - a.rating || b.totalReviews - a.totalReviews,
            );

          return Response.json(
            {
              shops: withStats,
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
