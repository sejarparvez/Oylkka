import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/vendor/payouts/schedule')({
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
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const pendingItems = await prisma.orderItem.findMany({
            where: {
              shopId: shop.id,
              fulfillmentStatus: 'DELIVERED',
              payoutItem: null,
              order: {
                paymentStatus: 'PAID',
                NOT: {
                  status: 'REFUNDED',
                },
              },
            },
            select: {
              id: true,
              productName: true,
              vendorAmount: true,
              commissionAmount: true,
              total: true,
              createdAt: true,
              order: { select: { orderNumber: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 1000,
          });

          const monthlyBuckets: Record<
            string,
            {
              month: string;
              items: number;
              totalAmount: number;
              totalCommission: number;
              estimatedDate: string;
            }
          > = {};

          for (const item of pendingItems) {
            const d = new Date(item.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyBuckets[key]) {
              const estimatedDate = new Date(
                d.getFullYear(),
                d.getMonth() + 2,
                15,
              );
              monthlyBuckets[key] = {
                month: key,
                items: 0,
                totalAmount: 0,
                totalCommission: 0,
                estimatedDate: estimatedDate.toISOString().slice(0, 10),
              };
            }

            monthlyBuckets[key].items += 1;
            monthlyBuckets[key].totalAmount += Number(item.vendorAmount);
            monthlyBuckets[key].totalCommission += Number(
              item.commissionAmount,
            );
          }

          const schedule = Object.values(monthlyBuckets).sort((a, b) =>
            a.month.localeCompare(b.month),
          );

          const totalPendingAmount = pendingItems.reduce(
            (sum, i) => sum + Number(i.vendorAmount),
            0,
          );
          const totalPendingCommission = pendingItems.reduce(
            (sum, i) => sum + Number(i.commissionAmount),
            0,
          );
          const pendingItemCount = pendingItems.length;

          const lastPayout = await prisma.payout.findFirst({
            where: { shopId: shop.id, status: 'COMPLETED' },
            orderBy: { processedAt: 'desc' },
          });

          return Response.json({
            schedule,
            summary: {
              pendingItems: pendingItemCount,
              totalPending: totalPendingAmount,
              totalCommission: totalPendingCommission,
              lastPayoutDate: lastPayout?.processedAt || null,
              lastPayoutAmount: Number(lastPayout?.amount || 0),
            },
          });
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
