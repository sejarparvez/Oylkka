import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { cartExpiry } from '@/lib/cart-cleanup';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

/** Raised when an add would push the merged line past what is purchasable. */
class StockUnavailableError extends Error {
  constructor(
    readonly available: number,
    readonly existingQuantity: number,
  ) {
    super('Requested quantity exceeds available stock');
    this.name = 'StockUnavailableError';
  }
}

/** Prisma's unique-constraint failure, which now means a concurrent add won. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

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
            savedPrice = variant.discountPrice ?? variant.price ?? savedPrice;
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
              data: { userId: session.user.id, expiresAt: cartExpiry() },
            });
          }

          try {
            // Upsert rather than findFirst + create: that pair is
            // check-then-act, so two concurrent adds both saw "no existing
            // line" and each inserted one, duplicating the cart line
            // (MONEY-37). The unique (cartId, productId, variantKey) index
            // makes the merge atomic.
            //
            // Availability is verified *after* the write and throws to roll the
            // whole transaction back, so the check cannot be lost to the same
            // race we just removed.
            await prisma.$transaction(async (tx) => {
              const row = await tx.cartItem.upsert({
                where: {
                  cartId_productId_variantKey: {
                    cartId: cart.id,
                    productId,
                    variantKey: variantId ?? '',
                  },
                },
                create: {
                  cartId: cart.id,
                  productId,
                  variantId: variantId ?? null,
                  variantKey: variantId ?? '',
                  quantity: qty,
                  savedPrice,
                },
                update: { quantity: { increment: qty }, savedPrice },
                select: { quantity: true },
              });

              if (row.quantity > available) {
                throw new StockUnavailableError(available, row.quantity - qty);
              }

              return row.quantity;
            });
          } catch (error) {
            if (error instanceof StockUnavailableError) {
              return Response.json(
                {
                  error: `Only ${error.available} available${
                    error.existingQuantity > 0
                      ? ` (${error.existingQuantity} already in cart)`
                      : ''
                  }`,
                },
                { status: 400 },
              );
            }

            if (isUniqueViolation(error)) {
              return Response.json(
                {
                  error:
                    'Cart changed while adding this item. Please try again.',
                },
                { status: 409 },
              );
            }

            throw error;
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
