import type { prisma } from '@/lib/db';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Flag payout items as reversed when their underlying order item is refunded
 * (MONEY-10). This is deliberately flag-only: no money is moved, but the
 * recoverable amount is recorded so an admin can claw it back from the vendor.
 */
export async function flagPayoutReversals(
  tx: PrismaTx,
  params: { orderItemIds: string[]; reason?: string | null },
): Promise<void> {
  if (params.orderItemIds.length === 0) return;

  const payoutItems = await tx.payoutItem.findMany({
    where: { orderItemId: { in: params.orderItemIds } },
    select: { id: true, payoutId: true, amount: true, reversedAmount: true },
  });

  if (payoutItems.length === 0) return;

  const now = new Date();
  const reason = params.reason?.trim() || 'Order refunded';

  for (const item of payoutItems) {
    if (Number(item.reversedAmount) > 0) continue;

    await tx.payoutItem.update({
      where: { id: item.id },
      data: {
        reversedAmount: item.amount,
        disputedAt: now,
        disputeReason: reason,
      },
    });
  }

  // If every item in a payout has now been reversed, mark the payout itself.
  const payoutIds = [...new Set(payoutItems.map((item) => item.payoutId))];
  for (const payoutId of payoutIds) {
    const outstanding = await tx.payoutItem.count({
      where: { payoutId, reversedAmount: 0 },
    });

    if (outstanding === 0) {
      await tx.payout.updateMany({
        where: { id: payoutId, status: { not: 'REVERSED' } },
        data: { status: 'REVERSED' },
      });
    }
  }
}
