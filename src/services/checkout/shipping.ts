import { prisma } from '@/lib/db';

export interface ShippingEstimateItem {
  quantity: number;
  freeShipping?: boolean;
  shop?: { id: string } | null;
  unitPrice: number;
}

export interface ShippingEstimate {
  cost: number;
  /** Zone delivery estimate (e.g. "2-4 days"), joined across shops. */
  estDays: string | null;
}

/**
 * Zone-aware shipping calculation shared by checkout (`create.ts`) and the
 * `discount-preview` quote so the customer always sees the amount they will
 * actually be charged (MONEY-30).
 *
 * Zone lookup is deterministic (cheapest active zone wins, MONEY-31); when no
 * zone covers the district the shop's flat `shippingCost` is used.
 */
export async function computeShippingEstimate(
  items: ShippingEstimateItem[],
  shippingDistrict?: string | null,
): Promise<ShippingEstimate> {
  const perShop = new Map<
    string,
    { hasNonFree: boolean; itemQty: number; shopSubtotal: number }
  >();

  for (const item of items) {
    const shopId = item.shop?.id;
    if (!shopId) continue;

    let entry = perShop.get(shopId);
    if (!entry) {
      entry = { hasNonFree: false, itemQty: 0, shopSubtotal: 0 };
      perShop.set(shopId, entry);
    }

    entry.shopSubtotal += item.unitPrice * item.quantity;
    if (!item.freeShipping) {
      entry.hasNonFree = true;
      entry.itemQty += item.quantity;
    }
  }

  const shopIds = [...perShop.keys()];
  if (shopIds.length === 0) return { cost: 0, estDays: null };

  const shops = await prisma.shop.findMany({
    where: { id: { in: shopIds } },
    select: { id: true, shippingCost: true },
  });
  const flatCost = new Map(
    shops.map((shop) => [shop.id, Number(shop.shippingCost)]),
  );

  let total = 0;
  const estDaysSet = new Set<string>();

  for (const [shopId, entry] of perShop) {
    if (!entry.hasNonFree) continue;

    let cost = flatCost.get(shopId) ?? 0;

    if (shippingDistrict) {
      const zone = await prisma.shippingZone.findFirst({
        where: {
          shopId,
          isActive: true,
          districts: { some: { district: shippingDistrict } },
        },
        orderBy: { baseCost: 'asc' },
        select: {
          baseCost: true,
          perItem: true,
          freeAbove: true,
          estDays: true,
        },
      });

      if (zone) {
        cost = Number(zone.baseCost) + Number(zone.perItem) * entry.itemQty;
        if (
          zone.freeAbove != null &&
          entry.shopSubtotal >= Number(zone.freeAbove)
        ) {
          cost = 0;
        }
        if (zone.estDays) {
          estDaysSet.add(zone.estDays);
        }
      }
    }

    total += cost;
  }

  return {
    cost: total,
    estDays: estDaysSet.size > 0 ? [...estDaysSet].join(', ') : null,
  };
}
