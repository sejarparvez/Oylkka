import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

type SubscribePayload = {
  email: string;
  name?: string;
};

type SubscribeResponse = {
  message: string;
};

export function useSubscribeMutation() {
  return useMutation<SubscribeResponse, Error, SubscribePayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<SubscribeResponse>(
        '/api/newsletter/subscribe',
        payload,
      );
      return response.data;
    },
  });
}
