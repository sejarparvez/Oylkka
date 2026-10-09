import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';
import { getShopStatsOrDefault } from '@/lib/shop-stats';

export const Route = createFileRoute('/api/shop/public-single')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const slug = url.searchParams.get('slug');

          if (!slug) {
            return Response.json(
              { error: 'Shop slug is required' },
              { status: 400 },
            );
          }

          const shop = await prisma.shop.findFirst({
            where: { slug, status: 'ACTIVE' },
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              logoUrl: true,
              bannerUrl: true,
              description: true,
              email: true,
              phone: true,
              website: true,
              addressLine1: true,
              addressLine2: true,
              city: true,
              state: true,
              country: true,
              postalCode: true,
              policies: true,
              rating: true,
              totalSales: true,
              totalReviews: true,
              createdAt: true,
              _count: { select: { products: true } },
              products: {
                where: { status: 'PUBLISHED' },
                select: {
                  id: true,
                  productName: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  stock: true,
                  hasVariants: true,
                  images: {
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: { imageUrl: true },
                  },
                  category: {
                    select: { id: true, name: true, slug: true },
                  },
                  _count: { select: { reviews: true } },
                  createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
              },
            },
          });

          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          const reviewAgg = await prisma.review.groupBy({
            by: ['rating'],
            where: { product: { shopId: shop.id } },
            _count: true,
          });

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

          const recentReviews = await prisma.review.findMany({
            where: {
              product: { shopId: shop.id },
              moderationStatus: 'APPROVED',
            },
            select: {
              id: true,
              rating: true,
              title: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, name: true, imageUrl: true } },
              product: { select: { id: true, productName: true, slug: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 6,
          });

          const stats = await getShopStatsOrDefault(shop.id);

          return Response.json(
            {
              ...shop,
              rating: stats.rating,
              totalSales: stats.totalSales,
              totalReviews: stats.totalReviews,
              totalOrders: stats.totalOrders,
              ratingBreakdown,
              recentReviews,
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
