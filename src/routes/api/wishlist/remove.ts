import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/wishlist/remove')({
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
          const { productId } = body;

          if (!productId) {
            return Response.json(
              { error: 'Product ID is required' },
              { status: 400 },
            );
          }

          // The wishlist is per-product (`@@unique([userId, productId])`), so
          // `variantId` must not be part of the filter — scoping by it meant
          // removing a variant other than the stored one silently deleted
          // nothing and the item reappeared in the UI (MONEY-35).
          await prisma.wishlistItem.deleteMany({
            where: {
              userId: session.user.id,
              productId,
            },
          });

          return Response.json(
            { message: 'Removed from wishlist' },
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
