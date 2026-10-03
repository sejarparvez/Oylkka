import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/public-compare')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const idsParam = url.searchParams.get('ids');
          if (!idsParam) {
            return Response.json({ products: [] }, { status: 200 });
          }
          const ids = idsParam.split(',').filter(Boolean);

          const products = await prisma.product.findMany({
            where: {
              id: { in: ids },
              status: 'PUBLISHED',
              shop: { status: { in: ['APPROVED', 'ACTIVE'] } },
            },
            select: {
              id: true,
              productName: true,
              slug: true,
              description: true,
              price: true,
              discountPrice: true,
              stock: true,
              hasVariants: true,
              sku: true,
              brand: true,
              condition: true,
              freeShipping: true,
              tags: true,
              images: {
                orderBy: { order: 'asc' },
                take: 1,
                select: { imageUrl: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
              shop: {
                select: { id: true, name: true, slug: true },
              },
              _count: { select: { reviews: true } },
              createdAt: true,
            },
          });

          const productsWithDiscount = products.map((p) => ({
            ...p,
            discountPercent: p.discountPrice
              ? Math.round(
                  ((Number(p.price) - Number(p.discountPrice)) /
                    Number(p.price)) *
                    100,
                )
              : null,
          }));

          return Response.json(
            { products: productsWithDiscount },
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
