import { useQuery } from '@tanstack/react-query';
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/generated/prisma/enums';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  total: number;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  couponDiscount: number | null;
  createdAt: string;
  itemCount: number;
  firstItemImage: string | null;
  currency: string;
};

type OrderItemDetail = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  discountPrice: number | null;
  total: number;
  fulfillmentStatus: FulfillmentStatus;
  shopId: string;
  shopName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  total: number;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  couponDiscount: number | null;
  couponCode: string | null;
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingUpzila: string;
  shippingDistrict: string;
  shippingPostalCode: string | null;
  shippingComment: string | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    pdfUrl: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  confirmedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  currency: string;
  items: OrderItemDetail[];
};

export function useMyOrders(status?: string, search?: string) {
  return useQuery<OrderListItem[]>({
    queryKey: [QUERY_KEYS.ORDERS, 'my-orders', status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const qs = params.toString();
      const response = await apiClient.get<OrderListItem[]>(
        `/api/orders/list${qs ? `?${qs}` : ''}`,
      );
      return response.data;
    },
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery<OrderDetail>({
    queryKey: [QUERY_KEYS.ORDERS, 'detail', orderId],
    queryFn: async () => {
      const response = await apiClient.get<OrderDetail>(
        `/api/orders/${orderId}`,
      );
      return response.data;
    },
    enabled: !!orderId,
  });
}
