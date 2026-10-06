import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/admin/payouts/pending')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;

          // Aggregate in a single grouped query instead of an N+1 loop
          // (MONEY-53), and expose truncation so caps are visible.
          const url = new URL(request.url);
          const limit = Math.min(
            Math.max(Number(url.searchParams.get('limit')) || 100, 1),
            500,
          );

          const [grouped, counted] = await Promise.all([
            prisma.orderItem.groupBy({
              by: ['shopId'],
              where: {
                fulfillmentStatus: 'DELIVERED',
                payoutItem: null,
              },
              _count: { _all: true },
              _sum: { vendorAmount: true },
              orderBy: { shopId: 'asc' },
              take: limit + 1,
            }),
            prisma.orderItem.groupBy({
              by: ['shopId'],
              where: {
                fulfillmentStatus: 'DELIVERED',
                payoutItem: null,
              },
            }),
          ]);

          const shopIds = grouped.map((g) => g.shopId);
          const shops = await prisma.shop.findMany({
            where: { id: { in: shopIds } },
            select: { id: true, name: true, commissionRate: true },
          });
          const byId = new Map(shops.map((s) => [s.id, s]));

          const result = grouped.map((g) => ({
            shopId: g.shopId,
            shopName: byId.get(g.shopId)?.name ?? 'Unknown shop',
            commissionRate: byId.get(g.shopId)?.commissionRate ?? 0,
            pendingItems: g._count._all,
            totalAmount: Number(g._sum.vendorAmount ?? 0),
          }));

          return Response.json({
            shops: result.slice(0, limit),
            totalShops: counted.length,
            truncated: grouped.length > limit,
          });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to get pending',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
