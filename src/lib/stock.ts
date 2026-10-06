import type {
  FulfillmentStatus,
  PaymentMethod,
} from '@/generated/prisma/enums';
import type { prisma } from '@/lib/db';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}

async function getVariantStatus(
  tx: PrismaTx,
  variantId: string,
): Promise<{ status: string; reservedStock: number; stock: number } | null> {
  return tx.productVariant.findUnique({
    where: { id: variantId },
    select: { status: true, reservedStock: true, stock: true },
  });
}

export async function reserveStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
  variantName: string,
): Promise<void> {
  const variant = await getVariantStatus(tx, variantId);
  if (!variant) {
    throw new StockError(`Variant "${variantName}" not found`);
  }
  if (variant.status === 'DISABLED' || variant.status === 'DISCONTINUED') {
    throw new StockError(
      `Variant "${variantName}" is ${variant.status.toLowerCase()}`,
    );
  }

  const available = variant.stock - variant.reservedStock;
  if (available < quantity) {
    throw new StockError(
      `"${variantName}" has insufficient stock (${available} available)`,
    );
  }

  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: variant.reservedStock },
    data: { reservedStock: { increment: quantity } },
  });

  if (count === 0) {
    throw new StockError(`"${variantName}" is out of stock`);
  }
}

export async function releaseReservedStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: { gte: quantity } },
    data: { reservedStock: { decrement: quantity } },
  });
  if (count === 0) return;
}

export async function decrementStock(
  tx: PrismaTx,
  productId: string,
  quantity: number,
  productName: string,
): Promise<void> {
  const { count } = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new StockError(`"${productName}" is out of stock`);
  }
}

export async function decrementVariantStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
  variantName: string,
): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new StockError(`"${variantName}" is out of stock`);
  }
}

export async function incrementStock(
  tx: PrismaTx,
  productId: string,
  quantity: number,
): Promise<void> {
  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

export async function incrementVariantStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
): Promise<void> {
  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { increment: quantity } },
  });
}

/**
 * Fulfillment states an order line can still be reversed out of. A line that
 * has already been CANCELLED or REFUNDED must never be restocked again.
 */
const NON_TERMINAL_FULFILLMENT: FulfillmentStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

/**
 * Commits a held reservation for a variant line, turning reserved units into
 * sold stock.
 *
 * The decrement of `stock` and of `reservedStock` must happen in one statement:
 * doing it in two lets a failure between them leak the reservation, and lets
 * the two columns disagree about what was sold (MONEY-44). The
 * `reservedStock: { gte: quantity }` guard makes a double-commit fail loudly
 * instead of driving reservedStock negative.
 */
export async function commitVariantReservation(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
  variantName: string,
): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: { gte: quantity } },
    data: {
      stock: { decrement: quantity },
      reservedStock: { decrement: quantity },
    },
  });

  if (count === 0) {
    throw new StockError(
      `Cannot commit "${variantName}": no matching reservation for ${quantity} unit(s)`,
    );
  }
}

/**
 * Releases a held reservation for a variant line without consuming stock —
 * used when an order is cancelled or expires before payment is captured.
 *
 * Returns false when there was no matching reservation. That is expected when a
 * release runs against an order that never reached checkout, but it must be
 * visible to the caller so a genuine leak is not silently swallowed.
 */
export async function releaseVariantReservation(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
): Promise<boolean> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: { gte: quantity } },
    data: { reservedStock: { decrement: quantity } },
  });
  return count > 0;
}

/**
 * Cancels order lines and unwinds whatever stock the order was holding.
 *
 * What needs unwinding depends on how far the order got, which is the crux of
 * MONEY-45 and MONEY-46:
 *
 * - COD / WALLET consumed stock when the order was created, so both the
 *   product and the variant counter go back up.
 * - bKash never consumed a variant line — it only *held* the units in
 *   `reservedStock` — so the reservation is released and neither stock counter
 *   moves. A bKash non-variant line did decrement `Product.stock` at
 *   reservation time, so that one goes back up.
 *
 * Restocking bKash variant lines unconditionally inflates inventory twice per
 * line on top of the repeat-call bug below.
 *
 * Idempotency comes from `updateManyAndReturn`: the transition and the returned
 * rows are one statement, so we unwind exactly the lines this call won. A
 * retried or double-clicked cancel matches nothing the second time and therefore
 * moves no counters at all.
 *
 * @returns the lines this call transitioned out of a non-terminal state.
 */
export async function unwindUnpaidOrder(
  tx: PrismaTx,
  orderId: string,
  paymentMethod: PaymentMethod | null,
  itemIds: string[],
): Promise<
  Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
  }>
> {
  if (itemIds.length === 0) return [];

  const transitioned = await tx.orderItem.updateManyAndReturn({
    where: {
      id: { in: itemIds },
      orderId,
      fulfillmentStatus: { in: NON_TERMINAL_FULFILLMENT },
    },
    data: { fulfillmentStatus: 'CANCELLED' },
    select: {
      id: true,
      productId: true,
      variantId: true,
      quantity: true,
    },
  });

  const heldAsReservation = paymentMethod === 'BKASH';

  for (const item of transitioned) {
    if (heldAsReservation) {
      if (item.variantId) {
        await releaseVariantReservation(tx, item.variantId, item.quantity);
      } else {
        await incrementStock(tx, item.productId, item.quantity);
      }
      continue;
    }

    await incrementStock(tx, item.productId, item.quantity);
    if (item.variantId) {
      await incrementVariantStock(tx, item.variantId, item.quantity);
    }
  }

  return transitioned;
}
