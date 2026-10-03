import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { sendOrderConfirmation } from '@/actions/send-order-email';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { enqueueInvoiceGeneration } from '@/lib/invoice-queue';
import { checkoutLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import {
  decrementStock,
  decrementVariantStock,
  incrementStock,
  releaseReservedStock,
  reserveStock,
  StockError,
} from '@/lib/stock';
import { checkCouponEligibility } from '@/services/checkout/coupon-validator';
import type {
  CartWithItems,
  VoucherWithCoupon,
} from '@/services/checkout/voucher-processor';
import {
  applyShippingDiscounts,
  processVouchers,
  sumVoucherTotals,
} from '@/services/checkout/voucher-processor';
import type { OrderMetadata } from '@/types/orders';

class CheckoutError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'CheckoutError';
    this.status = status;
  }
}

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().substring(0, 8).toUpperCase();
  return `ORD-${ts}${rand}`;
}

const checkoutSchema = z.object({
  shippingName: z.string().min(1, 'Full name is required'),
  shippingEmail: z.string().email('Invalid email address'),
  shippingPhone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^(?:\+8801[3-9]\d{8}|01[3-9]\d{8})$/, 'Invalid BD phone number'),
  shippingAddress: z.string().min(1, 'Address is required'),
  shippingUpzila: z.string().min(1, 'Upzila / Thana is required'),
  shippingDistrict: z.string().min(1, 'District is required'),
  shippingPostalCode: z
    .string()
    .regex(/^\d{4}$/, 'Postal code must be 4 digits')
    .optional()
    .or(z.literal('')),
  shippingComment: z.string().optional(),
  paymentMethod: z.enum(['BKASH', 'CASH_ON_DELIVERY', 'WALLET']),
  voucherIds: z.array(z.string()).optional(),
  couponCode: z.string().trim().max(64).optional(),
});

