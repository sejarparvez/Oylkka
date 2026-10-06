import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

/**
 * `WishlistItem` is unique on `(userId, productId)` — the wishlist is
 * per-product, not per-variant. The duplicate lookup below must therefore omit
 * `variantId`, otherwise checking a second variant of an already-saved product
 * finds nothing and the insert then violates the constraint (MONEY-35).
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export const Route = createFileRoute('/api/wishlist/add')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const { productId, variantId } = body;

          if (!productId) {
            return Response.json(
              { error: 'Product ID is required' },
              { status: 400 },
            );
          }

          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
          });

          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          const existing = await prisma.wishlistItem.findUnique({
            where: { userId_productId: { userId: session.user.id, productId } },
          });

          if (existing) {
            return Response.json(
              { message: 'Already in wishlist' },
              { status: 200 },
            );
          }

          const item = await prisma.wishlistItem.create({
            data: {
              userId: session.user.id,
              productId,
              variantId: variantId ?? null,
            },
          });

          return Response.json({ item }, { status: 201 });
        } catch (error) {
          // The constraint is on (userId, productId), so the wishlist is
          // per-product. Two concurrent adds race on it and the loser gets
          // P2002 — report the already-exists outcome rather than a 500
          // (MONEY-35).
          if (isUniqueViolation(error)) {
            return Response.json(
              { message: 'Already in wishlist' },
              { status: 200 },
            );
          }

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
