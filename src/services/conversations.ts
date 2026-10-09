import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type ConversationItem = {
  id: string;
  customerId: string;
  shopId: string;
  orderId: string | null;
  productId: string | null;
  subject: string;
  status: 'OPEN' | 'CLOSED';
  lastMessageAt: string | null;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
  } | null;
  product?: {
    id: string;
    slug: string;
    productName: string;
    images: { imageUrl: string }[];
  } | null;
  messages?: {
    content: string;
    createdAt: string;
    senderId: string;
    isRead: boolean;
  }[];
  _count?: {
    messages: number;
  };
};

type MessageItem = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
};

// ─── Customer hooks ─────────────────────────────

/**
 * Polling unread count for the header badge (CUST-14). Kept on its own query
 * key so signed-in users don't have to fetch the whole conversation list, but
 * still under the CONVERSATIONS prefix so mark-read/send invalidate it.
 */
export function useUnreadMessageCount(options?: { enabled?: boolean }) {
  return useQuery<number>({
    queryKey: [QUERY_KEYS.CONVERSATIONS, 'unread-count'],
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const response = await apiClient.get<{ unreadCount: number }>(
        '/api/conversations/unread',
      );
      return response.data.unreadCount ?? 0;
    },
  });
}

export function useConversations() {
  return useQuery<{ conversations: ConversationItem[]; unreadCount: number }>({
    queryKey: [QUERY_KEYS.CONVERSATIONS],
    queryFn: async () => {
      const response = await apiClient.get('/api/conversations/list');
      return response.data;
    },
  });
}

export function useConversationDetail(id: string | undefined) {
  return useQuery<{ conversation: ConversationItem }>({
    queryKey: [QUERY_KEYS.CONVERSATIONS, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery<{ messages: MessageItem[] }>({
    queryKey: [QUERY_KEYS.MESSAGES, conversationId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/messages/list?conversationId=${conversationId}`,
      );
      return response.data;
    },
    enabled: !!conversationId,
    refetchInterval: 15_000,
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiClient.post('/api/messages/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      const conversationId = variables.get('conversationId') as string;
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MESSAGES, conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CONVERSATIONS],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to send message';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      role,
    }: {
      conversationId: string;
      role: 'customer' | 'vendor';
    }) => {
      const base =
        role === 'vendor' ? '/api/vendor/conversations' : '/api/conversations';
      const response = await apiClient.patch(`${base}/${conversationId}`, {
        action: 'read',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.CONVERSATIONS],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.VENDOR_CONVERSATIONS],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to mark as read';
      toast.error(`Error: ${message}`);
    },
  });
}

// ─── Vendor hooks ─────────────────────────────

export function useVendorConversations() {
  return useQuery<{
    conversations: ConversationItem[];
    unreadCount: number;
  }>({
    queryKey: [QUERY_KEYS.VENDOR_CONVERSATIONS],
    queryFn: async () => {
      const response = await apiClient.get('/api/vendor/conversations/list');
      return response.data;
    },
  });
}

export function useVendorConversationDetail(id: string | undefined) {
  return useQuery<{ conversation: ConversationItem }>({
    queryKey: [QUERY_KEYS.VENDOR_CONVERSATIONS, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/vendor/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// ─── Admin hooks ─────────────────────────────

export function useAdminConversations() {
  return useQuery<{ conversations: ConversationItem[] }>({
    queryKey: [QUERY_KEYS.ADMIN_CONVERSATIONS],
    queryFn: async () => {
      const response = await apiClient.get('/api/admin/conversations/list');
      return response.data;
    },
  });
}

export function useAdminConversationDetail(id: string | undefined) {
  return useQuery<{ conversation: ConversationItem }>({
    queryKey: [QUERY_KEYS.ADMIN_CONVERSATIONS, id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/admin/conversations/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAdminSendMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const response = await apiClient.post('/api/admin/messages/create', data);
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MESSAGES, variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_CONVERSATIONS],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to send message';
      toast.error(`Error: ${message}`);
    },
  });
}
