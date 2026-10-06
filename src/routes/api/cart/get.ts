import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { cartExpiry } from '@/lib/cart-cleanup';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/cart/get')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const cart = await prisma.cart.findUnique({
            where: { userId: session.user.id },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      productName: true,
                      slug: true,
                      price: true,
                      discountPrice: true,
                      stock: true,
                      hasVariants: true,
                      freeShipping: true,
                      categoryId: true,
                      images: {
                        take: 1,
                        orderBy: { order: 'asc' },
                        select: { imageUrl: true },
                      },
                      shop: {
                        select: {
                          id: true,
                          name: true,
                          slug: true,
                          shippingCost: true,
                        },
                      },
                    },
                  },
                  variant: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      discountPrice: true,
                      stock: true,
                      imageUrl: true,
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
          });

          if (!cart) {
            const newCart = await prisma.cart.create({
              data: { userId: session.user.id, expiresAt: cartExpiry() },
            });
            return Response.json({ ...newCart, items: [] }, { status: 200 });
          }

          return Response.json(cart, { status: 200 });
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
