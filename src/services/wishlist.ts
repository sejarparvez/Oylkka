import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type WishlistItem = {
  id: string;
  productId: string;
  variantId: string | null;
  product: {
    id: string;
    productName: string;
    slug: string;
    price: number;
    discountPrice: number | null;
    stock: number;
    images: { imageUrl: string }[];
  };
  variant: {
    id: string;
    name: string;
    price: number;
    discountPrice: number | null;
    stock: number;
  } | null;
};

export type WishlistPage = {
  items: WishlistItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function useWishlist(options?: {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize;
  return useQuery<WishlistPage>({
    queryKey: [QUERY_KEYS.WISHLIST, { page, pageSize: pageSize ?? null }],
    enabled: options?.enabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (pageSize) {
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
      }
      const qs = params.toString();
      const response = await apiClient.get<WishlistPage>(
        `/api/wishlist/list${qs ? `?${qs}` : ''}`,
      );
      return response.data;
    },
  });
}

export function useAddToWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { productId: string; variantId?: string }>({
    mutationFn: async (input) => {
      const response = await apiClient.post('/api/wishlist/add', input);
      return response.data;
    },
    onMutate: () => {
      toast.loading('Adding to wishlist...', { id: 'wishlist-add' });
    },
    onSuccess: () => {
      toast.success('Added to wishlist!', { id: 'wishlist-add' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WISHLIST] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to add to wishlist';
      toast.error(message, { id: 'wishlist-add' });
    },
  });
}

export function useRemoveFromWishlistMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { productId: string; variantId?: string }>({
    mutationFn: async (input) => {
      const response = await apiClient.post('/api/wishlist/remove', input);
      return response.data;
    },
    onMutate: () => {
      toast.loading('Removing from wishlist...', { id: 'wishlist-remove' });
    },
    onSuccess: () => {
      toast.success('Removed from wishlist', { id: 'wishlist-remove' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WISHLIST] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to remove from wishlist';
      toast.error(message, { id: 'wishlist-remove' });
    },
  });
}
