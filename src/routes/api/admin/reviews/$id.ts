import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

const ModerationStatusEnum = z.enum(['APPROVED', 'REJECTED', 'HIDDEN']);

const ModerationPayloadSchema = z
  .object({
    verified: z.boolean().optional(),
    reported: z.boolean().optional(),
    reviewedByAdmin: z.boolean().optional(),
    moderationStatus: ModerationStatusEnum.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'No moderation fields provided',
  });

function appendHistory(existing: unknown, entry: unknown): unknown[] {
  const base = Array.isArray(existing) ? existing : [];
  return [...base, entry];
}

export const Route = createFileRoute('/api/admin/reviews/$id')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const review = await prisma.review.findUnique({
            where: { id: params.id },
            include: {
              user: {
                select: { id: true, name: true, email: true, imageUrl: true },
              },
              product: {
                select: { id: true, productName: true, slug: true },
              },
              images: { orderBy: { order: 'asc' } },
            },
          });

          if (!review) {
            return Response.json(
              { error: 'Review not found' },
              { status: 404 },
            );
          }

          return Response.json({ review });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          // AUTH-09: authenticate through requireAuth so the per-actor admin
          // limiter applies to this mutating handler too.
          const headers = getRequestHeaders();
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;
          const roleResponse = requireAdminOrManager(session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.review.findUnique({
            where: { id: params.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Review not found' },
              { status: 404 },
            );
          }

          const body = await request.json();
          const parsed = ModerationPayloadSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid moderation payload' },
              { status: 400 },
            );
          }
          const { verified, reported, reviewedByAdmin, moderationStatus } =
            parsed.data;

          const historyEntry = {
            at: new Date().toISOString(),
            actorId: session.user.id,
            role: session.user.role,
            ...parsed.data,
          };

          const review = await prisma.review.update({
            where: { id: params.id },
            data: {
              ...(verified !== undefined && { verified }),
              ...(reported !== undefined && { reported }),
              ...(reviewedByAdmin !== undefined && { reviewedByAdmin }),
              ...(moderationStatus !== undefined && { moderationStatus }),
              moderationHistory: appendHistory(
                existing.moderationHistory,
                historyEntry,
              ),
            },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role as string,
            action: 'REVIEW_MODERATED',
            entity: 'Review',
            entityId: params.id,
            details: { changes: parsed.data },
            ipAddress: getClientIp(headers) ?? undefined,
          });

          return Response.json({ review });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ params }) => {
        try {
          // AUTH-09: authenticate through requireAuth so the admin limiter
          // applies to this mutating handler too.
          const headers = getRequestHeaders();
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;
          const roleResponse = requireAdminOrManager(session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.review.findUnique({
            where: { id: params.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Review not found' },
              { status: 404 },
            );
          }

          // Soft delete so a wrongly-removed review can be reinstated, and
          // remove its payload atomically (MONEY-48).
          await prisma.$transaction(async (tx) => {
            await tx.reviewImage.deleteMany({ where: { reviewId: params.id } });
            await tx.reviewHelpfulVote.deleteMany({
              where: { reviewId: params.id },
            });
            await tx.review.update({
              where: { id: params.id },
              data: {
                moderationStatus: 'REJECTED',
                reviewedByAdmin: true,
                moderationHistory: appendHistory(existing.moderationHistory, {
                  at: new Date().toISOString(),
                  actorId: session.user.id,
                  role: session.user.role,
                  action: 'deleted',
                }),
              },
            });
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role as string,
            action: 'REVIEW_MODERATED',
            entity: 'Review',
            entityId: params.id,
            details: { action: 'deleted' },
            ipAddress: getClientIp(headers) ?? undefined,
          });

          return Response.json({ success: true });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 },
          );
        }
      },
    },
  },
});
