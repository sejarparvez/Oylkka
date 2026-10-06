import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type CartItemProduct = {
  id: string;
  productName: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  hasVariants: boolean;
  freeShipping: boolean;
  categoryId: string | null;
  images: { imageUrl: string }[];
  shop: { id: string; name: string; slug: string; shippingCost: number } | null;
};

type CartItemVariant = {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  imageUrl: string | null;
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  savedPrice: number | null;
  product: CartItemProduct;
  variant: CartItemVariant | null;
};

type Cart = {
  id: string;
  userId: string;
  items: CartItem[];
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AddToCartInput = {
  productId: string;
  variantId?: string;
  quantity: number;
};

type UpdateCartItemInput = {
  itemId: string;
  quantity: number;
};

export function useCart() {
  return useQuery<Cart>({
    queryKey: [QUERY_KEYS.CART],
    queryFn: async () => {
      const response = await apiClient.get<Cart>('/api/cart/get');
      return response.data;
    },
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const response = await apiClient.post('/api/cart/add', input);
      return response.data;
    },
    onMutate: () => {
      toast.loading('Adding to cart...', { id: 'cart-add' });
    },
    onSuccess: () => {
      toast.success('Added to cart!', { id: 'cart-add' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to add to cart';
      toast.error(`Error: ${message}`, { id: 'cart-add' });
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCartItemInput) => {
      const response = await apiClient.patch('/api/cart/update', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to update cart';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient.post('/api/cart/remove', { itemId });
      return response.data;
    },
    onMutate: () => {
      toast.loading('Removing item...', { id: 'cart-remove' });
    },
    onSuccess: () => {
      toast.success('Item removed', { id: 'cart-remove' });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to remove item';
      toast.error(`Error: ${message}`, { id: 'cart-remove' });
    },
  });
}
