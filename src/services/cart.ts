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
    onMutate: async (input) => {
      toast.loading('Adding to cart...', { id: 'cart-add' });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.CART] });
      const previous = queryClient.getQueryData<Cart>([QUERY_KEYS.CART]);
      // Optimistically bump the matching line so rapid clicks stack instantly;
      // brand-new lines still need the server's row, so the settled refetch
      // below fills them in.
      queryClient.setQueryData<Cart>([QUERY_KEYS.CART], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.productId === input.productId &&
            (item.variantId ?? null) === (input.variantId ?? null)
              ? { ...item, quantity: item.quantity + input.quantity }
              : item,
          ),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Added to cart!', { id: 'cart-add' });
    },
    onError: (error: unknown, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.CART], context.previous);
      }
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to add to cart';
      toast.error(`Error: ${message}`, { id: 'cart-add' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
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
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.CART] });
      const previous = queryClient.getQueryData<Cart>([QUERY_KEYS.CART]);
      queryClient.setQueryData<Cart>([QUERY_KEYS.CART], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === input.itemId
              ? { ...item, quantity: input.quantity }
              : item,
          ),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      // Clear any stale error toast from a previous rapid-click failure.
      toast.dismiss('cart-update');
    },
    onError: (error: unknown, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.CART], context.previous);
      }
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to update cart';
      toast.error(`Error: ${message}`, { id: 'cart-update' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
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
    onMutate: async (itemId) => {
      toast.loading('Removing item...', { id: 'cart-remove' });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.CART] });
      const previous = queryClient.getQueryData<Cart>([QUERY_KEYS.CART]);
      queryClient.setQueryData<Cart>([QUERY_KEYS.CART], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== itemId),
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Item removed', { id: 'cart-remove' });
    },
    onError: (error: unknown, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.CART], context.previous);
      }
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to remove item';
      toast.error(`Error: ${message}`, { id: 'cart-remove' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CART] });
    },
  });
}
