import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import type { OrderMetadata } from '@/types/orders';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * A coupon/voucher that was applied at checkout and must be recorded as used
 * once the order's money actually settles (MONEY-23): bKash at payment
 * confirmation, WALLET at creation (already paid), COD when the item is
 * delivered and the cash collected at the door.
 */
export type AppliedVoucherConsumption = {
  couponId: string;
  /** The `UserVoucher` row to mark used, when the voucher was claimed. */
  userVoucherId?: string;
  /** Human-readable code, used in strict-mode errors. */
  code?: string;
  /** `maxUses > 0` caps total usages; `0`/undefined means unlimited. */
  maxUses?: number;
};

/** Thrown only in strict mode once a coupon has hit its usage cap. */
export class VoucherCapError extends Error {
  constructor(couponCode: string) {
    super(`Coupon ${couponCode} has reached its usage limit`);
    this.name = 'VoucherCapError';
  }
}

/**
 * Record `CouponUsage` rows and mark claimed vouchers used for a settled order,
 * inside the caller's transaction.
 *
 * The usage cap is enforced with a conditional write so two concurrent
 * checkouts can't both slip past it (MONEY-38). When `strict` is true the whole
 * caller transaction can still be rolled back (WALLET payment), so an over-cap
 * coupon throws. When false the money is already captured (bKash finalize, COD
 * delivery) and an over-cap coupon is logged and skipped — under-counting one
 * coupon is far less costly than a paid customer with a dead order.
 */
export async function consumeVouchers({
  tx,
  orderId,
  customerId,
  appliedVouchers,
  strict = false,
}: {
  tx: PrismaTx;
  orderId: string;
  customerId: string;
  appliedVouchers: AppliedVoucherConsumption[];
  strict?: boolean;
}): Promise<void> {
  for (const v of appliedVouchers) {
    await tx.couponUsage.create({
      data: {
        couponId: v.couponId,
        userId: customerId,
        orderId,
      },
    });

    if (v.maxUses !== undefined && v.maxUses > 0) {
      const { count } = await tx.coupon.updateMany({
        where: { id: v.couponId, usedCount: { lt: v.maxUses } },
        data: { usedCount: { increment: 1 } },
      });

      if (count === 0) {
        if (strict) {
          throw new VoucherCapError(v.code ?? v.couponId);
        }
        logError(
          'coupon-cap-exceeded',
          new Error(
            `Coupon ${v.couponId} hit its usage cap on order ${orderId}; usage not counted`,
          ),
        );
      }
    } else {
      await tx.coupon.update({
        where: { id: v.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (v.userVoucherId) {
      await tx.userVoucher.update({
        where: { id: v.userVoucherId },
        data: { usedAt: new Date(), orderId },
      });
    }
  }
}

/**
 * Settle the voucher side-effects of a COD order when an item is delivered.
 *
 * COD money is collected at the door, so the vouchers/coupons that were applied
 * at checkout are only consumed once the order is delivered instead of at
 * creation — an unpaid order that is cancelled must not eat the customer's
 * voucher (MONEY-23). The order is claimed once with a conditional write, so
 * delivering several items of the same order settles the vouchers exactly once.
 *
 * Deliberately never throws: the delivery has already happened by the time this
 * runs, so a settlement failure is logged for reconciliation rather than
 * surfaced as a 500 on an endpoint that must not fail.
 */
export async function settleCodDeliveredVouchers(
  orderId: string,
): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true, paymentMethod: true, metadata: true },
    });
    if (!order || order.paymentMethod !== 'CASH_ON_DELIVERY') return;

    const metadata = (order.metadata ?? {}) as OrderMetadata & {
      vouchersSettledAt?: string;
    };
    const appliedVouchers = metadata.appliedVouchers ?? [];
    if (appliedVouchers.length === 0 || metadata.vouchersSettledAt) return;

    // Atomic claim: exactly one of concurrent deliveries on this order wins.
    const claimed = await prisma.order.updateMany({
      where: {
        id: orderId,
        paymentMethod: 'CASH_ON_DELIVERY',
        NOT: { metadata: { string_contains: '"vouchersSettledAt"' } },
      },
      data: {
        metadata: {
          ...metadata,
          vouchersSettledAt: new Date().toISOString(),
        } as unknown as OrderMetadata,
      },
    });
    if (claimed.count === 0) return;

    await prisma.$transaction(async (tx) => {
      await consumeVouchers({
        tx,
        orderId,
        customerId: order.customerId,
        appliedVouchers,
      });
    });
  } catch (error) {
    logError(
      'cod-voucher-settlement',
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
