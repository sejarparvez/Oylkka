import { createFileRoute } from '@tanstack/react-router';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export const Route = createFileRoute(
  '/api/admin/global-attributes/product-mappings',
)({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const url = new URL(request.url);
          const productId = url.searchParams.get('productId');
          const attributeId = url.searchParams.get('attributeId');

          if (!productId && !attributeId) {
            return Response.json(
              {
                error: 'productId or attributeId query parameter is required',
              },
              { status: 400 },
            );
          }

          // Attribute-scoped listing: every product value mapped to this global
          // attribute. Powers the admin "Product Mappings" tab (DEAD-03).
          if (attributeId && !productId) {
            const mappings = await prisma.productGlobalAttributeValue.findMany({
              where: { globalAttributeId: attributeId },
              include: {
                product: {
                  select: { id: true, productName: true, slug: true },
                },
                globalAttribute: {
                  select: { id: true, name: true, slug: true },
                },
                globalValue: {
                  select: { id: true, value: true, slug: true, metadata: true },
                },
              },
              orderBy: { productId: 'asc' },
            });

            // `localValueId` has no Prisma relation, so resolve the local values
            // in one follow-up query and join in memory.
            const localValueIds = [
              ...new Set(mappings.map((m) => m.localValueId)),
            ];
            const localValues =
              localValueIds.length > 0
                ? await prisma.productAttributeValue.findMany({
                    where: { id: { in: localValueIds } },
                    select: {
                      id: true,
                      value: true,
                      option: { select: { id: true, name: true } },
                    },
                  })
                : [];
            const localValueMap = new Map(localValues.map((v) => [v.id, v]));

            return Response.json({
              mappings: mappings.map((m) => ({
                ...m,
                localValue: localValueMap.get(m.localValueId) ?? null,
              })),
            });
          }

          if (!productId) {
            return Response.json(
              { error: 'productId query parameter is required' },
              { status: 400 },
            );
          }

          const mappings = await prisma.productGlobalAttributeValue.findMany({
            where: { productId },
            include: {
              globalAttribute: {
                select: { id: true, name: true, slug: true },
              },
              globalValue: {
                select: { id: true, value: true, slug: true, metadata: true },
              },
            },
          });

          // Also fetch the product's local attribute values to show what can be mapped
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
              id: true,
              productName: true,
              attributeOptions: {
                select: {
                  id: true,
                  name: true,
                  attributeValues: {
                    select: {
                      id: true,
                      value: true,
                      slug: true,
                    },
                    orderBy: { displayOrder: 'asc' },
                  },
                },
                orderBy: { displayOrder: 'asc' },
              },
            },
          });

          return Response.json({
            mappings,
            product,
          });
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
