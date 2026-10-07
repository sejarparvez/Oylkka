import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

// Live product data for the recently-viewed page (CUST-16): the client only
// stores product references, so prices/stock always come from here.
export const Route = createFileRoute('/api/product/public-recent')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const ids = (url.searchParams.get('ids') || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 20);

          if (ids.length === 0) {
            return Response.json({ products: [] }, { status: 200 });
          }

          const products = await prisma.product.findMany({
            where: {
              id: { in: ids },
              status: 'PUBLISHED',
              shop: { status: 'ACTIVE' },
            },
            select: {
              id: true,
              slug: true,
              productName: true,
              price: true,
              discountPrice: true,
              stock: true,
              images: {
                take: 1,
                orderBy: { order: 'asc' },
                select: { imageUrl: true },
              },
            },
          });

          // Preserve the client's recency ordering.
          const byId = new Map(products.map((p) => [p.id, p]));
          const ordered = ids
            .map((id) => byId.get(id))
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({
              id: p.id,
              slug: p.slug,
              productName: p.productName,
              price: Number(p.price),
              discountPrice:
                p.discountPrice != null ? Number(p.discountPrice) : null,
              stock: p.stock,
              image: p.images[0]?.imageUrl ?? null,
            }));

          return Response.json({ products: ordered }, { status: 200 });
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
