import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type PayoutMethod = 'BANK' | 'BKASH' | 'NAGAD';

export type PayoutDetails = {
  payoutMethod: PayoutMethod | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  mobileNumber: string | null;
};

export type PayoutDetailsInput = {
  payoutMethod: PayoutMethod;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  mobileNumber?: string;
};

export function usePayoutDetails() {
  return useQuery<PayoutDetails>({
    queryKey: [QUERY_KEYS.PAYOUT_DETAILS],
    queryFn: async () => {
      const r = await apiClient.get<PayoutDetails>(
        '/api/vendor/shop/payout-details',
      );
      return r.data;
    },
  });
}

export function useUpdatePayoutDetailsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PayoutDetailsInput) => {
      const r = await apiClient.put<PayoutDetails>(
        '/api/vendor/shop/payout-details',
        data,
      );
      return r.data;
    },
    onMutate: () => {
      toast.loading('Saving payout details...', { id: 'save-payout-details' });
    },
    onSuccess: () => {
      toast.success('Payout details saved', { id: 'save-payout-details' });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PAYOUT_DETAILS],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to save payout details';
      toast.error(message, { id: 'save-payout-details' });
    },
  });
}
