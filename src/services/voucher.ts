import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type VoucherCoupon = {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED' | 'CASHBACK';
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  minQuantity: number | null;
  freeShipping: boolean;
  shippingDiscount: number;
  scope: string;
  scopeId: string | null;
  autoApply: boolean;
  expiresAt: string | null;
};

export type UserVoucher = {
  id: string;
  couponId: string;
  collectedAt: string;
  usedAt: string | null;
  coupon: VoucherCoupon;
};

export type AutoApplyVoucher = Omit<
  VoucherCoupon,
  'autoApply' | 'expiresAt'
> & {
  isCollected: boolean;
};

export type ProductVoucher = Omit<VoucherCoupon, 'autoApply' | 'expiresAt'> & {
  isCollected: boolean;
};

export function useMyVouchers() {
  return useQuery<UserVoucher[]>({
    queryKey: [QUERY_KEYS.VOUCHERS, 'my'],
    queryFn: async () => {
      const response = await apiClient.get<{ vouchers: UserVoucher[] }>(
        '/api/vouchers/my',
      );
      return response.data.vouchers;
    },
  });
}

export function useCollectVoucher() {
  const queryClient = useQueryClient();

  return useMutation<{ success: true; voucher: UserVoucher }, Error, string>({
    mutationFn: async (couponId) => {
      const response = await apiClient.post<{
        success: true;
        voucher: UserVoucher;
      }>('/api/vouchers/collect', { couponId });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Voucher collected!');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VOUCHERS],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to collect voucher';
      toast.error(message);
    },
  });
}

export function useAutoApplyVouchers() {
  return useQuery<AutoApplyVoucher[]>({
    queryKey: [QUERY_KEYS.VOUCHERS, 'auto-apply'],
    queryFn: async () => {
      const response = await apiClient.get<{ vouchers: AutoApplyVoucher[] }>(
        '/api/vouchers/auto-apply',
      );
      return response.data.vouchers;
    },
  });
}

export function useProductVouchers(productId: string) {
  return useQuery<ProductVoucher[]>({
    queryKey: [QUERY_KEYS.VOUCHERS, 'product', productId],
    queryFn: async () => {
      const response = await apiClient.post<{ vouchers: ProductVoucher[] }>(
        '/api/vouchers/product-vouchers',
        { productId },
      );
      return response.data.vouchers;
    },
    enabled: !!productId,
  });
}
