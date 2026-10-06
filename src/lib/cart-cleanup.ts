const CLEANUP_INTERVAL = 60 * 60 * 1000;

import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';

/**
 * How long an untouched cart lives before the reaper deletes it.
 *
 * `Cart.expiresAt` was nullable and never written, so `cleanupExpiredCarts`
 * matched nothing and abandoned carts accumulated forever (MONEY-43). Every
 * cart creation must stamp this.
 */
export const CART_TTL_MS = 24 * 60 * 60 * 1000;

export function cartExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + CART_TTL_MS);
}

export async function cleanupExpiredCarts(): Promise<void> {
  try {
    const result = await prisma.cart.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lte: new Date(),
        },
      },
    });
    if (result.count > 0) {
      // biome-ignore lint/suspicious/noConsole: intentional log
      console.log(`[Oylkka] Cleaned up ${result.count} expired cart(s)`);
    }
  } catch (err) {
    logError('cart-cleanup', err);
  }
}

export function startCartCleanupProcessor(): ReturnType<typeof setInterval> {
  cleanupExpiredCarts().catch((err) => logError('cart-cleanup', err));
  return setInterval(() => {
    cleanupExpiredCarts().catch((err) => logError('cart-cleanup', err));
  }, CLEANUP_INTERVAL);
}
