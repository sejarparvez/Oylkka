import { createFileRoute } from '@tanstack/react-router';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/admin/content/save')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const { slug, title, content, published } = await request.json();
          if (!slug || !title || !content) {
            return Response.json(
              { error: 'slug, title, content required' },
              { status: 400 },
            );
          }
          const block = await prisma.contentBlock.upsert({
            where: { slug },
            create: { slug, title, content, published: !!published },
            update: { title, content, published: !!published },
          });
          return Response.json({ block });
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
