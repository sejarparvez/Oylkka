import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import type { FulfillmentStatus } from '@/generated/prisma/enums';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type VendorOrderItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  productId: string;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  vendorAmount: number;
  fulfillmentStatus: FulfillmentStatus;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

type VendorOrderDetail = {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingUpzila: string;
  shippingDistrict: string;
  shippingPostalCode: string | null;
  shippingComment: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  paymentMethod: string | null;
  paymentStatus: string;
  orderStatus: string;
  items: VendorOrderItem[];
};

type FulfillPayload = {
  itemId: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
};

type FulfillResponse = {
  id: string;
  fulfillmentStatus: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

export function useVendorOrders(status?: string, search?: string) {
  return useQuery<VendorOrderItem[]>({
    queryKey: [QUERY_KEYS.VENDOR_ORDERS, 'list', status, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const qs = params.toString();
      const response = await apiClient.get<VendorOrderItem[]>(
        `/api/vendor/orders/list${qs ? `?${qs}` : ''}`,
      );
      return response.data;
    },
  });
}

export function useVendorOrderDetail(orderId: string) {
  return useQuery<VendorOrderDetail>({
    queryKey: [QUERY_KEYS.VENDOR_ORDERS, 'detail', orderId],
    queryFn: async () => {
      const response = await apiClient.get<VendorOrderDetail>(
        `/api/vendor/orders/${orderId}`,
      );
      return response.data;
    },
    enabled: !!orderId,
  });
}

export function useFulfillItemMutation(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation<FulfillResponse, Error, FulfillPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.put<FulfillResponse>(
        `/api/vendor/orders/${orderId}`,
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VENDOR_ORDERS],
      });
      toast.success('Fulfillment status updated');
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to fulfill item';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useCancelVendorOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: true },
    Error,
    { orderId: string; reason: string }
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.post<{ success: true }>(
        '/api/vendor/orders/cancel',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VENDOR_ORDERS],
      });
      toast.success('Order cancelled');
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to cancel order';
      toast.error(`Error: ${message}`);
    },
  });
}
