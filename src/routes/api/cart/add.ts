import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/cart/add')({
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
          const { productId, variantId, quantity } = body;

          const qty = Number(quantity);

          if (!productId || !Number.isInteger(qty) || qty < 1) {
            return Response.json(
              {
                error:
                  'Product ID and a whole-number quantity of at least 1 are required',
              },
              { status: 400 },
            );
          }

          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: {
              id: true,
              price: true,
              discountPrice: true,
              stock: true,
              hasVariants: true,
            },
          });

          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          if (product.hasVariants && !variantId) {
            return Response.json(
              { error: 'Variant selection is required for this product' },
              { status: 400 },
            );
          }

          // Availability and effective unit price. Simple products use parent
          // stock; variant products use variant stock net of bKash holds. The
          // parent-stock check must not run for variant products, otherwise a
          // product whose variants carry the real inventory (parent stock 0)
          // can never be added to the cart (MONEY-28, MONEY-29).
          let available: number;
          let savedPrice = product.discountPrice ?? product.price;

          if (variantId) {
            const variant = await prisma.productVariant.findUnique({
              where: { id: variantId },
              select: {
                id: true,
                stock: true,
                status: true,
                reservedStock: true,
                price: true,
                discountPrice: true,
              },
            });

            if (!variant) {
              return Response.json(
                { error: 'Variant not found' },
                { status: 404 },
              );
            }

            if (
              variant.status === 'DISABLED' ||
              variant.status === 'DISCONTINUED'
            ) {
              return Response.json(
                { error: 'Variant is not available' },
                { status: 400 },
              );
            }

            available = variant.stock - variant.reservedStock;
            savedPrice =
              variant.discountPrice ?? variant.price ?? savedPrice;
          } else {
            available = product.stock;
          }

          if (available < 1) {
            return Response.json(
              { error: 'Item is out of stock' },
              { status: 400 },
            );
          }

          let cart = await prisma.cart.findUnique({
            where: { userId: session.user.id },
          });

          if (!cart) {
            cart = await prisma.cart.create({
              data: { userId: session.user.id },
            });
          }

          const existingItem = await prisma.cartItem.findFirst({
            where: { cartId: cart.id, productId, variantId: variantId ?? null },
          });

          const requestedTotal = (existingItem?.quantity ?? 0) + qty;
          if (requestedTotal > available) {
            return Response.json(
              {
                error: `Only ${available} available${
                  existingItem
                    ? ` (${existingItem.quantity} already in cart)`
                    : ''
                }`,
              },
              { status: 400 },
            );
          }

          if (existingItem) {
            await prisma.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: requestedTotal },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: cart.id,
                productId,
                variantId: variantId ?? null,
                quantity: qty,
                savedPrice,
              },
            });
          }

          const updatedCart = await prisma.cart.findUnique({
            where: { id: cart.id },
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
                      images: {
                        take: 1,
                        orderBy: { order: 'asc' },
                        select: { imageUrl: true },
                      },
                      shop: {
                        select: { id: true, name: true, slug: true },
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

          return Response.json(
            { message: 'Added to cart', cart: updatedCart },
            { status: 200 },
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
