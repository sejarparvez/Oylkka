import { beforeEach, describe, expect, it, mock } from 'bun:test';

// CONTENT-13/14: the checkout settings reader decides whether admin-configured
// `min_order_amount`, `max_shipping`, and `default_commission` are enforced.

let rows: Array<{ key: string; value: string }> = [];
const findMany = mock(async (_args?: unknown) => rows);

mock.module('@/lib/db', () => ({
  prisma: {
    siteSetting: {
      findMany: async (args: unknown) => findMany(args),
    },
  },
}));

const { getCheckoutSettings } = await import(
  '@/services/checkout/platform-settings'
);

describe('getCheckoutSettings', () => {
  beforeEach(() => {
    rows = [];
    findMany.mockClear();
  });

  it('falls back to safe defaults when nothing is configured', async () => {
    const settings = await getCheckoutSettings();

    expect(settings.minOrderAmount).toBe(0);
    expect(settings.maxShipping).toBeNull();
    expect(settings.defaultCommission).toBe(10);
  });

  it('parses configured numeric values', async () => {
    rows = [
      { key: 'min_order_amount', value: '500' },
      { key: 'max_shipping', value: '120' },
      { key: 'default_commission', value: '7.5' },
    ];

    const settings = await getCheckoutSettings();

    expect(settings.minOrderAmount).toBe(500);
    expect(settings.maxShipping).toBe(120);
    expect(settings.defaultCommission).toBe(7.5);
  });

  it('disables the minimum when set to zero', async () => {
    rows = [{ key: 'min_order_amount', value: '0' }];

    expect((await getCheckoutSettings()).minOrderAmount).toBe(0);
  });

  it('treats an empty or non-positive shipping cap as no cap', async () => {
    rows = [{ key: 'max_shipping', value: '' }];
    expect((await getCheckoutSettings()).maxShipping).toBeNull();

    rows = [{ key: 'max_shipping', value: '0' }];
    expect((await getCheckoutSettings()).maxShipping).toBeNull();

    rows = [{ key: 'max_shipping', value: '-5' }];
    expect((await getCheckoutSettings()).maxShipping).toBeNull();
  });

  it('treats non-numeric values as unset', async () => {
    rows = [
      { key: 'min_order_amount', value: 'abc' },
      { key: 'max_shipping', value: 'nope' },
      { key: 'default_commission', value: '' },
    ];

    const settings = await getCheckoutSettings();

    expect(settings.minOrderAmount).toBe(0);
    expect(settings.maxShipping).toBeNull();
    expect(settings.defaultCommission).toBe(10);
  });

  it('preserves a zero commission rate', async () => {
    rows = [{ key: 'default_commission', value: '0' }];

    expect((await getCheckoutSettings()).defaultCommission).toBe(0);
  });
});
