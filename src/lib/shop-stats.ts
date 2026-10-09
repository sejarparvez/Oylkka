import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';

export type ShopStats = {
  rating: number;
  totalReviews: number;
  totalSales: number;
  totalOrders: number;
};

const EMPTY: ShopStats = {
  rating: 0,
  totalReviews: 0,
  totalSales: 0,
  totalOrders: 0,
};

/**
 * Compute live shop aggregates on read (DATA-01).
 *
 * `Shop.rating`, `Shop.totalReviews`, `Shop.totalSales` and `Shop.totalOrders`
 * are declared in the schema but never written by any code path, so reading
 * them yields permanent zeros. Rather than maintain denormalised counters
 * (high drift risk), the public endpoints derive them from the source tables.
 */
export async function getShopStats(
  shopIds: string[],
): Promise<Map<string, ShopStats>> {
  const result = new Map<string, ShopStats>();
  if (shopIds.length === 0) return result;

  for (const id of shopIds) result.set(id, { ...EMPTY });

  const [products, reviewAgg, salesAgg, orderCounts] = await Promise.all([
    prisma.product.findMany({
      where: { shopId: { in: shopIds } },
      select: { id: true, shopId: true },
    }),
    prisma.review.groupBy({
      by: ['productId'],
      where: {
        product: { shopId: { in: shopIds } },
        moderationStatus: 'APPROVED',
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ['shopId'],
      where: {
        shopId: { in: shopIds },
        fulfillmentStatus: { notIn: ['CANCELLED', 'REFUNDED'] },
        order: {
          paymentStatus: 'PAID',
          NOT: { status: 'REFUNDED' },
        },
      },
      _sum: { quantity: true },
    }),
    // Distinct paid orders per shop. `COUNT(DISTINCT ...)` is not expressible
    // through Prisma's `groupBy`, so use a bounded aggregate query.
    prisma.$queryRaw<{ shopId: string; count: bigint }[]>`
      SELECT oi."shopId" AS "shopId", COUNT(DISTINCT oi."orderId") AS count
      FROM "order_item" oi
      JOIN "order" o ON o.id = oi."orderId"
      WHERE oi."shopId" IN (${Prisma.join(shopIds)})
        AND oi."fulfillmentStatus" NOT IN ('CANCELLED', 'REFUNDED')
        AND o."paymentStatus" = 'PAID'
        AND o."status" <> 'REFUNDED'
      GROUP BY oi."shopId"
    `,
  ]);

  const productShop = new Map(products.map((p) => [p.id, p.shopId]));

  // Accumulate rating / review count per shop.
  const ratingSum = new Map<string, number>();
  const reviewCount = new Map<string, number>();
  for (const row of reviewAgg) {
    const shopId = productShop.get(row.productId);
    if (!shopId) continue;
    const count = row._count._all;
    ratingSum.set(
      shopId,
      (ratingSum.get(shopId) ?? 0) + (row._avg.rating ?? 0) * count,
    );
    reviewCount.set(shopId, (reviewCount.get(shopId) ?? 0) + count);
  }

  for (const [shopId, count] of reviewCount) {
    const stats = result.get(shopId) ?? { ...EMPTY };
    stats.totalReviews = count;
    stats.rating = count > 0 ? (ratingSum.get(shopId) ?? 0) / count : 0;
    result.set(shopId, stats);
  }

  for (const row of salesAgg) {
    const stats = result.get(row.shopId) ?? { ...EMPTY };
    stats.totalSales = row._sum.quantity ?? 0;
    result.set(row.shopId, stats);
  }

  for (const row of orderCounts) {
    const stats = result.get(row.shopId) ?? { ...EMPTY };
    stats.totalOrders = Number(row.count);
    result.set(row.shopId, stats);
  }

  return result;
}

/** Convenience wrapper for a single shop. */
export async function getShopStatsOrDefault(
  shopId: string,
): Promise<ShopStats> {
  const map = await getShopStats([shopId]);
  return map.get(shopId) ?? { ...EMPTY };
}
