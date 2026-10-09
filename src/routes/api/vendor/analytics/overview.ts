import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import type { Prisma } from '@/generated/prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { lastNMonthKeys } from '@/lib/timezone';

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const Route = createFileRoute('/api/vendor/analytics/overview')({
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

          const twelveMonthsAgo = monthsAgo(12);

          const basePaidWhere: Prisma.OrderItemWhereInput = {
            shopId: shop.id,
            order: {
              paymentStatus: 'PAID',
              NOT: {
                status: 'REFUNDED',
              },
            },
            fulfillmentStatus: { notIn: ['CANCELLED', 'REFUNDED'] },
          };

          const [
            revenueAgg,
            orderStats,
            pendingOrders,
            monthlyRevenue,
            recentOrders,
            topProducts,
            unitsSoldAgg,
          ] = await Promise.all([
            prisma.orderItem.aggregate({
              where: basePaidWhere,
              _sum: { vendorAmount: true, commissionAmount: true },
            }),
            prisma.orderItem.groupBy({
              by: ['fulfillmentStatus'],
              where: basePaidWhere,
              _count: true,
            }),
            prisma.orderItem.count({
              where: {
                ...basePaidWhere,
                fulfillmentStatus: 'PENDING',
              },
            }),
            // Aggregate per Dhaka month in the database (DATA-05) instead of
            // loading 12 months of order items into memory.
            prisma.$queryRaw<{ month: string; amount: number }[]>`
              SELECT to_char(
                       date_trunc(
                         'month',
                         oi."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Dhaka'
                       ),
                       'YYYY-MM'
                     ) AS month,
                     COALESCE(SUM(oi."vendorAmount"), 0)::float8 AS amount
              FROM "order_item" oi
              JOIN "order" o ON o.id = oi."orderId"
              WHERE oi."shopId" = ${shop.id}
                AND oi."fulfillmentStatus" NOT IN ('CANCELLED', 'REFUNDED')
                AND o."paymentStatus" = 'PAID'
                AND o."status" <> 'REFUNDED'
                AND oi."createdAt" >= ${twelveMonthsAgo}
              GROUP BY 1
            `,
            prisma.orderItem.findMany({
              where: {
                shopId: shop.id,
                order: {
                  paymentStatus: 'PAID' as const,
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                id: true,
                productName: true,
                quantity: true,
                total: true,
                fulfillmentStatus: true,
                createdAt: true,
                order: { select: { orderNumber: true } },
              },
            }),
            prisma.orderItem.groupBy({
              by: ['productId'],
              where: basePaidWhere,
              _sum: { quantity: true, vendorAmount: true },
              orderBy: { _sum: { vendorAmount: 'desc' } },
              take: 5,
            }),
            prisma.orderItem.aggregate({
              where: basePaidWhere,
              _sum: { quantity: true },
            }),
          ]);

          // Bucket by Asia/Dhaka, not server-local time (DATA-04).
          const monthlyMap: Record<string, number> = {};
          for (const key of lastNMonthKeys(12)) {
            monthlyMap[key] = 0;
          }
          for (const item of monthlyRevenue) {
            const key = item.month;
            if (monthlyMap[key] !== undefined) {
              monthlyMap[key] += Number(item.amount);
            }
          }
          const chartData = Object.entries(monthlyMap).map(
            ([month, amount]) => ({
              month,
              amount,
            }),
          );

          const totalOrders = orderStats.reduce((sum, s) => sum + s._count, 0);
          const fulfilledOrders =
            orderStats.find((s) => s.fulfillmentStatus === 'DELIVERED')
              ?._count || 0;

          return Response.json({
            stats: {
              revenue: Number(revenueAgg._sum.vendorAmount ?? 0),
              commission: Number(revenueAgg._sum.commissionAmount ?? 0),
              totalOrders,
              fulfilledOrders,
              pendingOrders,
              // Units sold, computed live (DATA-01); `shop.totalSales` is
              // never written by any code path.
              products: unitsSoldAgg._sum.quantity ?? 0,
            },
            monthlyRevenue: chartData,
            recentOrders: recentOrders.map((o) => ({
              id: o.id,
              orderNumber: o.order.orderNumber,
              productName: o.productName,
              quantity: o.quantity,
              total: Number(o.total),
              status: o.fulfillmentStatus,
              createdAt: o.createdAt,
            })),
            topProducts: await Promise.all(
              topProducts.map(async (p) => {
                const product = await prisma.product.findUnique({
                  where: { id: p.productId },
                  select: { productName: true },
                });
                return {
                  name: product?.productName ?? 'Product',
                  quantity: p._sum.quantity ?? 0,
                  revenue: Number(p._sum.vendorAmount ?? 0),
                };
              }),
            ),
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
