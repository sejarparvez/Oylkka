import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@/generated/prisma/client';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

declare global {
  var __prisma: PrismaClient | undefined;
  var __emailQueueTimer: ReturnType<typeof setInterval> | undefined;
  var __invoiceQueueTimer: ReturnType<typeof setInterval> | undefined;
  var __cartCleanupTimer: ReturnType<typeof setInterval> | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Start the email queue background processor safely on the server.
// Gated behind an explicit flag (MONEY-42): on serverless or multi-instance
// deployments this must be a dedicated worker process, not a per-import timer.
if (
  typeof window === 'undefined' &&
  process.env.ENABLE_BACKGROUND_WORKERS === 'true'
) {
  // Deferring execution by 0ms pushes this to the end of the event loop.
  // This gives Vite time to finish initializing all imported constants first.
  setTimeout(() => {
    if (!globalThis.__emailQueueTimer) {
      import('./email-queue').then(({ startEmailQueueProcessor }) => {
        // Double-check flag in case of rapid simultaneous module executions
        if (!globalThis.__emailQueueTimer) {
          globalThis.__emailQueueTimer = startEmailQueueProcessor();
        }
      });
    }

    if (!globalThis.__invoiceQueueTimer) {
      import('./invoice-queue').then(({ startInvoiceQueueProcessor }) => {
        if (!globalThis.__invoiceQueueTimer) {
          globalThis.__invoiceQueueTimer = startInvoiceQueueProcessor();
        }
      });
    }

    if (!globalThis.__cartCleanupTimer) {
      import('./cart-cleanup').then(({ startCartCleanupProcessor }) => {
        if (!globalThis.__cartCleanupTimer) {
          globalThis.__cartCleanupTimer = startCartCleanupProcessor();
        }
      });
    }
  }, 0);
}
