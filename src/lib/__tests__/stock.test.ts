import { describe, expect, it } from 'bun:test';
import {
  commitVariantReservation,
  releaseVariantReservation,
  StockError,
  unwindUnpaidOrder,
} from '@/lib/stock';

type LineStatus =
  | 'PENDING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

type FakeLine = {
  id: string;
  orderId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  status: LineStatus;
};

type FakeState = {
  lines: FakeLine[];
  productStock: Map<string, number>;
  variantStock: Map<string, number>;
  variantReserved: Map<string, number>;
};

function seed(lines: Partial<FakeLine>[] = []): FakeState {
  return {
    lines: lines.map((l, i) => ({
      id: l.id ?? `line-${i}`,
      orderId: l.orderId ?? 'order-1',
      productId: l.productId ?? 'product-1',
      variantId: l.variantId ?? null,
      quantity: l.quantity ?? 1,
      status: l.status ?? ('PENDING' as LineStatus),
    })),
    productStock: new Map(),
    variantStock: new Map(),
    variantReserved: new Map(),
  };
}

/** Argument shapes the fake below needs to interpret. */
type UpdateManyAndReturnArgs = {
  where: {
    id?: { in?: string[] };
    orderId: string;
    fulfillmentStatus?: { in?: LineStatus[] };
  };
  data: { fulfillmentStatus: LineStatus };
};

type UpdateArgs = {
  where: { id: string };
  data: { stock?: { increment?: number; decrement?: number } };
};

type UpdateManyArgs = {
  where: { id: string; reservedStock?: { gte?: number } };
  data: {
    stock?: { increment?: number; decrement?: number };
    reservedStock?: { increment?: number; decrement?: number };
  };
};

/**
 * Stand-in for a Prisma transaction handle. `unwindUnpaidOrder` and friends
 * receive their handle as an argument and `stock.ts` only type-imports `db.ts`,
 * so the unwind logic can be exercised without a database.
 */
function createFakeTx(state: FakeState) {
  return {
    orderItem: {
      updateManyAndReturn: async (args: UpdateManyAndReturnArgs) => {
        const { id, orderId, fulfillmentStatus } = args.where;
        const target = args.data.fulfillmentStatus;

        const matched = state.lines.filter(
          (line) =>
            (!id?.in || id.in.includes(line.id)) &&
            line.orderId === orderId &&
            (!fulfillmentStatus?.in ||
              fulfillmentStatus.in.includes(line.status)),
        );

        for (const line of matched) line.status = target;

        return matched.map((l) => ({
          id: l.id,
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
        }));
      },
    },
    product: {
      update: async ({ where, data }: UpdateArgs) => {
        state.productStock.set(
          where.id,
          (state.productStock.get(where.id) ?? 0) +
            (data.stock?.increment ?? 0),
        );
        return {};
      },
    },
    productVariant: {
      update: async ({ where, data }: UpdateArgs) => {
        state.variantStock.set(
          where.id,
          (state.variantStock.get(where.id) ?? 0) +
            (data.stock?.increment ?? 0),
        );
        return {};
      },
      updateMany: async ({ where, data }: UpdateManyArgs) => {
        const id = where.id;
        const reserved = state.variantReserved.get(id) ?? 0;

        if (
          where.reservedStock?.gte != null &&
          reserved < where.reservedStock.gte
        ) {
          return { count: 0 };
        }

        state.variantReserved.set(
          id,
          reserved +
            (data.reservedStock?.increment ?? 0) -
            (data.reservedStock?.decrement ?? 0),
        );

        if (data.stock?.decrement) {
          state.variantStock.set(
            id,
            (state.variantStock.get(id) ?? 0) - data.stock.decrement,
          );
        }

        return { count: 1 };
      },
    },
  } as never;
}

