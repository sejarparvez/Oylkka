import { createFileRoute } from '@tanstack/react-router';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/db';
import { lastNDayKeys } from '@/lib/timezone';

const DAY_MS = 24 * 60 * 60 * 1000;

export const Route = createFileRoute('/api/admin/dashboard/stats')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          // Query window for the chart: 30 days back (floored by a small
          // margin so the earliest Dhaka bucket is fully covered).
          const thirtyDaysAgo = new Date(Date.now() - 31 * DAY_MS);

          const [
            revenueAgg,
            totalOrders,
            pendingOrders,
            processingOrders,
            totalProducts,
            totalUsers,
            totalVendors,
            dailyRevenue,
            recentOrders,
          ] = await Promise.all([
            prisma.order.aggregate({
              where: {
                paymentStatus: 'PAID',
                NOT: { status: 'REFUNDED' },
              },
              _sum: { total: true, refundAmount: true },
            }),
            prisma.order.count({
              where: {
                paymentStatus: 'PAID',
                NOT: { status: 'REFUNDED' },
              },
            }),
            prisma.order.count({ where: { status: 'PENDING' } }),
            prisma.order.count({ where: { status: 'PROCESSING' } }),
            prisma.product.count(),
            prisma.user.count(),
            prisma.shop.count({ where: { status: 'ACTIVE' } }),
            // Aggregate per Dhaka day in the database (DATA-06/DATA-08): a
            // Prisma `groupBy` on `paidAt` returns one row per distinct
            // timestamp, not a daily bucket, and attributes revenue to
            // creation time rather than payment time.
            prisma.$queryRaw<{ day: string; amount: number }[]>`
              SELECT to_char(
                       date_trunc(
                         'day',
                         o."paidAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka'
                       ),
                       'YYYY-MM-DD'
                     ) AS day,
                     COALESCE(SUM(o."total"), 0)::float8 AS amount
              FROM "order" o
              WHERE o."paymentStatus" = 'PAID'
                AND o."status" <> 'REFUNDED'
                AND o."paidAt" >= ${thirtyDaysAgo}
              GROUP BY 1
            `,
            prisma.order.findMany({
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: {
                customer: { select: { name: true, email: true } },
              },
            }),
          ]);

          // Key buckets in Asia/Dhaka (DATA-06); the previous implementation
          // used local-midnight bounds but UTC `toISOString()` keys, shifting
          // every bucket by a day and adding a future bucket.
          const revenueByDay: Record<string, number> = {};
          for (const key of lastNDayKeys(30)) {
            revenueByDay[key] = 0;
          }
          for (const r of dailyRevenue) {
            if (revenueByDay[r.day] !== undefined) {
              revenueByDay[r.day] += Number(r.amount);
            }
          }
          const chartData = Object.entries(revenueByDay).map(
            ([date, amount]) => ({
              date,
              amount,
            }),
          );

          return Response.json({
            stats: {
              revenue: Math.max(
                Number(revenueAgg._sum.total ?? 0) -
                  Number(revenueAgg._sum.refundAmount ?? 0),
                0,
              ),
              orders: totalOrders,
              pendingOrders,
              processingOrders,
              products: totalProducts,
              users: totalUsers,
              vendors: totalVendors,
            },
            dailyRevenue: chartData,
            recentOrders: recentOrders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              customerName: o.customer.name,
              total: Number(o.total),
              status: o.status,
              createdAt: o.createdAt,
            })),
          });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to load dashboard stats',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
