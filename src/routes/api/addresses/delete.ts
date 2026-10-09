import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { promoteDefaultAddress } from '@/lib/address-validation';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/addresses/delete')({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }
          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;
          const url = new URL(request.url);
          const id = url.searchParams.get('id');
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
          const wasDefault = existing.isDefault;
          await prisma.userAddress.delete({ where: { id } });

          // Deleting the default address must not leave the account with zero
          // defaults (MONEY-57).
          if (wasDefault) {
            await promoteDefaultAddress(session.user.id);
          }

          return Response.json({ message: 'Address deleted' });
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
