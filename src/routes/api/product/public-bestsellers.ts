import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/public-bestsellers')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Math.min(
            48,
            Math.max(1, Number(url.searchParams.get('limit')) || 20),
          );

          // Rank products by units sold across the single "paid" population
          // used by the rest of the analytics surface (DATA-02/03/09):
          // paid orders that have not been refunded, excluding cancelled or
          // refunded line items.
          const grouped = await prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
              order: { paymentStatus: 'PAID', status: { not: 'REFUNDED' } },
              fulfillmentStatus: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 120,
          });

          const orderedIds = grouped.map((row) => row.productId);
          if (orderedIds.length === 0) {
            return Response.json({ products: [] }, { status: 200 });
          }

          const products = await prisma.product.findMany({
            where: {
              id: { in: orderedIds },
              status: 'PUBLISHED',
              shop: { status: 'ACTIVE' },
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
              category: { select: { id: true, name: true, slug: true } },
              shop: { select: { id: true, name: true, slug: true } },
              _count: { select: { reviews: true } },
              createdAt: true,
            },
          });

          const rank = new Map(orderedIds.map((id, index) => [id, index]));
          const sorted = products
            .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
            .slice(0, limit);

          return Response.json({ products: sorted }, { status: 200 });
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
