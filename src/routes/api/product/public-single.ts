import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';
import { getShopStatsOrDefault } from '@/lib/shop-stats';

export const Route = createFileRoute('/api/product/public-single')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const slug = url.searchParams.get('slug');

          if (!slug) {
            return Response.json(
              { error: 'Product slug is required' },
              { status: 400 },
            );
          }

          const product = await prisma.product.findFirst({
            where: {
              slug,
              status: 'PUBLISHED',
              shop: { status: 'ACTIVE' },
            },
            include: {
              category: { select: { id: true, name: true, slug: true } },
              images: { orderBy: { order: 'asc' } },
              variants: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  discountPrice: true,
                  stock: true,
                  attributes: true,
                  imageUrl: true,
                  variantImages: {
                    select: {
                      id: true,
                      imageUrl: true,
                      imagePublicId: true,
                      altText: true,
                      order: true,
                    },
                    orderBy: { order: 'asc' },
                  },
                  attributeValues: {
                    select: {
                      attributeValue: {
                        select: {
                          id: true,
                          value: true,
                          slug: true,
                          optionId: true,
                          imageUrl: true,
                          imagePublicId: true,
                        },
                      },
                    },
                  },
                },
              },
              attributeOptions: {
                select: {
                  id: true,
                  name: true,
                  values: true,
                  isVariantDefining: true,
                  displayOrder: true,
                  attributeValues: {
                    select: {
                      id: true,
                      value: true,
                      slug: true,
                      displayOrder: true,
                      imageUrl: true,
                      imagePublicId: true,
                      metadata: true,
                    },
                    orderBy: { displayOrder: 'asc' },
                  },
                },
                orderBy: { displayOrder: 'asc' },
              },
              shop: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  status: true,
                  logoUrl: true,
                  rating: true,
                  totalReviews: true,
                  totalSales: true,
                  createdAt: true,
                },
              },
              _count: { select: { reviews: true } },
            },
          });

          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          const reviewAgg = await prisma.review.groupBy({
            by: ['rating'],
            where: { productId: product.id },
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

          const discountPercent = product.discountPrice
            ? Math.round(
                ((Number(product.price) - Number(product.discountPrice)) /
                  Number(product.price)) *
                  100,
              )
            : null;

          // Shop aggregates are never persisted (DATA-01); derive live.
          const shop = product.shop
            ? {
                ...product.shop,
                ...(await getShopStatsOrDefault(product.shop.id)),
              }
            : null;

          return Response.json(
            { ...product, shop, discountPercent, ratingBreakdown },
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
