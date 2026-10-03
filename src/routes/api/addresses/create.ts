import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/addresses/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }
          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;
          const body = await request.json();
          const {
            label,
            name,
            phone,
            address,
            upzila,
            district,
            postalCode,
            isDefault,
          } = body;

          if (!name || !phone || !address || !upzila || !district) {
            return Response.json(
              { error: 'Required fields missing' },
              { status: 400 },
            );
          }

          if (isDefault) {
            await prisma.userAddress.updateMany({
              where: { userId: session.user.id },
              data: { isDefault: false },
            });
          }

          const addr = await prisma.userAddress.create({
            data: {
              userId: session.user.id,
              label: label || 'Home',
              name,
              phone,
              address,
              upzila,
              district,
              postalCode: postalCode || null,
              isDefault: !!isDefault,
            },
          });
          return Response.json({ address: addr }, { status: 201 });
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
