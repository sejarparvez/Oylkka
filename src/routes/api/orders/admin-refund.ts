import { createFileRoute } from '@tanstack/react-router';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { refundBkashPayment } from '@/lib/bkash';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { orderRefundHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';
import type { OrderMetadata } from '@/types/orders';

class RefundConflictError extends Error {
  constructor() {
    super('Refund was modified by another request');
    this.name = 'RefundConflictError';
  }
}

export const Route = createFileRoute('/api/orders/admin-refund')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body: {
            orderId: string;
            amount: number;
            reason: string;
            itemIds?: string[];
          } = await request.json();

          if (!body.orderId) {
            return Response.json(
              { error: 'orderId is required' },
              { status: 400 },
            );
          }

          if (!body.amount || body.amount <= 0) {
            return Response.json(
              { error: 'Refund amount must be greater than 0' },
              { status: 400 },
            );
          }

          if (!body.reason?.trim()) {
            return Response.json(
              { error: 'Refund reason is required' },
              { status: 400 },
            );
          }

          const order = await prisma.order.findUnique({
            where: { id: body.orderId },
            include: { items: true },
          });

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }

          if (order.paymentStatus === 'REFUNDED') {
            return Response.json(
              { error: 'Order has already been fully refunded' },
              { status: 400 },
            );
          }

          if (body.itemIds && body.itemIds.length > 0) {
            const orderItemIds = new Set(order.items.map((i) => i.id));
            const invalid = body.itemIds.filter((id) => !orderItemIds.has(id));
            if (invalid.length > 0) {
              return Response.json(
                { error: 'One or more itemIds do not belong to this order' },
                { status: 400 },
              );
            }
          }

          const alreadyRefunded = Number(order.refundAmount ?? 0);
          const totalRefunded = alreadyRefunded + body.amount;

          if (totalRefunded > Number(order.total)) {
            return Response.json(
              {
                error: `Refund amount exceeds order total. Already refunded: ৳${alreadyRefunded.toFixed(2)}, remaining: ৳${(Number(order.total) - alreadyRefunded).toFixed(2)}`,
              },
              { status: 400 },
            );
          }

          const isPartial = totalRefunded < Number(order.total);
          const newPaymentStatus = isPartial
            ? 'PARTIALLY_REFUNDED'
            : 'REFUNDED';

          // Only orders that actually captured money may trigger a
          // monetary refund. PENDING / FAILED / CANCELLED must never mint
          // wallet balance or call the gateway.
          const wasPaid =
            order.paymentStatus === 'PAID' ||
            order.paymentStatus === 'PARTIALLY_REFUNDED';

          // Update the order and items in a transaction
          // For bKash orders, capture payment info before transaction
          const bkashRefundInfo =
            order.paymentMethod === 'BKASH' && wasPaid
              ? {
                  metadata: order.metadata as OrderMetadata | null,
                  paymentRef: order.paymentRef,
                }
              : null;

          const updated = await prisma.$transaction(async (tx) => {
            // Optimistic concurrency guard: only one concurrent refund may
            // claim the order at a time. If another request already moved
            // `refundAmount`, `count` is 0 and we abort without side effects.
            const claimed = await tx.order.updateMany({
              where: {
                id: body.orderId,
                refundAmount: order.refundAmount,
                paymentStatus: { not: 'REFUNDED' },
              },
              data: {
                paymentStatus: newPaymentStatus,
                refundAmount: totalRefunded,
                refundReason: body.reason,
                refundedAt: new Date(),
                ...(totalRefunded >= Number(order.total)
                  ? { status: 'REFUNDED' }
                  : {}),
              },
            });

            if (claimed.count === 0) {
              throw new RefundConflictError();
            }

            // Wallet refund: credit inside transaction (atomic with order update)
            if (order.paymentMethod === 'WALLET' && wasPaid) {
              let wallet = await tx.wallet.findUnique({
                where: { userId: order.customerId },
              });

              if (!wallet) {
                wallet = await tx.wallet.create({
                  data: { userId: order.customerId },
                });
              }

              await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: { increment: body.amount } },
              });

              await tx.walletTransaction.create({
                data: {
                  walletId: wallet.id,
                  type: 'CREDIT',
                  amount: body.amount,
                  reference: 'REFUND',
                  orderId: order.id,
                  description: `Refund for order ${order.orderNumber}: ${body.reason}`,
                },
              });
            }

            // Only ever touch items that belong to this order and have not
            // already been refunded — prevents cross-order edits (MONEY-08)
            // and double restocking on repeated partial refunds (MONEY-09).
            const refundedIds = new Set(
              order.items
                .filter((i) => i.fulfillmentStatus === 'REFUNDED')
                .map((i) => i.id),
            );

            let itemsToRefund: typeof order.items;
            if (body.itemIds && body.itemIds.length > 0) {
              const requested = new Set(body.itemIds);
              itemsToRefund = order.items.filter(
                (i) => requested.has(i.id) && !refundedIds.has(i.id),
              );
            } else if (totalRefunded >= Number(order.total)) {
              itemsToRefund = order.items.filter(
                (i) => !refundedIds.has(i.id),
              );
            } else {
              // Partial refund with no item scope: no safe way to know which
              // items were refunded, so restore nothing.
              itemsToRefund = [];
            }

            for (const item of itemsToRefund) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });

              if (item.variantId) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: { increment: item.quantity } },
                });
              }
            }

            if (itemsToRefund.length > 0) {
              await tx.orderItem.updateMany({
                where: {
                  id: { in: itemsToRefund.map((i) => i.id) },
                  orderId: body.orderId,
                },
                data: { fulfillmentStatus: 'REFUNDED' },
              });
            }

            return tx.order.findUniqueOrThrow({
              where: { id: body.orderId },
              include: {
                items: {
                  include: { shop: { select: { name: true } } },
                },
              },
            });
          });

          // bKash refund: process AFTER transaction succeeds (avoids charging card without DB update)
          if (bkashRefundInfo) {
            const metadata = bkashRefundInfo.metadata;
            const bkashPaymentID = metadata?.bkashPaymentID;
            const bkashTrxID = metadata?.bkashTrxID;
            const paymentRef = bkashRefundInfo.paymentRef;

            if (bkashPaymentID && (bkashTrxID || paymentRef)) {
              const refundResult = await refundBkashPayment({
                paymentID: bkashPaymentID,
                trxID: (bkashTrxID || paymentRef) as string,
                amount: body.amount,
                reason: body.reason,
              });

              // Persist the gateway refund reference so a later refund can
              // be reconciled and duplicates detected.
              if (refundResult?.refundTrxID) {
                const persisted = await prisma.order.update({
                  where: { id: body.orderId },
                  data: {
                    metadata: {
                      ...((bkashRefundInfo.metadata ?? {}) as OrderMetadata),
                      bkashRefundTrxID: refundResult.refundTrxID,
                    },
                  },
                });
                updated.metadata = persisted.metadata;
              }
            }
          }

          const metadata = updated.metadata as OrderMetadata | null;

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'ADMIN',
            action: 'ORDER_REFUNDED',
            entity: 'Order',
            entityId: body.orderId,
            ipAddress: getClientIp(request.headers) ?? undefined,
            details: {
              amount: body.amount,
              reason: body.reason,
              itemIds: body.itemIds,
              orderNumber: order.orderNumber,
            },
            // biome-ignore lint/suspicious/noConsole: this is fine
          }).catch((err) => console.error('Failed to create audit log:', err));

          sendEmail({
            to: order.shippingEmail,
            subject: `Refund Processed — #${order.orderNumber}`,
            meta: {
              description: '',
              link: '',
              callToActionText: '',
            },
            html: orderRefundHtml(
              {
                orderNumber: order.orderNumber,
                customerName: order.shippingName,
              },
              body.amount,
              body.reason,
              order.paymentMethod || 'CASH_ON_DELIVERY',
            ),
            // biome-ignore lint/suspicious/noConsole: this is fine
          }).catch((err) => console.error('Failed to send refund email:', err));

          return Response.json(
            {
              id: updated.id,
              orderNumber: updated.orderNumber,
              status: updated.status,
              paymentStatus: updated.paymentStatus,
              paymentMethod: updated.paymentMethod,
              paymentRef: updated.paymentRef,
              total: Number(updated.total),
              subtotal: Number(updated.subtotal),
              shippingCost: Number(updated.shippingCost),
              discountAmount: Number(updated.discountAmount),
              couponDiscount: Number(updated.couponDiscount),
              couponCode: updated.couponCode,
              customerId: updated.customerId,
              shippingName: updated.shippingName,
              shippingEmail: updated.shippingEmail,
              shippingPhone: updated.shippingPhone,
              shippingAddress: updated.shippingAddress,
              shippingUpzila: updated.shippingUpzila,
              shippingDistrict: updated.shippingDistrict,
              shippingPostalCode: updated.shippingPostalCode,
              shippingComment: updated.shippingComment,
              createdAt: updated.createdAt.toISOString(),
              confirmedAt: updated.confirmedAt?.toISOString() ?? null,
              paidAt: updated.paidAt?.toISOString() ?? null,
              cancelledAt: updated.cancelledAt?.toISOString() ?? null,
              cancelledBy: updated.cancelledBy,
              cancellationReason: updated.cancellationReason,
              refundAmount: Number(updated.refundAmount),
              refundReason: updated.refundReason,
              refundedAt: updated.refundedAt?.toISOString() ?? null,
              currency: updated.currency,
              bkashPaymentID: (metadata?.bkashPaymentID as string) ?? null,
              bkashTrxID: (metadata?.bkashTrxID as string) ?? null,
              items: updated.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                variantName: item.variantName,
                imageUrl: item.imageUrl,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                discountPrice: item.discountPrice
                  ? Number(item.discountPrice)
                  : null,
                total: Number(item.total),
                fulfillmentStatus: item.fulfillmentStatus,
                trackingNumber: item.trackingNumber,
                trackingUrl: item.trackingUrl,
                shippedAt: item.shippedAt?.toISOString() ?? null,
                deliveredAt: item.deliveredAt?.toISOString() ?? null,
                shopId: item.shopId,
                shopName: item.shop.name,
              })),
            },
            { status: 200 },
          );
        } catch (error) {
          if (error instanceof RefundConflictError) {
            return Response.json(
              {
                error:
                  'Order was refunded by another request. Refresh and try again.',
              },
              { status: 409 },
            );
          }
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
