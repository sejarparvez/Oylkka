import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/public-list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sort = url.searchParams.get('sort') || 'newest';
          const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
          const limit = Math.min(
            50,
            Math.max(1, Number(url.searchParams.get('limit')) || 20),
          );
          const categorySlug = url.searchParams.get('category') || undefined;
          const hasDiscount = url.searchParams.get('hasDiscount') === 'true';
          const search = url.searchParams.get('search')?.trim() || undefined;

          // Parse global attribute filters (e.g. globalAttr.color=red&globalAttr.size=s)
          const globalAttrFilters: Array<{
            attrSlug: string;
            valueSlug: string;
          }> = [];
          for (const [key, value] of url.searchParams.entries()) {
            if (key.startsWith('globalAttr.')) {
              const attrSlug = key.slice('globalAttr.'.length);
              if (attrSlug && value) {
                globalAttrFilters.push({ attrSlug, valueSlug: value });
              }
            }
          }

          let categoryId: string | undefined;
          if (categorySlug) {
            const category = await prisma.category.findUnique({
              where: { slug: categorySlug },
              select: { id: true },
            });
            if (category) categoryId = category.id;
          }

          const orderBy:
            | { createdAt: 'desc' }
            | { price: 'asc' }
            | { price: 'desc' } =
            sort === 'price_asc'
              ? { price: 'asc' }
              : sort === 'price_desc'
                ? { price: 'desc' }
                : { createdAt: 'desc' };

          const searchFilter = search
            ? {
                OR: [
                  {
                    productName: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                  { brand: { contains: search, mode: 'insensitive' as const } },
                  { tags: { has: search } },
                ],
              }
            : {};

          // Resolve global attribute filters to matching product IDs
          let globalAttributeProductIds: string[] | null = null;
          if (globalAttrFilters.length > 0) {
            for (const filter of globalAttrFilters) {
              const matchingIds = await prisma.productGlobalAttributeValue
                .findMany({
                  where: {
                    globalAttribute: { slug: filter.attrSlug },
                    globalValue: { slug: filter.valueSlug },
                  },
                  select: { productId: true },
                })
                .then((rows) => rows.map((r) => r.productId));

              if (globalAttributeProductIds === null) {
                globalAttributeProductIds = matchingIds;
              } else {
                // Intersect — all filters must match (AND logic)
                const intersection = new Set(matchingIds);
                globalAttributeProductIds = globalAttributeProductIds.filter(
                  (id) => intersection.has(id),
                );
              }

              // Short-circuit if no matches at any stage
              if (globalAttributeProductIds.length === 0) break;
            }
          }

          const where: Record<string, unknown> = {
            status: 'PUBLISHED' as const,
            shop: { status: { in: ['APPROVED', 'ACTIVE'] } },
            ...(categoryId ? { categoryId } : {}),
            ...(hasDiscount ? { discountPrice: { not: null } } : {}),
            ...searchFilter,
          };

          // Apply global attribute product ID filter
          if (globalAttributeProductIds !== null) {
            if (globalAttributeProductIds.length > 0) {
              where.id = { in: globalAttributeProductIds };
            } else {
              // No products match all global attribute filters
              where.id = { in: [] };
            }
          }

          const [products, total] = await Promise.all([
            prisma.product.findMany({
              where,
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
              orderBy,
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.product.count({ where }),
          ]);

          return Response.json(
            {
              products,
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
