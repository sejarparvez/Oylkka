import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/vendor/orders/list')({
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
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          const url = new URL(request.url);
          const status = url.searchParams.get('status') || undefined;
          const search = url.searchParams.get('search') || undefined;

          // Bounded offset pagination (MONEY-52); flat-array shape preserved.
          const limit = Math.min(
            Math.max(Number(url.searchParams.get('limit')) || 50, 1),
            100,
          );
          const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);

          const where: Record<string, unknown> = {
            shopId: shop.id,
          };

          if (status) {
            if (status === 'CONFIRMED') {
              // `CONFIRMED` is an OrderStatus, not a FulfillmentStatus.
              // A confirmed order is one that is paid but not yet processed,
              // which at the item level is `PENDING` on a PAID order (DATA-14).
              where.fulfillmentStatus = 'PENDING';
              where.order = { paymentStatus: 'PAID' };
            } else {
              where.fulfillmentStatus = status;
            }
          }

          if (search) {
            where.OR = [
              {
                order: {
                  orderNumber: { contains: search, mode: 'insensitive' },
                },
              },
              { productName: { contains: search, mode: 'insensitive' } },
            ];
          }

          const [items, total] = await Promise.all([
            prisma.orderItem.findMany({
              where,
              include: {
                order: {
                  select: {
                    id: true,
                    orderNumber: true,
                    createdAt: true,
                    shippingName: true,
                    shippingPhone: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.orderItem.count({ where }),
          ]);

          const data = items.map((item) => ({
            id: item.id,
            orderId: item.orderId,
            orderNumber: item.order.orderNumber,
            orderDate: item.order.createdAt.toISOString(),
            customerName: item.order.shippingName,
            customerPhone: item.order.shippingPhone,
            productId: item.productId,
            productName: item.productName,
            variantName: item.variantName,
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            commissionRate: item.commissionRate,
            commissionAmount: item.commissionAmount,
            vendorAmount: item.vendorAmount,
            fulfillmentStatus: item.fulfillmentStatus,
            trackingNumber: item.trackingNumber,
            trackingUrl: item.trackingUrl,
            shippedAt: item.shippedAt?.toISOString() ?? null,
            deliveredAt: item.deliveredAt?.toISOString() ?? null,
          }));

          return Response.json(data, {
            status: 200,
            headers: { 'X-Total-Count': String(total) },
          });
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
