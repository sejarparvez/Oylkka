import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Lightweight count for the header badge (CUST-14): messages someone else
// sent that the customer has not opened yet.
export const Route = createFileRoute('/api/conversations/unread')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const unreadCount = await prisma.message.count({
            where: {
              conversation: { customerId: session.user.id },
              senderId: { not: session.user.id },
              isRead: false,
            },
          });

          return Response.json({ unreadCount }, { status: 200 });
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