export const Route = createFileRoute('/api/checkout/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const rateLimitResponse = await checkRateLimit(
            checkoutLimiter,
            `user:${session.user.id}`,
          );
          if (rateLimitResponse) return rateLimitResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();

          const parsed = checkoutSchema.safeParse(body);
          if (!parsed.success) {
            const firstError = parsed.error.issues[0];
            return Response.json(
              { error: firstError?.message || 'Invalid input' },
              { status: 400 },
            );
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
                      freeShipping: true,
                      images: {
                        take: 1,
                        orderBy: { order: 'asc' },
                        select: { imageUrl: true },
                      },
                      shop: {
                        select: {
                          id: true,
                          name: true,
                          commissionRate: true,
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
              },
            },
          });

          if (!cart || cart.items.length === 0) {
            return Response.json({ error: 'Cart is empty' }, { status: 400 });
          }

          // --- For bKash: reserve stock before proceeding (MONEY-22) ---
          // Variants reserve via ProductVariant.reservedStock. Simple
          // (non-variant) products reserve by directly decrementing
          // Product.stock, mirroring the COD/WALLET fulfilment path.
          const reservedVariants: Array<{
            variantId: string;
            quantity: number;
          }> = [];
          const reservedProducts: Array<{
            productId: string;
            quantity: number;
          }> = [];

          const restoreReservations = async () => {
            for (const r of reservedVariants) {
              await releaseReservedStock(
                prisma as unknown as Parameters<
                  typeof releaseReservedStock
                >[0],
                r.variantId,
                r.quantity,
              ).catch(() => {});
            }
            for (const r of reservedProducts) {
              await incrementStock(
                prisma as unknown as Parameters<typeof incrementStock>[0],
                r.productId,
                r.quantity,
              ).catch(() => {});
            }
          };

          if (parsed.data.paymentMethod === 'BKASH') {
            try {
              for (const item of cart.items) {
                if (item.variant) {
                  await reserveStock(
                    prisma as unknown as Parameters<typeof reserveStock>[0],
                    item.variant.id,
                    item.quantity,
                    item.variant.name,
                  );
                  reservedVariants.push({
                    variantId: item.variant.id,
                    quantity: item.quantity,
                  });
                } else {
                  await decrementStock(
                    prisma as unknown as Parameters<typeof decrementStock>[0],
                    item.product.id,
                    item.quantity,
                    item.product.productName,
                  );
                  reservedProducts.push({
                    productId: item.product.id,
                    quantity: item.quantity,
                  });
                }
              }
            } catch (error) {
              // Release any successfully reserved stock before bailing
              await restoreReservations();
              return Response.json(
                {
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Insufficient stock',
                },
                { status: 400 },
              );
            }
          }

          // --- Price re-validation: check if prices changed since adding to cart ---
          const priceChangedItems: string[] = [];
          for (const item of cart.items) {
            const currentPrice = Number(
              item.variant?.discountPrice ??
                item.variant?.price ??
                item.product.discountPrice ??
                item.product.price,
            );
            const savedPrice =
              item.savedPrice != null ? Number(item.savedPrice) : null;

            if (savedPrice != null && savedPrice !== currentPrice) {
              priceChangedItems.push(item.product.productName);
            }
          }

          if (priceChangedItems.length > 0) {
            // Release reserved stock for bKash
            if (parsed.data.paymentMethod === 'BKASH') {
              await restoreReservations();
            }
            return Response.json(
              {
                error: `Prices have changed for: ${priceChangedItems.join(', ')}. Please review your cart and try again.`,
                changedItems: priceChangedItems,
              },
              { status: 409 },
            );
          }

          // --- Calculate base pricing ---
          const orderNumber = generateOrderNumber();

          let subtotal = 0;
          let totalDiscount = 0;

          for (const item of cart.items) {
            const unitPrice = Number(
              item.variant?.discountPrice ??
                item.variant?.price ??
                item.product.discountPrice ??
                item.product.price,
            );
            const savedPrice =
              item.savedPrice != null ? Number(item.savedPrice) : unitPrice;
            const discount = unitPrice - savedPrice;

            subtotal += unitPrice * item.quantity;
            totalDiscount += discount * item.quantity;
          }

          // --- Shipping calculation (zone-aware) ---
          const shopShippingMap = new Map<
            string,
            {
              cost: number;
              hasNonFree: boolean;
              itemQty: number;
              shopSubtotal: number;
            }
          >();

          const shippingDistrict = parsed.data.shippingDistrict;

          for (const item of cart.items) {
            const shop = item.product.shop;
            const shopId = shop?.id;
            if (!shopId) continue;

            const unitPrice = Number(
              item.variant?.discountPrice ??
                item.variant?.price ??
                item.product.discountPrice ??
                item.product.price,
            );

            if (!shopShippingMap.has(shopId)) {
              shopShippingMap.set(shopId, {
                cost: Number(shop?.shippingCost ?? 0),
                hasNonFree: false,
                itemQty: 0,
                shopSubtotal: 0,
              });
            }

            // biome-ignore lint/style/noNonNullAssertion: this is fine
            const entry = shopShippingMap.get(shopId)!;
            entry.shopSubtotal += unitPrice * item.quantity;

            if (!item.product.freeShipping) {
              entry.hasNonFree = true;
              entry.itemQty += item.quantity;
            }
          }

          let baseShipping = 0;
          for (const [shopId, entry] of shopShippingMap) {
            if (entry.hasNonFree) {
              let cost = entry.cost;

              // Look up matching shipping zone for per-item + freeAbove
              if (shippingDistrict) {
                const zone = await prisma.shippingZone.findFirst({
                  where: {
                    shopId,
                    isActive: true,
                    districts: { some: { district: shippingDistrict } },
                  },
                  select: { baseCost: true, perItem: true, freeAbove: true },
                });

                if (zone) {
                  cost =
                    Number(zone.baseCost) +
                    Number(zone.perItem) * entry.itemQty;
                  if (
                    zone.freeAbove != null &&
                    entry.shopSubtotal >= Number(zone.freeAbove)
                  ) {
                    cost = 0;
                  }
                }
              }

              baseShipping += cost;
            }
          }

          // --- Voucher validation & application ---
          const customerOrderCount = await prisma.order.count({
            where: { customerId: session.user.id },
          });

          const now = new Date();

          // --- Resolve an explicit coupon code into a user voucher (MONEY-13) ---
          // The checkout page validates the code and shows a discount, but
          // previously never sent it to the server. Resolve it into the same
          // voucher pipeline so the charged total matches what was displayed.
          const voucherIdSet = new Set(parsed.data.voucherIds ?? []);
          let resolvedCouponId: string | null = null;

          if (parsed.data.couponCode) {
            const code = parsed.data.couponCode.trim().toUpperCase();
            const coupon = await prisma.coupon.findUnique({
              where: { code },
            });

            if (!coupon) {
              await restoreReservations();
              return Response.json(
                { error: 'Invalid coupon code' },
                { status: 400 },
              );
            }

            const totalQty = cart.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
            );

            const eligibilityError = checkCouponEligibility(
              {
                ...coupon,
                minOrderAmount: coupon.minOrderAmount
                  ? Number(coupon.minOrderAmount)
                  : null,
              } as unknown as Parameters<typeof checkCouponEligibility>[0],
              {
                now,
                subtotal,
                totalQty,
                cartItems: cart.items.map((item) => ({
                  productId: item.product.id,
                  quantity: item.quantity,
                  shopId: item.product.shop?.id,
                })),
                paymentMethod: parsed.data.paymentMethod,
                userAgent: headers.get('user-agent') || undefined,
                customerOrderCount,
              },
            );

            if (eligibilityError) {
              await restoreReservations();
              return Response.json(
                { error: eligibilityError },
                { status: 400 },
              );
            }

            const userVoucher = await prisma.userVoucher.upsert({
              where: {
                userId_couponId: {
                  userId: session.user.id,
                  couponId: coupon.id,
                },
              },
              update: {},
              create: {
                userId: session.user.id,
                couponId: coupon.id,
              },
            });

            if (userVoucher.usedAt) {
              await restoreReservations();
              return Response.json(
                { error: 'This coupon has already been used' },
                { status: 400 },
              );
            }

            resolvedCouponId = coupon.id;
            voucherIdSet.add(userVoucher.id);
          }

          const voucherIds = [...voucherIdSet];

          const selectedVouchers = voucherIds.length
            ? processVouchers(
                (await prisma.userVoucher.findMany({
                  where: {
                    id: { in: voucherIds },
                    userId: session.user.id,
                    usedAt: null,
                  },
                  include: {
                    coupon: {
                      include: { tiers: { orderBy: { minQuantity: 'asc' } } },
                    },
                  },
                })) as unknown as VoucherWithCoupon[],
                cart as unknown as CartWithItems,
                subtotal,
                {
                  paymentMethod: parsed.data.paymentMethod,
                  customerOrderCount,
                  userAgent: headers.get('user-agent') || undefined,
                },
              )
            : [];

          // A resolved coupon code must actually survive processing, otherwise
          // the customer would again be charged without their shown discount.
          if (
            resolvedCouponId &&
            !selectedVouchers.some((v) => v.couponId === resolvedCouponId)
          ) {
            await restoreReservations();
            return Response.json(
              {
                error:
                  'This coupon cannot be combined with your current cart or vouchers',
              },
              { status: 400 },
            );
          }

          // --- Apply shipping discounts ---
          const finalShipping = applyShippingDiscounts(
            selectedVouchers,
            baseShipping,
          );

          // --- Apply discount stacking ---
          const { totalCouponDiscount, totalCashback } =
            sumVoucherTotals(selectedVouchers);
          const cappedCouponDiscount = Math.min(totalCouponDiscount, subtotal);

          const taxRate = Number(process.env.TAX_RATE ?? 0) / 100;
          const tax =
            Math.round(
              (subtotal - totalDiscount - cappedCouponDiscount) * taxRate * 100,
            ) / 100;
          const total =
            subtotal -
            totalDiscount -
            cappedCouponDiscount +
            finalShipping +
            tax;

          // --- Create order in transaction ---
          const appliedVouchersData = selectedVouchers.map((v) => ({
            userVoucherId: v.id,
            couponId: v.couponId,
            code: v.code,
            discountAmount: v.discountAmount,
            shippingDiscount: v.shippingDiscount,
            freeShipping: v.freeShipping,
            cashbackAmount: v.cashbackAmount,
            scope: v.scope,
            scopeId: v.scopeId,
            tierUsed: v.tierUsed,
            bogoApplied: v.bogoApplied,
          }));

          try {
            const order = await prisma.$transaction(async (tx) => {
              const created = await tx.order.create({
                data: {
                  orderNumber,
                  customerId: session.user.id,
                  shippingName: parsed.data.shippingName,
                  shippingEmail: parsed.data.shippingEmail,
                  shippingPhone: parsed.data.shippingPhone,
                  shippingAddress: parsed.data.shippingAddress,
                  shippingUpzila: parsed.data.shippingUpzila,
                  shippingDistrict: parsed.data.shippingDistrict,
                  shippingPostalCode: parsed.data.shippingPostalCode ?? null,
                  shippingComment: parsed.data.shippingComment ?? null,
                  subtotal,
                  discountAmount: totalDiscount,
                  couponCode:
                    selectedVouchers.map((v) => v.code).join(',') || null,
                  couponDiscount:
                    cappedCouponDiscount > 0 ? cappedCouponDiscount : null,
                  shippingCost: finalShipping,
                  tax,
                  total,
                  currency: 'BDT',
                  paymentMethod: parsed.data.paymentMethod,
                  paymentStatus:
                    parsed.data.paymentMethod === 'WALLET' ? 'PAID' : 'PENDING',
                  paidAt:
                    parsed.data.paymentMethod === 'WALLET' ? new Date() : null,
                  status:
                    parsed.data.paymentMethod === 'CASH_ON_DELIVERY' ||
                    parsed.data.paymentMethod === 'WALLET'
                      ? 'CONFIRMED'
                      : 'PENDING',
                  confirmedAt:
                    parsed.data.paymentMethod === 'CASH_ON_DELIVERY' ||
                    parsed.data.paymentMethod === 'WALLET'
                      ? new Date()
                      : null,
                  metadata: {
                    appliedVouchers: appliedVouchersData,
                    cashbackAmount: totalCashback,
                  } as unknown as OrderMetadata,
                  items: {
                    create: cart.items.map((item) => {
                      const unitPrice = Number(
                        item.variant?.discountPrice ??
                          item.variant?.price ??
                          item.product.discountPrice ??
                          item.product.price,
                      );
                      const savedPrice =
                        item.savedPrice != null
                          ? Number(item.savedPrice)
                          : unitPrice;
                      const discountPrice =
                        savedPrice < unitPrice ? savedPrice : null;
                      const lineTotal = savedPrice * item.quantity;
                      const commissionRate = Number(
                        item.product.shop?.commissionRate ?? 10,
                      );
                      const commissionAmount =
                        (lineTotal * commissionRate) / 100;
                      const vendorAmount = lineTotal - commissionAmount;

                      return {
                        shopId: item.product.shop?.id ?? '',
                        productId: item.product.id,
                        variantId: item.variant?.id ?? null,
                        productName: item.product.productName,
                        variantName: item.variant?.name ?? null,
                        imageUrl:
                          item.product.images[0]?.imageUrl ??
                          item.variant?.imageUrl ??
                          null,
                        quantity: item.quantity,
                        unitPrice,
                        discountPrice,
                        total: lineTotal,
                        commissionRate,
                        commissionAmount,
                        vendorAmount,
                      };
                    }),
                  },
                },
                include: { items: true },
              });

              // For COD and WALLET: immediate side effects (stock, cart, vouchers, cashback)
              // For BKASH these happen after payment confirmation in bkash-callback.ts
              if (
                parsed.data.paymentMethod === 'CASH_ON_DELIVERY' ||
                parsed.data.paymentMethod === 'WALLET'
              ) {
                // Wallet payment: atomic balance check + debit (race-condition-safe)
                if (parsed.data.paymentMethod === 'WALLET') {
                  const result = await tx.wallet.updateMany({
                    where: { userId: session.user.id, balance: { gte: total } },
                    data: { balance: { decrement: total } },
                  });

                  if (result.count === 0) {
                    const wallet = await tx.wallet.findUnique({
                      where: { userId: session.user.id },
                    });
                    const balance = wallet?.balance ?? 0;
                    throw new CheckoutError(
                      `Insufficient wallet balance. Your balance: ৳${Number(balance).toFixed(2)}, required: ৳${Number(total).toFixed(2)}`,
                      400,
                    );
                  }

                  const wallet = await tx.wallet.findUnique({
                    where: { userId: session.user.id },
                  });

                  if (!wallet)
                    throw new CheckoutError(
                      'Wallet not found after debit',
                      500,
                    );

                  await tx.walletTransaction.create({
                    data: {
                      walletId: wallet.id,
                      type: 'DEBIT',
                      amount: total,
                      reference: 'ORDER_PAYMENT',
                      orderId: created.id,
                      description: `Payment for order ${orderNumber}`,
                    },
                  });
                }

                // Atomic stock decrement (race-condition-safe)
                for (const item of cart.items) {
                  await decrementStock(
                    tx,
                    item.product.id,
                    item.quantity,
                    item.product.productName,
                  );

                  if (item.variant) {
                    await decrementVariantStock(
                      tx,
                      item.variant.id,
                      item.quantity,
                      item.variant.name,
                    );
                  }
                }

                // Clear cart
                await tx.cartItem.deleteMany({
                  where: { cartId: cart.id },
                });

                // Create CouponUsage + mark UserVoucher used
                for (const v of selectedVouchers) {
                  await tx.couponUsage.create({
                    data: {
                      couponId: v.couponId,
                      userId: session.user.id,
                      orderId: created.id,
                    },
                  });

                  await tx.coupon.update({
                    where: { id: v.couponId },
                    data: { usedCount: { increment: 1 } },
                  });

                  await tx.userVoucher.update({
                    where: { id: v.id },
                    data: { usedAt: now, orderId: created.id },
                  });
                }

                // Handle cashback. Only credit it once the order is actually
                // paid; crediting at creation for COD is a repeatable
                // cashback-farming vector (MONEY-23). WALLET is paid here.
                if (
                  parsed.data.paymentMethod === 'WALLET' &&
                  totalCashback > 0
                ) {
                  let wallet = await tx.wallet.findUnique({
                    where: { userId: session.user.id },
                  });

                  if (!wallet) {
                    wallet = await tx.wallet.create({
                      data: { userId: session.user.id },
                    });
                  }

                  await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balance: { increment: totalCashback } },
                  });

                  await tx.walletTransaction.create({
                    data: {
                      walletId: wallet.id,
                      type: 'CREDIT',
                      amount: totalCashback,
                      reference: 'CASHBACK',
                      orderId: created.id,
                      description: `Cashback from vouchers: ${selectedVouchers.map((v) => v.code).join(', ')}`,
                    },
                  });
                }
              }

              return created;
            });

            // Fire-and-forget: send order confirmation email + generate invoice for confirmed orders
            if (
              parsed.data.paymentMethod === 'CASH_ON_DELIVERY' ||
              parsed.data.paymentMethod === 'WALLET'
            ) {
              Promise.all([
                sendOrderConfirmation(order.id).catch((e) => {
                  // biome-ignore lint/suspicious/noConsole: this is fine
                  console.error('Failed to send order confirmation:', e);
                }),
                enqueueInvoiceGeneration(order.id).catch((e) => {
                  // biome-ignore lint/suspicious/noConsole: this is fine
                  console.error('Failed to enqueue invoice generation:', e);
                }),
              ]);
            }

            return Response.json(
              {
                orderId: order.id,
                orderNumber: order.orderNumber,
                total: Number(order.total),
                subtotal: Number(order.subtotal),
                discountAmount: Number(order.discountAmount),
                couponDiscount: Number(order.couponDiscount),
                shippingCost: Number(order.shippingCost),
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                status: order.status,
                appliedVouchers: selectedVouchers.map((v) => ({
                  code: v.code,
                  discountAmount: v.discountAmount,
                  shippingDiscount: v.shippingDiscount,
                  freeShipping: v.freeShipping,
                  cashbackAmount: v.cashbackAmount,
                })),
              },
              { status: 200 },
            );
          } catch (error) {
            // On failure, release reserved stock for bKash
            if (parsed.data.paymentMethod === 'BKASH') {
              await restoreReservations();
            }

            if (error instanceof CheckoutError) {
              return Response.json(
                { error: error.message },
                { status: error.status },
              );
            }

            if (error instanceof StockError) {
              return Response.json(
                { error: error.message },
                { status: 400 },
              );
            }

            return Response.json(
              { error: 'Failed to place order. Please try again.' },
              { status: 500 },
            );
          }
        } catch (_error) {
          return Response.json(
            { error: 'Failed to place order. Please try again.' },
            { status: 500 },
          );
        }
      },
    },
  },
});
