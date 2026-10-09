import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';
import { newsletterLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Route = createFileRoute('/api/newsletter/subscribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rateLimitResponse = await checkRateLimit(newsletterLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const body: { email?: unknown; name?: unknown } = await request
            .json()
            .catch(() => ({}));

          const email =
            typeof body.email === 'string'
              ? body.email.trim().toLowerCase()
              : '';
          const name =
            typeof body.name === 'string' && body.name.trim()
              ? body.name.trim()
              : undefined;

          if (!email || !EMAIL_REGEX.test(email)) {
            return Response.json(
              { error: 'A valid email address is required' },
              { status: 400 },
            );
          }

          await prisma.subscriber.upsert({
            where: { email },
            update: {
              status: 'ACTIVE',
              name: name ?? undefined,
            },
            create: {
              email,
              name,
              source: 'footer',
              status: 'ACTIVE',
            },
          });

          return Response.json(
            { message: 'Subscribed successfully' },
            { status: 201 },
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
