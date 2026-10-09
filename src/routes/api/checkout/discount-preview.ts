import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCheckoutSettings } from '@/services/checkout/platform-settings';
import { computeShippingEstimate } from '@/services/checkout/shipping';
import type {
  CartWithItems,
  VoucherWithCoupon,
} from '@/services/checkout/voucher-processor';
import {
  processVouchers,
  sumVoucherTotals,
} from '@/services/checkout/voucher-processor';

export const Route = createFileRoute('/api/checkout/discount-preview')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const body: {
            voucherIds: string[];
            paymentMethod: string;
            cart: CartWithItems;
            subtotal: number;
            shippingDistrict?: string | null;
          } = await request.json();

          // Zone-aware shipping estimate, matching the actual charge in
          // checkout/create.ts (MONEY-30).
          const shipping = await computeShippingEstimate(
            body.cart.items.map((item) => ({
              quantity: item.quantity,
              freeShipping: item.product.freeShipping,
              shop: item.product.shop,
              unitPrice: Number(
                item.variant?.discountPrice ??
                  item.variant?.price ??
                  item.product.discountPrice ??
                  item.product.price,
              ),
            })),
            body.shippingDistrict,
          );

          let totalDiscount = 0;
          let totalShippingDiscount = 0;
          let freeShipping = false;

          if (body.voucherIds?.length) {
            const customerOrderCount = await prisma.order.count({
              where: { customerId: session.user.id },
            });

            const userVouchers = await prisma.userVoucher.findMany({
              where: {
                id: { in: body.voucherIds },
                userId: session.user.id,
                usedAt: null,
              },
              include: {
                coupon: {
                  include: { tiers: { orderBy: { minQuantity: 'asc' } } },
                },
              },
            });

            const result = processVouchers(
              userVouchers as unknown as VoucherWithCoupon[],
              body.cart,
              body.subtotal,
              {
                paymentMethod: body.paymentMethod,
                customerOrderCount,
                userAgent: headers.get('user-agent') || undefined,
              },
            );

            const { totalCouponDiscount } = sumVoucherTotals(result);
            totalDiscount = Math.min(totalCouponDiscount, body.subtotal);
            totalShippingDiscount = result.reduce(
              (sum, v) => sum + v.shippingDiscount,
              0,
            );
            freeShipping = result.some((v) => v.freeShipping);
          }

          const settings = await getCheckoutSettings();

          return Response.json({
            // CONTENT-14: shipping is capped *after* discounts at order
            // creation (see create.ts). Return the uncapped base plus the cap
            // and let the client apply it once vouchers are subtracted.
            baseShipping: shipping.cost,
            maxShipping: settings.maxShipping,
            minOrderAmount: settings.minOrderAmount,
            totalDiscount,
            totalShippingDiscount,
            freeShipping,
            // Zone delivery estimate shown next to the shipping line (CUST-05).
            estDays: shipping.estDays,
            // Share the server tax rate so the client summary can show the
            // same tax it will be charged (MONEY-29b).
            taxRate: Number(process.env.TAX_RATE ?? 0) / 100,
          });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
