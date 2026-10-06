import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { payoutProcessedHtml } from '@/lib/email-templates';
import { logError } from '@/lib/logger';
import { sendEmail } from '@/lib/send-email';

/**
 * A payout must carry the bank/bKash reference it represents. Without it the
 * record asserts money moved with no evidence, and there is nothing to
 * reconcile against later (MONEY-61).
 */
const ProcessPayoutSchema = z.object({
  shopId: z.string().min(1, 'shopId is required'),
  reference: z
    .string()
    .trim()
    .min(3, 'A transfer reference is required')
    .max(120, 'Reference is too long'),
  note: z.string().max(1000).nullish(),
});

/** PayoutItem.orderItemId is unique, so a duplicate means a race was lost. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

export const Route = createFileRoute('/api/admin/payouts/process')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const parsedBody = ProcessPayoutSchema.safeParse(
            await request.json().catch(() => null),
          );
          if (!parsedBody.success) {
            return Response.json(
              {
                error: 'Invalid request body',
                details: parsedBody.error.flatten(),
              },
              { status: 400 },
            );
          }

          const { shopId, reference, note } = parsedBody.data;

          const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            include: {
              owner: { select: { email: true, name: true } },
            },
          });
          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          // A suspended or unapproved vendor must not be payable. Status was
          // never checked, so a shop suspended for fraud could still be
          // processed (MONEY-61).
          if (shop.status !== 'ACTIVE') {
            return Response.json(
              {
                error: `Shop is ${shop.status}; payouts require an ACTIVE shop`,
              },
              { status: 400 },
            );
          }

          // Claim and create in one transaction. Re-reading inside the transaction means
          // a concurrent run cannot select the same order items, and the unique
          // constraint on PayoutItem.orderItemId is the backstop.
          let payout: { id: string };
          let totalAmount: number;
          let itemCount: number;
          try {
            const result = await prisma.$transaction(async (tx) => {
              const items = await tx.orderItem.findMany({
                where: {
                  shopId,
                  fulfillmentStatus: 'DELIVERED',
                  payoutItem: null,
                },
                select: {
                  id: true,
                  vendorAmount: true,
                  commissionAmount: true,
                },
              });

              if (items.length === 0) {
                return null;
              }

              const amount = items.reduce(
                (sum, item) => sum + Number(item.vendorAmount),
                0,
              );

              const created = await tx.payout.create({
                data: {
                  shopId,
                  amount,
                  currency: 'BDT',
                  // No review state and no evidence: the payout was born
                  // COMPLETED. It is now created PENDING, awaiting a separate
                  // confirmation step (MONEY-61).
                  status: 'PENDING',
                  reference,
                  note: note ?? null,
                  processedBy: session.user.id,
                  items: {
                    create: items.map((item) => ({
                      orderItemId: item.id,
                      amount: Number(item.vendorAmount),
                      commission: Number(item.commissionAmount),
                    })),
                  },
                },
              });

              return { id: created.id, amount, count: items.length };
            });

            if (!result) {
              return Response.json(
                { error: 'No pending items for this shop' },
                { status: 400 },
              );
            }

            payout = { id: result.id };
            totalAmount = result.amount;
            itemCount = result.count;
          } catch (error) {
            if (isUniqueViolation(error)) {
              return Response.json(
                {
                  error:
                    'Another payout claimed some of these items. Reload and try again.',
                },
                { status: 409 },
              );
            }
            throw error;
          }

          const full = await prisma.payout.findUnique({
            where: { id: payout.id },
            include: {
              shop: { select: { id: true, name: true } },
              _count: { select: { items: true } },
            },
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role,
            action: 'PAYOUT_PROCESSED',
            entity: 'Payout',
            entityId: payout.id,
            details: {
              shopId,
              amount: totalAmount,
              itemCount,
              reference,
              status: 'PENDING',
            },
          }).catch((err) => logError('payout-audit-log', err as Error));

          sendEmail({
            to: shop.owner.email,
            subject: 'Payout queued',
            meta: {
              description: '',
              link: '',
              callToActionText: '',
            },
            html: payoutProcessedHtml(
              shop.name,
              totalAmount,
              itemCount,
              note ?? null,
            ),
            // biome-ignore lint/suspicious/noConsole: this is fine
          }).catch((err) => console.error('Failed to send payout email:', err));

          return Response.json({ payout: full }, { status: 201 });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
