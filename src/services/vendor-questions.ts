import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type VendorQuestion = {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; productName: string; slug: string };
};

type VendorQuestionsResponse = {
  questions: VendorQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useVendorQuestions(page = 1) {
  return useQuery<VendorQuestionsResponse>({
    queryKey: [QUERY_KEYS.VENDOR_QUESTIONS, page],
    queryFn: async () => {
      const response = await apiClient.get<VendorQuestionsResponse>(
        '/api/vendor/questions',
        { params: { page, limit: 50 } },
      );
      return response.data;
    },
  });
}

export function useAnswerQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; answer: string | null; answeredAt: string | null },
    Error,
    { questionId: string; answer: string }
  >({
    mutationFn: async (payload) => {
      const response = await apiClient.post(
        '/api/product/answer-question',
        payload,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VENDOR_QUESTIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRODUCT_QUESTIONS],
      });
      toast.success('Answer posted');
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to post answer';
      toast.error(`Error: ${message}`);
    },
  });
}
