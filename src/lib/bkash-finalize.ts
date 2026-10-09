import { prisma } from '@/lib/db';
import { enqueueInvoiceGeneration } from '@/lib/invoice-queue';
import { commitVariantReservation, decrementStock } from '@/lib/stock';
import { consumeVouchers } from '@/lib/voucher-consumption';
import type { OrderMetadata } from '@/types/orders';

const AMOUNT_TOLERANCE = 0.01;

type AppliedVoucherEntry = {
  userVoucherId?: string;
  couponId: string;
  /** 0 means unlimited; lets the consumer enforce the cap in the DB. */
  maxUses?: number;
};

type FinalizeMetadata = OrderMetadata & {
  appliedVouchers?: AppliedVoucherEntry[];
  cashbackAmount?: number;
};

export type FinalizeBkashResult =
  | { status: 'finalized' }
  | { status: 'already_processed' }
  | { status: 'amount_mismatch'; expected: number; received: number }
  | { status: 'not_found' };

/**
 * Finalize a bKash order after the gateway confirms the payment.
 *
 * The payment claim and the post-payment side effects run as *separate*
 * transactions on purpose (LIFE-12): once we have recorded the payment as
 * PAID we must never roll it back because stock decrement failed, otherwise
 * the customer has paid for an order that stays PENDING forever.
 */
export async function finalizeBkashOrder(params: {
  orderId: string;
  trxID: string;
  capturedAmount: number;
}): Promise<FinalizeBkashResult> {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { items: true },
  });

  if (!order) {
    return { status: 'not_found' };
  }

  const expected = Number(order.total);
  if (Math.abs(params.capturedAmount - expected) > AMOUNT_TOLERANCE) {
    // Never mark a mismatched payment as PAID; flag it for manual review.
    await prisma.order.updateMany({
      where: { id: order.id, paymentStatus: 'PENDING' },
      data: {
        metadata: {
          ...((order.metadata ?? {}) as FinalizeMetadata),
          paymentAmountMismatch: true,
          reportedAmount: params.capturedAmount,
        },
      },
    });
    return {
      status: 'amount_mismatch',
      expected,
      received: params.capturedAmount,
    };
  }

  const metadata = (order.metadata ?? {}) as FinalizeMetadata;
  const appliedVouchers = metadata.appliedVouchers ?? [];
  const cashbackAmount = Number(metadata.cashbackAmount ?? 0);

  // 1. Atomically claim the payment. The conditional PENDING guard makes
  //    concurrent callbacks / IPNs idempotent: exactly one wins (MONEY-11).
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: 'PENDING' },
    data: {
      paymentStatus: 'PAID',
      status: 'CONFIRMED',
      paidAt: new Date(),
      confirmedAt: new Date(),
      paymentRef: params.trxID,
      metadata: {
        ...metadata,
        bkashTrxID: params.trxID,
        bkashPaymentStatus: 'Completed',
      },
    },
  });

  if (claimed.count === 0) {
    return { status: 'already_processed' };
  }

  // 2. Post-payment side effects in their own transaction.
  try {
    await prisma.$transaction(async (tx) => {
      // Sell the stock this order was holding. Non-variant products were
      // already decremented at checkout reservation time (MONEY-22);
      // decrementing them again here would double-count.
      for (const item of order.items) {
        if (!item.variantId) continue;

        await decrementStock(
          tx,
          item.productId,
          item.quantity,
          item.productName,
        );
        // One statement for stock and reservedStock, so the reservation can
        // never be half-consumed if the variant commit fails (MONEY-44).
        await commitVariantReservation(
          tx,
          item.variantId,
          item.quantity,
          item.variantName || 'variant',
        );
      }

      await tx.cartItem.deleteMany({
        where: { cart: { userId: order.customerId } },
      });

      await consumeVouchers({
        tx,
        orderId: order.id,
        customerId: order.customerId,
        appliedVouchers,
      });

      if (cashbackAmount > 0) {
        let wallet = await tx.wallet.findUnique({
          where: { userId: order.customerId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: order.customerId },
          });
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: cashbackAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: cashbackAmount,
            reference: 'CASHBACK',
            orderId: order.id,
            description: 'Cashback from vouchers',
          },
        });
      }
    });
  } catch (error) {
    // The payment is already recorded as PAID. Do not undo it — flag the
    // order so an admin can reconcile stock/vouchers manually.
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error(
      `Post-payment processing failed for order ${order.id}; flagged for reconciliation:`,
      error,
    );
    await prisma.order
      .update({
        where: { id: order.id },
        data: {
          metadata: {
            ...metadata,
            bkashTrxID: params.trxID,
            reconciliationRequired: true,
            reconciliationReason:
              error instanceof Error ? error.message : String(error),
          },
        },
      })
      .catch(() => {});
    return { status: 'finalized' };
  }

  enqueueInvoiceGeneration(order.id).catch((err) =>
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Failed to enqueue invoice generation:', err),
  );

  return { status: 'finalized' };
}
