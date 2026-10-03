import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/addresses/edit')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
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
            id,
            label,
            name,
            phone,
            address,
            upzila,
            district,
            postalCode,
            isDefault,
          } = body;

          if (!id) {
            return Response.json({ error: 'id required' }, { status: 400 });
          }

          const existing = await prisma.userAddress.findFirst({
            where: { id, userId: session.user.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Address not found' },
              { status: 404 },
            );
          }

          if (isDefault) {
            await prisma.userAddress.updateMany({
              where: { userId: session.user.id, id: { not: id } },
              data: { isDefault: false },
            });
          }

          const addr = await prisma.userAddress.update({
            where: { id },
            data: {
              ...(label && { label }),
              ...(name && { name }),
              ...(phone && { phone }),
              ...(address && { address }),
              ...(upzila && { upzila }),
              ...(district && { district }),
              ...(typeof postalCode === 'string' && { postalCode }),
              ...(typeof isDefault === 'boolean' && { isDefault }),
            },
          });
          return Response.json({ address: addr });
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
