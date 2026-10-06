import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/cart/update')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const { itemId, quantity } = body;

          if (!itemId || !Number.isInteger(quantity) || quantity < 1) {
            return Response.json(
              { error: 'Item ID and valid quantity are required' },
              { status: 400 },
            );
          }

          const item = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: {
              cart: { select: { userId: true } },
              product: { select: { stock: true } },
              variant: { select: { stock: true, reservedStock: true } },
            },
          });

          if (!item) {
            return Response.json(
              { error: 'Cart item not found' },
              { status: 404 },
            );
          }

          if (item.cart.userId !== session.user.id) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
          }

          // Availability must exclude units held by an in-flight bKash
          // checkout. Checking raw variant.stock let a line be set above what
          // is actually purchasable (MONEY-36). A variantId pointing at a
          // deleted variant has no stock to offer.
          const maxStock = item.variantId
            ? item.variant
              ? item.variant.stock - item.variant.reservedStock
              : 0
            : item.product.stock;

          if (maxStock < 1) {
            return Response.json(
              { error: 'Item is out of stock' },
              { status: 400 },
            );
          }

          if (quantity > maxStock) {
            return Response.json(
              { error: `Only ${maxStock} items available` },
              { status: 400 },
            );
          }

          await prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
          });

          return Response.json(
            { message: 'Cart updated successfully' },
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
