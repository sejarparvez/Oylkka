import { createFileRoute } from '@tanstack/react-router';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/shop/admin-list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const url = new URL(request.url);
          const status = url.searchParams.get('status');
          const search = url.searchParams.get('search');

          const where: Record<string, unknown> = {};

          if (
            status &&
            ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(status)
          ) {
            where.status = status;
          }

          if (search) {
            where.OR = [
              { name: { contains: search, mode: 'insensitive' } },
              {
                owner: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            ];
          }

          const shops = await prisma.shop.findMany({
            where,
            include: {
              owner: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
          });

          return Response.json(shops, { status: 200 });
        } catch {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
