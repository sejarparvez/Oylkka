import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type GlobalAttributeValue = {
  id: string;
  attributeId: string;
  value: string;
  slug: string;
  metadata: Record<string, unknown> | null;
};

export type GlobalAttribute = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  values: GlobalAttributeValue[];
  _count?: { productLinks: number };
  createdAt?: string;
  updatedAt?: string;
};

type GlobalAttributeListResponse = {
  attributes: GlobalAttribute[];
  total: number;
  page: number;
  totalPages: number;
};

type GlobalAttributeFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

type CreateGlobalAttributeInput = {
  name: string;
  slug: string;
  displayOrder?: number;
  values: Array<{
    value: string;
    slug: string;
    metadata?: Record<string, unknown> | null;
  }>;
};

type UpdateGlobalAttributeInput = {
  name?: string;
  slug?: string;
  displayOrder?: number;
  values?: Array<{
    id?: string;
    value: string;
    slug: string;
    metadata?: Record<string, unknown> | null;
  }>;
  removedValueIds?: string[];
};

type ProductMapping = {
  id: string;
  productId: string;
  globalAttributeId: string;
  localValueId: string;
  globalValueId: string;
  globalAttribute: { id: string; name: string; slug: string };
  globalValue: {
    id: string;
    value: string;
    slug: string;
    metadata: Record<string, unknown> | null;
  };
};

type ProductMappingsResponse = {
  mappings: ProductMapping[];
  product: {
    id: string;
    productName: string;
    attributeOptions: Array<{
      id: string;
      name: string;
      attributeValues: Array<{
        id: string;
        value: string;
        slug: string;
      }>;
    }>;
  } | null;
};

export type GlobalAttributeProductMapping = {
  id: string;
  productId: string;
  globalAttributeId: string;
  localValueId: string;
  globalValueId: string;
  product: { id: string; productName: string; slug: string };
  globalAttribute: { id: string; name: string; slug: string };
  globalValue: {
    id: string;
    value: string;
    slug: string;
    metadata: Record<string, unknown> | null;
  };
  localValue: {
    id: string;
    value: string;
    option: { id: string; name: string };
  } | null;
};

export function useAdminGlobalAttributes(filters: GlobalAttributeFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  return useQuery<GlobalAttributeListResponse>({
    queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES, filters],
    queryFn: async () => {
      const r = await apiClient.get<GlobalAttributeListResponse>(
        `/api/admin/global-attributes/list?${params.toString()}`,
      );
      return r.data;
    },
  });
}

export function useAdminGlobalAttribute(id: string) {
  return useQuery<{ attribute: GlobalAttribute }>({
    queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES, id],
    queryFn: async () => {
      const r = await apiClient.get<{ attribute: GlobalAttribute }>(
        `/api/admin/global-attributes/${id}`,
      );
      return r.data;
    },
    enabled: !!id,
  });
}

export function useCreateGlobalAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { attribute: GlobalAttribute },
    Error,
    CreateGlobalAttributeInput
  >({
    mutationFn: async (data) => {
      const r = await apiClient.post<{ attribute: GlobalAttribute }>(
        '/api/admin/global-attributes/create',
        data,
      );
      return r.data;
    },
    onMutate: () => {
      toast.loading('Creating global attribute...', {
        id: 'create-global-attribute',
      });
    },
    onSuccess: () => {
      toast.success('Global attribute created', {
        id: 'create-global-attribute',
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to create global attribute';
      toast.error(message, { id: 'create-global-attribute' });
    },
  });
}

export function useUpdateGlobalAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { attribute: GlobalAttribute },
    Error,
    { id: string } & UpdateGlobalAttributeInput
  >({
    mutationFn: async ({ id, ...data }) => {
      const r = await apiClient.put<{ attribute: GlobalAttribute }>(
        `/api/admin/global-attributes/${id}`,
        data,
      );
      return r.data;
    },
    onMutate: () => {
      toast.loading('Updating global attribute...', {
        id: 'update-global-attribute',
      });
    },
    onSuccess: () => {
      toast.success('Global attribute updated', {
        id: 'update-global-attribute',
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to update global attribute';
      toast.error(message, { id: 'update-global-attribute' });
    },
  });
}

export function useDeleteGlobalAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient.delete(`/api/admin/global-attributes/${id}`);
    },
    onMutate: () => {
      toast.loading('Deleting global attribute...', {
        id: 'delete-global-attribute',
      });
    },
    onSuccess: () => {
      toast.success('Global attribute deleted', {
        id: 'delete-global-attribute',
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to delete global attribute';
      toast.error(message, { id: 'delete-global-attribute' });
    },
  });
}

export function useProductGlobalAttributeMappings(productId: string) {
  return useQuery<ProductMappingsResponse>({
    queryKey: [QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES, 'mappings', productId],
    queryFn: async () => {
      const r = await apiClient.get<ProductMappingsResponse>(
        `/api/admin/global-attributes/product-mappings`,
        { params: { productId } },
      );
      return r.data;
    },
    enabled: !!productId,
  });
}

export function useGlobalAttributeProducts(attributeId: string) {
  return useQuery<{ mappings: GlobalAttributeProductMapping[] }>({
    queryKey: [
      QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES,
      'attribute-mappings',
      attributeId,
    ],
    queryFn: async () => {
      const r = await apiClient.get<{
        mappings: GlobalAttributeProductMapping[];
      }>('/api/admin/global-attributes/product-mappings', {
        params: { attributeId },
      });
      return r.data;
    },
    enabled: !!attributeId,
  });
}

export function useMapProductAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { mapping: ProductMapping },
    Error,
    {
      productId: string;
      globalAttributeId: string;
      localValueId: string;
      globalValueId: string;
    }
  >({
    mutationFn: async (data) => {
      const r = await apiClient.post<{ mapping: ProductMapping }>(
        '/api/admin/global-attributes/map-product',
        data,
      );
      return r.data;
    },
    onMutate: (_data) => {
      toast.loading('Mapping attribute...', { id: 'map-attribute' });
    },
    onSuccess: (_data, variables) => {
      toast.success('Attribute mapped successfully', { id: 'map-attribute' });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES,
          'mappings',
          variables.productId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES,
          'attribute-mappings',
          variables.globalAttributeId,
        ],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to map attribute';
      toast.error(message, { id: 'map-attribute' });
    },
  });
}

export function useUnmapProductAttributeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { productId: string; globalAttributeId: string; localValueId: string }
  >({
    mutationFn: async (data) => {
      await apiClient.delete('/api/admin/global-attributes/map-product', {
        data,
      });
    },
    onMutate: () => {
      toast.loading('Removing mapping...', { id: 'unmap-attribute' });
    },
    onSuccess: (_data, variables) => {
      toast.success('Mapping removed', { id: 'unmap-attribute' });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES,
          'mappings',
          variables.productId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: [
          QUERY_KEYS.ADMIN_GLOBAL_ATTRIBUTES,
          'attribute-mappings',
          variables.globalAttributeId,
        ],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to remove mapping';
      toast.error(message, { id: 'unmap-attribute' });
    },
  });
}
