import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/vendor/payouts/pending')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const items = await prisma.orderItem.findMany({
            where: {
              shopId: shop.id,
              fulfillmentStatus: 'DELIVERED',
              payoutItem: null,
              order: {
                paymentStatus: 'PAID',
                NOT: {
                  status: 'REFUNDED',
                },
              },
            },
            select: {
              id: true,
              vendorAmount: true,
              commissionAmount: true,
            },
            take: 1000,
          });

          const totalPending = items.reduce(
            (sum, i) => sum + Number(i.vendorAmount),
            0,
          );
          const totalCommission = items.reduce(
            (sum, i) => sum + Number(i.commissionAmount),
            0,
          );

          return Response.json({
            pendingItems: items.length,
            totalPending,
            totalCommission,
          });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Failed to get pending',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
