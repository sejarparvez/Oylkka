import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/orders/list')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const url = new URL(request.url);
          const status = url.searchParams.get('status') || undefined;
          const search = url.searchParams.get('search') || undefined;

          // Bounded offset pagination (MONEY-52): the flat-array response shape
          // is preserved so existing consumers keep working; large lists can
          // still be fetched page by page.
          const limit = Math.min(
            Math.max(Number(url.searchParams.get('limit')) || 50, 1),
            100,
          );
          const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);

          const where: Record<string, unknown> = {
            customerId: session.user.id,
          };

          if (status) {
            where.status = status;
          }

          if (search) {
            where.orderNumber = { contains: search, mode: 'insensitive' };
          }

          const [orders, total] = await Promise.all([
            prisma.order.findMany({
              where,
              include: {
                items: {
                  take: 1,
                  select: { imageUrl: true },
                },
                _count: { select: { items: true } },
              },
              orderBy: { createdAt: 'desc' },
              skip: (page - 1) * limit,
              take: limit,
            }),
            prisma.order.count({ where }),
          ]);

          const data = orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            paymentStatus: o.paymentStatus,
            paymentMethod: o.paymentMethod,
            total: o.total,
            subtotal: o.subtotal,
            shippingCost: o.shippingCost,
            discountAmount: o.discountAmount,
            couponDiscount: o.couponDiscount,
            createdAt: o.createdAt.toISOString(),
            itemCount: o._count.items,
            firstItemImage: o.items[0]?.imageUrl ?? null,
            currency: o.currency,
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
