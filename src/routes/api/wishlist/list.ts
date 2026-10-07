import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Pagination is opt-in: without `page`+`pageSize` the full list is returned so
// existing callers (membership checks, dashboard counts) stay correct (CUST-12).
export const Route = createFileRoute('/api/wishlist/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const url = new URL(request.url);
          const pageParam = Number(url.searchParams.get('page'));
          const pageSizeParam = Number(url.searchParams.get('pageSize'));
          const page =
            Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
          const pageSize =
            Number.isInteger(pageSizeParam) && pageSizeParam > 0
              ? pageSizeParam
              : null;

          const where = { userId: session.user.id };

          const [items, total] = await Promise.all([
            prisma.wishlistItem.findMany({
              where,
              include: {
                product: {
                  select: {
                    id: true,
                    productName: true,
                    slug: true,
                    price: true,
                    discountPrice: true,
                    stock: true,
                    images: {
                      take: 1,
                      orderBy: { order: 'asc' },
                      select: { imageUrl: true },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    discountPrice: true,
                    stock: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              ...(pageSize !== null
                ? { skip: (page - 1) * pageSize, take: pageSize }
                : {}),
            }),
            prisma.wishlistItem.count({ where }),
          ]);

          return Response.json(
            {
              items,
              total,
              page: pageSize !== null ? page : 1,
              pageSize: pageSize !== null ? pageSize : total,
              totalPages:
                pageSize !== null
                  ? Math.max(1, Math.ceil(total / pageSize))
                  : 1,
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
