const BATCH_SIZE = 10;
const POLL_INTERVAL = 30_000;
// Rows left in PROCESSING after this long are treated as abandoned and reset
// to PENDING so a crashed worker does not permanently stall the queue.
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

import { prisma } from '@/lib/db';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { logError } from '@/lib/logger';

export async function enqueueInvoiceGeneration(
  orderId: string,
): Promise<string> {
  const entry = await prisma.invoiceQueue.create({
    data: { orderId },
  });

  // Deliberately no immediate processing here: it overlapped the interval
  // worker and caused duplicate generations (MONEY-41). Worker picks it up.
  return entry.id;
}

/** Atomically claim the next batch so concurrent workers never double-process. */
async function claimBatch() {
  const candidates = await prisma.invoiceQueue.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (candidates.length === 0) return [];

  const claimed = await prisma.invoiceQueue.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, status: 'PENDING' },
    data: { status: 'PROCESSING', processedAt: new Date() },
  });

  if (claimed.count === 0) return [];

  return prisma.invoiceQueue.findMany({
    where: { id: { in: candidates.map((c) => c.id) }, status: 'PROCESSING' },
    orderBy: { createdAt: 'asc' },
  });
}

export async function processInvoiceQueue(): Promise<void> {
  try {
    // Recover jobs abandoned by a crashed worker.
    await prisma.invoiceQueue.updateMany({
      where: {
        status: 'PROCESSING',
        processedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) },
      },
      data: { status: 'PENDING', processedAt: null },
    });

    const claimed = await claimBatch();
    if (claimed.length === 0) return;

    for (const job of claimed) {
      try {
        const pdfUrl = await generateInvoicePdf(job.orderId);

        await prisma.invoiceQueue.update({
          where: { id: job.id },
          data: {
            status: pdfUrl ? 'COMPLETED' : 'FAILED',
            processedAt: new Date(),
            error: pdfUrl ? null : 'Invoice generation returned no URL',
          },
        });
      } catch (err) {
        const newRetryCount = job.retryCount + 1;
        const newStatus =
          newRetryCount >= job.maxRetries ? 'FAILED' : 'PENDING';

        await prisma.invoiceQueue.update({
          where: { id: job.id },
          data: {
            status: newStatus,
            retryCount: newRetryCount,
            processedAt: null,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        });
      }
    }
  } catch (error) {
    logError('invoice-queue', error);
  }
}

export function startInvoiceQueueProcessor(): ReturnType<typeof setInterval> {
  processInvoiceQueue().catch((err) => logError('invoice-queue', err));
  return setInterval(() => {
    processInvoiceQueue().catch((err) => logError('invoice-queue', err));
  }, POLL_INTERVAL);
}