import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/shop/follow/toggle')({
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
          const { shopId } = await request.json();
          if (!shopId) {
            return Response.json({ error: 'shopId required' }, { status: 400 });
          }

          const existing = await prisma.shopFollow.findUnique({
            where: { userId_shopId: { userId: session.user.id, shopId } },
          });

          if (existing) {
            await prisma.shopFollow.delete({ where: { id: existing.id } });
            return Response.json({ following: false });
          }

          await prisma.shopFollow.create({
            data: { userId: session.user.id, shopId },
          });
          return Response.json({ following: true });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 },
          );
        }
      },
    },
  },
});
