/**
 * Currency formatting helpers.
 *
 * Prisma `Decimal` fields are serialised to JSON as strings, so values that
 * reach the client (e.g. `CartItem.savedPrice`, `product.price`) may be either
 * `number` or `string`. Callers that used `.toLocaleString()` directly on such
 * values silently rendered unformatted strings (DATA-12).
 */

/** Coerce a number, numeric string, Decimal-like value or null/undefined to a number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Format a value as BDT with thousands separators, e.g. `1,234.5`.
 * Returns an unformatted fallback for invalid input rather than `NaN`.
 */
export function formatBDT(value: unknown, fractionDigits?: number): string {
  const n = toNumber(value);
  return n.toLocaleString('en-BD', {
    minimumFractionDigits: fractionDigits ?? 0,
    maximumFractionDigits: fractionDigits ?? 2,
  });
}
