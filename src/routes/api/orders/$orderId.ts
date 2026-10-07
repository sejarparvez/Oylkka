import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/orders/$orderId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const { orderId } = params;

          const order = await prisma.order.findFirst({
            where: { id: orderId, customerId: session.user.id },
            include: {
              items: {
                select: {
                  id: true,
                  productId: true,
                  productName: true,
                  variantName: true,
                  imageUrl: true,
                  quantity: true,
                  unitPrice: true,
                  discountPrice: true,
                  total: true,
                  fulfillmentStatus: true,
                  shopId: true,
                  shop: { select: { id: true, name: true } },
                  trackingNumber: true,
                  trackingUrl: true,
                  shippedAt: true,
                  deliveredAt: true,
                },
              },
              invoice: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  pdfUrl: true,
                  createdAt: true,
                },
              },
            },
          });

          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
          }

          const data = {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            total: order.total,
            subtotal: order.subtotal,
            shippingCost: order.shippingCost,
            tax: order.tax,
            discountAmount: order.discountAmount,
            couponDiscount: order.couponDiscount,
            couponCode: order.couponCode,
            shippingName: order.shippingName,
            shippingEmail: order.shippingEmail,
            shippingPhone: order.shippingPhone,
            shippingAddress: order.shippingAddress,
            shippingUpzila: order.shippingUpzila,
            shippingDistrict: order.shippingDistrict,
            shippingPostalCode: order.shippingPostalCode,
            shippingComment: order.shippingComment,
            createdAt: order.createdAt.toISOString(),
            confirmedAt: order.confirmedAt?.toISOString() ?? null,
            paidAt: order.paidAt?.toISOString() ?? null,
            cancelledAt: order.cancelledAt?.toISOString() ?? null,
            cancellationReason: order.cancellationReason,
            refundAmount: order.refundAmount,
            refundReason: order.refundReason,
            currency: order.currency,
            invoice: order.invoice
              ? {
                  id: order.invoice.id,
                  invoiceNumber: order.invoice.invoiceNumber,
                  pdfUrl: order.invoice.pdfUrl,
                  createdAt: order.invoice.createdAt.toISOString(),
                }
              : null,
            items: order.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              variantName: item.variantName,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPrice: item.discountPrice,
              total: item.total,
              fulfillmentStatus: item.fulfillmentStatus,
              shopId: item.shopId,
              shopName: item.shop?.name ?? null,
              trackingNumber: item.trackingNumber,
              trackingUrl: item.trackingUrl,
              shippedAt: item.shippedAt?.toISOString() ?? null,
              deliveredAt: item.deliveredAt?.toISOString() ?? null,
            })),
          };

          return Response.json(data, { status: 200 });
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
