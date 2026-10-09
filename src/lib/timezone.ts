/**
 * Timezone helpers for analytics bucketing (DATA-04, DATA-06).
 *
 * The platform is Bangladesh-first; dashboards must bucket by Asia/Dhaka
 * regardless of the host's local timezone (serverless hosts commonly run UTC).
 */

export const DHAKA_TIME_ZONE = 'Asia/Dhaka';

type Parts = { year: number; month: number; day: number };

function dhakaParts(date: Date): Parts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month'), day: get('day') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM` key for the given instant in Asia/Dhaka. */
export function dhakaMonthKey(date: Date): string {
  const { year, month } = dhakaParts(date);
  return `${year}-${pad(month)}`;
}

/** `YYYY-MM-DD` key for the given instant in Asia/Dhaka. */
export function dhakaDateKey(date: Date): string {
  const { year, month, day } = dhakaParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * The last `count` month keys (inclusive of the current month), oldest first,
 * e.g. `['2025-11', '2025-12', ..., '2026-10']`.
 */
export function lastNMonthKeys(count: number, now = new Date()): string[] {
  const { year, month } = dhakaParts(now);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const total = year * 12 + (month - 1) - i;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    keys.push(`${y}-${pad(m)}`);
  }
  return keys;
}

/**
 * The last `count` day keys (inclusive of today), oldest first,
 * e.g. `['2026-09-10', ..., '2026-10-09']`.
 */
export function lastNDayKeys(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(dhakaDateKey(d));
  }
  return keys;
}
