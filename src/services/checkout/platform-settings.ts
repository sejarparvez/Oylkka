import { prisma } from '@/lib/db';

export type CheckoutPlatformSettings = {
  /** Orders below this subtotal are rejected. 0 disables the check. */
  minOrderAmount: number;
  /** Shipping is capped at this amount when set. */
  maxShipping: number | null;
  /** Commission applied when a shop has no explicit rate. */
  defaultCommission: number;
};

const FALLBACK: CheckoutPlatformSettings = {
  minOrderAmount: 0,
  maxShipping: null,
  defaultCommission: 10,
};

/**
 * CONTENT-13/14: the admin-configurable `SiteSetting` values that actually
 * affect checkout. Before this these keys were write-only — setting them had
 * no effect on any order.
 */
export async function getCheckoutSettings(): Promise<CheckoutPlatformSettings> {
  const rows = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: ['min_order_amount', 'max_shipping', 'default_commission'],
      },
    },
    select: { key: true, value: true },
  });
  const map = new Map(rows.map((row) => [row.key, row.value]));

  const parse = (key: string): number | null => {
    const raw = map.get(key);
    if (raw == null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const min = parse('min_order_amount');
  const max = parse('max_shipping');
  const commission = parse('default_commission');

  return {
    minOrderAmount: min != null && min > 0 ? min : FALLBACK.minOrderAmount,
    maxShipping: max != null && max > 0 ? max : null,
    defaultCommission:
      commission != null ? commission : FALLBACK.defaultCommission,
  };
}
