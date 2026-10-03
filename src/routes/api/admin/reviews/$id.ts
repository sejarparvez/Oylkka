import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { auth } from '@/lib/auth';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

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
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (
            !session?.user ||
            (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
          ) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

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
          const { verified, reported, reviewedByAdmin } = body;

          const review = await prisma.review.update({
            where: { id: params.id },
            data: {
              ...(verified !== undefined && { verified }),
              ...(reported !== undefined && { reported }),
              ...(reviewedByAdmin !== undefined && { reviewedByAdmin }),
            },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role,
            action: 'REVIEW_MODERATED',
            entity: 'Review',
            entityId: params.id,
            details: { changes: body },
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
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (
            !session?.user ||
            (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')
          ) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

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

          await prisma.reviewImage.deleteMany({
            where: { reviewId: params.id },
          });
          await prisma.reviewHelpfulVote.deleteMany({
            where: { reviewId: params.id },
          });
          await prisma.review.delete({ where: { id: params.id } });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role,
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
