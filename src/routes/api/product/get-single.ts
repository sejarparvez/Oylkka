import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/product/get-single')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;

          const id = new URL(request.url).searchParams.get('id');

          if (!id) {
            return Response.json(
              { error: 'Product ID is required' },
              { status: 400 },
            );
          }

          const product = await prisma.product.findUnique({
            where: { id },
            include: {
              category: { select: { id: true, name: true } },
              images: { orderBy: { order: 'asc' } },
              _count: { select: { reviews: true, orderItems: true } },
              // FE-45: hydrate the vendor edit form with the product's existing
              // attribute options/values and their canonical global mappings,
              // so `reset()` does not silently drop them.
              attributeOptions: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  attributeValues: { orderBy: { displayOrder: 'asc' } },
                },
              },
              globalAttributeValues: {
                include: {
                  globalAttribute: { select: { id: true, name: true } },
                  globalValue: { select: { id: true, value: true } },
                },
              },
            },
          });

          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop || product.shopId !== shop.id) {
            if (
              session.user.role !== 'ADMIN' &&
              session.user.role !== 'MANAGER'
            ) {
              return Response.json({ error: 'Forbidden' }, { status: 403 });
            }
          }

          return Response.json(product, { status: 200 });
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
