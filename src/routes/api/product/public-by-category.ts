import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/public-by-category')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const slug = url.searchParams.get('slug');

          if (!slug) {
            return Response.json(
              { error: 'Category slug is required' },
              { status: 400 },
            );
          }

          const category = await prisma.category.findUnique({
            where: { slug },
            select: { id: true, name: true, slug: true },
          });

          if (!category) {
            return Response.json(
              { error: 'Category not found' },
              { status: 404 },
            );
          }

          const products = await prisma.product.findMany({
            where: {
              categoryId: category.id,
              status: 'PUBLISHED',
              shop: { status: { in: ['APPROVED', 'ACTIVE'] } },
            },
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
              shop: {
                select: { id: true, name: true, slug: true },
              },
              _count: { select: { reviews: true } },
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          });

          return Response.json(products, { status: 200 });
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
