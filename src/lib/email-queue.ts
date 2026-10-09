// 1. Configuration constants must sit at the absolute top
// This guarantees they are initialized before any functions try to read them.
const BATCH_SIZE = 10;
const POLL_INTERVAL = 30_000;
// Rows left in PROCESSING after this long are treated as abandoned and reset
// to PENDING so a crashed worker does not permanently stall the queue.
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import transporter from '@/lib/nodemailer';

export async function queueEmail(
  to: string,
  subject: string,
  html: string,
): Promise<string> {
  const entry = await prisma.emailQueue.create({
    data: { to, subject, html },
  });

  // Deliberately no immediate processing here: it overlapped the interval
  // worker and caused duplicate sends (MONEY-40). The worker picks it up.
  return entry.id;
}

/** Atomically claim the next batch so concurrent workers never double-send. */
async function claimBatch() {
  const candidates = await prisma.emailQueue.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
    select: { id: true },
  });

  if (candidates.length === 0) return [];

  const claimed = await prisma.emailQueue.updateMany({
    where: { id: { in: candidates.map((c) => c.id) }, status: 'PENDING' },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  if (claimed.count === 0) return [];

  return prisma.emailQueue.findMany({
    where: { id: { in: candidates.map((c) => c.id) }, status: 'PROCESSING' },
    orderBy: { createdAt: 'asc' },
  });
}

export async function processEmailQueue(): Promise<void> {
  try {
    // Recover jobs abandoned by a crashed worker.
    await prisma.emailQueue.updateMany({
      where: {
        status: 'PROCESSING',
        startedAt: { lt: new Date(Date.now() - CLAIM_TIMEOUT_MS) },
      },
      data: { status: 'PENDING', startedAt: null },
    });

    const claimed = await claimBatch();
    if (claimed.length === 0) return;

    for (const email of claimed) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_SENDER,
          to: email.to,
          subject: `Oylkka - ${email.subject}`,
          html: email.html,
        });

        await prisma.emailQueue.update({
          where: { id: email.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (err) {
        const newRetryCount = email.retryCount + 1;
        const newStatus =
          newRetryCount >= email.maxRetries ? 'FAILED' : 'PENDING';

        await prisma.emailQueue.update({
          where: { id: email.id },
          data: {
            status: newStatus,
            retryCount: newRetryCount,
            startedAt: null,
            error: err instanceof Error ? err.message : 'Unknown error',
          },
        });
      }
    }
  } catch (error) {
    logError('email-queue', error);
  }
}

export function startEmailQueueProcessor(): ReturnType<typeof setInterval> {
  processEmailQueue().catch((err) => logError('email-queue', err));
  return setInterval(() => {
    processEmailQueue().catch((err) => logError('email-queue', err));
  }, POLL_INTERVAL);
}
