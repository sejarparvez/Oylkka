import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type ContentBlock = {
  id: string;
  slug: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export function useAdminContentBlocks() {
  return useQuery<{ blocks: ContentBlock[] }>({
    queryKey: [QUERY_KEYS.CONTENT_BLOCKS],
    queryFn: async () => {
      const r = await apiClient.get<{ blocks: ContentBlock[] }>(
        '/api/admin/content/list',
      );
      return r.data;
    },
  });
}

export function useSaveContentBlockMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { block: ContentBlock },
    Error,
    { slug: string; title: string; content: string; published?: boolean }
  >({
    mutationFn: async (data) => {
      const r = await apiClient.post<{ block: ContentBlock }>(
        '/api/admin/content/save',
        data,
      );
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CONTENT_BLOCKS] });
      toast.success('Content block saved');
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to save content block';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useContentBlock(slug: string | undefined) {
  return useQuery<{ block: ContentBlock }>({
    queryKey: [QUERY_KEYS.CONTENT_BLOCKS, slug],
    queryFn: async () => {
      const r = await apiClient.get<{ block: ContentBlock }>(
        `/api/content/get?slug=${slug}`,
      );
      return r.data;
    },
    enabled: !!slug,
    // CONTENT-11: a missing/unpublished block is an expected "use the built-in
    // copy" signal, not a transient failure — do not retry it three times.
    retry: false,
  });
}
