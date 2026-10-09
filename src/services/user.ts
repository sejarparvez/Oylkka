import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import apiClient from '@/lib/api-client';

export type UploadAvatarResponse = {
  imageUrl: string;
  imagePublicId: string;
};

/**
 * DEAD-11: `dashboard/my-account.tsx` used a raw `fetch('/api/upload/avatar')`.
 * Route it through the shared axios client so auth/CSRF/rate-limit handling
 * stays consistent with every other upload in the app.
 */
export function useUploadAvatarMutation() {
  return useMutation<UploadAvatarResponse, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      try {
        const response = await apiClient.post<UploadAvatarResponse>(
          '/api/upload/avatar',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(error.response?.data?.error ?? error.message);
        }
        throw error;
      }
    },
  });
}