describe('unwindUnpaidOrder', () => {
  it('restocks product and variant counters for a COD line', async () => {
    const state = seed([{ variantId: 'variant-1', quantity: 3 }]);
    state.productStock.set('product-1', 7);
    state.variantStock.set('variant-1', 4);

    const unwound = await unwindUnpaidOrder(
      createFakeTx(state),
      'order-1',
      'CASH_ON_DELIVERY',
      ['line-0'],
    );

    expect(unwound).toHaveLength(1);
    expect(state.productStock.get('product-1')).toBe(10);
    expect(state.variantStock.get('variant-1')).toBe(7);
  });

  it('releases only the reservation for a bKash variant line', async () => {
    const state = seed([{ variantId: 'variant-1', quantity: 2 }]);
    state.variantReserved.set('variant-1', 5);
    state.productStock.set('product-1', 9);
    state.variantStock.set('variant-1', 9);

    await unwindUnpaidOrder(createFakeTx(state), 'order-1', 'BKASH', [
      'line-0',
    ]);

    // bKash never decremented either stock counter for a variant line — it only
    // held the units — so only the hold is released.
    expect(state.variantReserved.get('variant-1')).toBe(3);
    expect(state.productStock.get('product-1')).toBe(9);
    expect(state.variantStock.get('variant-1')).toBe(9);
  });

  it('restores Product.stock for a bKash non-variant line', async () => {
    const state = seed([{ variantId: null, quantity: 4 }]);
    state.productStock.set('product-1', 1);

    await unwindUnpaidOrder(createFakeTx(state), 'order-1', 'BKASH', [
      'line-0',
    ]);

    expect(state.productStock.get('product-1')).toBe(5);
  });

  it('is idempotent: a repeated cancel moves no counters (MONEY-44)', async () => {
    const state = seed([{ variantId: 'variant-1', quantity: 3 }]);
    state.productStock.set('product-1', 7);
    state.variantStock.set('variant-1', 4);

    const tx = createFakeTx(state);
    await unwindUnpaidOrder(tx, 'order-1', 'CASH_ON_DELIVERY', ['line-0']);
    const afterFirst = {
      product: state.productStock.get('product-1'),
      variant: state.variantStock.get('variant-1'),
    };

    const second = await unwindUnpaidOrder(tx, 'order-1', 'CASH_ON_DELIVERY', [
      'line-0',
    ]);

    expect(second).toHaveLength(0);
    expect(state.productStock.get('product-1')).toBe(afterFirst.product);
    expect(state.variantStock.get('variant-1')).toBe(afterFirst.variant);
  });

  it('never restocks a line already in a terminal state', async () => {
    const state = seed([
      { id: 'a', status: 'CANCELLED', quantity: 5 },
      { id: 'b', status: 'REFUNDED', quantity: 5 },
      { id: 'c', status: 'PENDING', quantity: 1 },
    ]);
    state.productStock.set('product-1', 0);

    const unwound = await unwindUnpaidOrder(
      createFakeTx(state),
      'order-1',
      'CASH_ON_DELIVERY',
      ['a', 'b', 'c'],
    );

    expect(unwound.map((u) => u.id)).toEqual(['c']);
    expect(state.productStock.get('product-1')).toBe(1);
  });

  it('cannot unwind a line belonging to a different order', async () => {
    const state = seed([{ id: 'a', orderId: 'order-2', quantity: 5 }]);
    state.productStock.set('product-1', 0);

    const unwound = await unwindUnpaidOrder(
      createFakeTx(state),
      'order-1',
      'CASH_ON_DELIVERY',
      ['a'],
    );

    expect(unwound).toHaveLength(0);
    expect(state.productStock.get('product-1')).toBe(0);
    expect(state.lines[0].status).toBe('PENDING');
  });

  it('performs no writes for an empty item list', async () => {
    const state = seed();
    state.productStock.set('product-1', 3);

    const unwound = await unwindUnpaidOrder(
      createFakeTx(state),
      'order-1',
      'CASH_ON_DELIVERY',
      [],
    );

    expect(unwound).toHaveLength(0);
    expect(state.productStock.get('product-1')).toBe(3);
  });
});

describe('commitVariantReservation', () => {
  it('consumes stock and releases the hold in one statement', async () => {
    const state = seed();
    state.variantStock.set('variant-1', 10);
    state.variantReserved.set('variant-1', 4);

    await commitVariantReservation(
      createFakeTx(state),
      'variant-1',
      4,
      'Large',
    );

    expect(state.variantStock.get('variant-1')).toBe(6);
    expect(state.variantReserved.get('variant-1')).toBe(0);
  });

  it('throws when the reservation is missing instead of half-applying', async () => {
    const state = seed();
    state.variantStock.set('variant-1', 10);
    state.variantReserved.set('variant-1', 1);

    await expect(
      commitVariantReservation(createFakeTx(state), 'variant-1', 4, 'Large'),
    ).rejects.toThrow(StockError);

    expect(state.variantStock.get('variant-1')).toBe(10);
    expect(state.variantReserved.get('variant-1')).toBe(1);
  });
});

describe('releaseVariantReservation', () => {
  it('reports success when a hold was released', async () => {
    const state = seed();
    state.variantReserved.set('variant-1', 5);

    const released = await releaseVariantReservation(
      createFakeTx(state),
      'variant-1',
      3,
    );

    expect(released).toBe(true);
    expect(state.variantReserved.get('variant-1')).toBe(2);
  });

  it('reports failure rather than swallowing a missing hold', async () => {
    const state = seed();
    state.variantReserved.set('variant-1', 1);

    const released = await releaseVariantReservation(
      createFakeTx(state),
      'variant-1',
      3,
    );

    expect(released).toBe(false);
    expect(state.variantReserved.get('variant-1')).toBe(1);
  });
});
