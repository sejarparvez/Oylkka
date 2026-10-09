import { describe, expect, it } from 'bun:test';
import {
  dhakaDateKey,
  dhakaMonthKey,
  lastNDayKeys,
  lastNMonthKeys,
} from '@/lib/timezone';

describe('timezone helpers (DATA-04/DATA-06)', () => {
  it('buckets a UTC instant into the correct Dhaka day', () => {
    // 2026-10-01T20:00:00Z is already 2026-10-02 02:00 in Asia/Dhaka.
    const date = new Date('2026-10-01T20:00:00.000Z');
    expect(dhakaDateKey(date)).toBe('2026-10-02');
    expect(dhakaMonthKey(date)).toBe('2026-10');
  });

  it('buckets a late-UTC-month instant into the next Dhaka month', () => {
    // 2026-10-31T20:00:00Z is 2026-11-01 02:00 in Asia/Dhaka.
    const date = new Date('2026-10-31T20:00:00.000Z');
    expect(dhakaMonthKey(date)).toBe('2026-11');
  });

  it('returns 12 month keys ending at the current Dhaka month', () => {
    const keys = lastNMonthKeys(12, new Date('2026-10-09T00:00:00.000Z'));
    expect(keys.length).toBe(12);
    expect(keys[0]).toBe('2025-11');
    expect(keys[11]).toBe('2026-10');
  });

  it('returns 30 day keys ending today, without a future bucket', () => {
    const keys = lastNDayKeys(30, new Date('2026-10-09T06:00:00.000Z'));
    expect(keys.length).toBe(30);
    expect(keys[29]).toBe('2026-10-09');
    expect(keys[0]).toBe('2026-09-10');
  });
});
