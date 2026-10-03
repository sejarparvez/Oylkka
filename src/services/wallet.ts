import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import type { TransactionType } from '@/generated/prisma/enums';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type WalletTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  reference: string | null;
  orderId: string | null;
  description: string | null;
  createdAt: string;
};

type Wallet = {
  id: string;
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
};

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: [QUERY_KEYS.WALLET],
    queryFn: async () => {
      const response = await apiClient.get<Wallet>('/api/wallet/get');
      return response.data;
    },
  });
}

export function useTopUpMutation() {
  return useMutation<{ checkoutURL: string }, Error, number>({
    mutationFn: async (amount) => {
      const response = await apiClient.post<{ checkoutURL: string }>(
        '/api/wallet/top-up',
        { amount },
      );
      return response.data;
    },
    onMutate: () => {
      toast.loading('Starting top-up...', { id: 'wallet-topup' });
    },
    onSuccess: (data) => {
      toast.success('Redirecting to bKash...', { id: 'wallet-topup' });
      window.location.href = data.checkoutURL;
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to top up wallet';
      toast.error(message, { id: 'wallet-topup' });
    },
  });
}
