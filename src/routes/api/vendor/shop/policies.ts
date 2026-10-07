import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { requireActiveVendorShop } from '@/lib/vendor-guard';

export const Route = createFileRoute('/api/vendor/shop/policies')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
            select: { policies: true },
          });

          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          return Response.json({ policies: shop.policies });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const guard = await requireActiveVendorShop(session.user.id);
          if (guard.response) return guard.response;
          const shop = guard.shop;

          const body = await request.json();
          const { shippingPolicy, returnPolicy, termsAndConditions } = body;

          const MAX_LEN = 5000;
          const provided: Record<string, unknown> = {
            shippingPolicy,
            returnPolicy,
            termsAndConditions,
          };
          for (const [key, value] of Object.entries(provided)) {
            if (value !== undefined && typeof value !== 'string') {
              return Response.json(
                { error: `${key} must be a string` },
                { status: 400 },
              );
            }
            if (typeof value === 'string' && value.length > MAX_LEN) {
              return Response.json(
                { error: `${key} must be at most ${MAX_LEN} characters` },
                { status: 400 },
              );
            }
          }

          // Partial update: only replace keys the client sent; everything
          // else in the blob is preserved (LIFE-17).
          const existing =
            (shop.policies as Record<string, string | null> | null) ?? {};
          const policies: Record<string, string | null> = { ...existing };
          if (shippingPolicy !== undefined)
            policies.shippingPolicy = shippingPolicy;
          if (returnPolicy !== undefined) policies.returnPolicy = returnPolicy;
          if (termsAndConditions !== undefined)
            policies.termsAndConditions = termsAndConditions;

          const updated = await prisma.shop.update({
            where: { id: shop.id },
            data: { policies },
          });

          return Response.json({ policies: updated.policies });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
