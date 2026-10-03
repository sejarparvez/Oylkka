import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/reviews/my/$id')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
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

          if (existing.userId !== session.user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }

          const body = await request.json();
          const { rating, title, content } = body;

          const review = await prisma.review.update({
            where: { id: params.id },
            data: {
              ...(rating !== undefined && { rating }),
              ...(title !== undefined && { title }),
              ...(content !== undefined && { content }),
            },
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

          if (!session?.user) {
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

          if (existing.userId !== session.user.id) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }

          await prisma.reviewImage.deleteMany({
            where: { reviewId: params.id },
          });
          await prisma.reviewHelpfulVote.deleteMany({
            where: { reviewId: params.id },
          });
          await prisma.review.delete({ where: { id: params.id } });

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
