import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export type ContactPayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
};

type ContactResponse = {
  message: string;
  id: string;
};

/** CONTENT-02: submit the public contact form (persisted server-side). */
export function useContactMutation() {
  return useMutation<ContactResponse, Error, ContactPayload>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<ContactResponse>(
        '/api/contact',
        payload,
      );
      return response.data;
    },
  });
}
