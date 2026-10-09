import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/vendor/questions')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
            select: { id: true },
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const url = new URL(request.url);
          const limit = Math.min(
            Math.max(Number(url.searchParams.get('limit')) || 50, 1),
            100,
          );
          const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);

          const where = { product: { shopId: shop.id } };

          const [questions, total] = await Promise.all([
            prisma.productQuestion.findMany({
              where,
              select: {
                id: true,
                question: true,
                answer: true,
                answeredAt: true,
                createdAt: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
                product: {
                  select: { id: true, productName: true, slug: true },
                },
              },
              orderBy: [
                { answeredAt: { sort: 'asc', nulls: 'first' } },
                { createdAt: 'desc' },
              ],
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.productQuestion.count({ where }),
          ]);

          return Response.json(
            {
              questions: questions.map((q) => ({
                id: q.id,
                question: q.question,
                answer: q.answer,
                answeredAt: q.answeredAt?.toISOString() ?? null,
                createdAt: q.createdAt.toISOString(),
                user: q.user,
                product: q.product,
              })),
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit),
            },
            { status: 200 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
