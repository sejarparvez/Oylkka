import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

type ProductImage = {
  id: string;
  productId: string;
  imageUrl: string;
  imagePublicId: string;
  altText: string | null;
  order: number;
};

export type VendorProduct = {
  id: string;
  productName: string;
  slug: string;
  description: string;
  categoryId: string;
  category: { id: string; name: string };
  tags: string[];
  sku: string;
  brand: string | null;
  price: number;
  discountPrice: number | null;
  stock: number;
  hasVariants: boolean;
  condition: string;
  conditionDescription: string | null;
  weight: number | null;
  weightUnit: string;
  freeShipping: boolean;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  dimensionUnit: string;
  images: ProductImage[];
  status: string;
  featured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { reviews: number; orderItems: number };
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    discountPrice: number | null;
    stock: number;
    attributes: Record<string, string>;
    imageUrl: string | null;
    variantImages: Array<{
      id: string;
      imageUrl: string;
      imagePublicId: string;
      altText: string | null;
      order: number;
    }>;
    status: string;
    reservedStock: number;
    lowStockAlert: number | null;
    barcode: string | null;
    weight: number | null;
    weightUnit: string;
    dimensionLength: number | null;
    dimensionWidth: number | null;
    dimensionHeight: number | null;
    dimensionUnit: string;
    freeShipping: boolean;
    availableAt: string | null;
    slug: string | null;
    attributeValues: Array<{
      attributeValue: {
        id: string;
        value: string;
        slug: string;
        optionId: string;
        imageUrl: string | null;
        imagePublicId: string | null;
      };
    }>;
  }>;
};

type VendorCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
};

type CreateProductResponse = {
  message: string;
  product: VendorProduct;
};

export type CategoryProduct = {
  id: string;
  productName: string;
  slug: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  hasVariants: boolean;
  images: { imageUrl: string }[];
  category: { id: string; name: string; slug: string };
  shop: { id: string; name: string; slug: string } | null;
  _count: { reviews: number };
  createdAt: string;
};

type ProductListResponse = {
  products: CategoryProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PublicProduct = {
  id: string;
  productName: string;
  slug: string;
  description: string;
  price: number;
  discountPrice: number | null;
  discountPercent: number | null;
  stock: number;
  hasVariants: boolean;
  sku: string;
  brand: string | null;
  condition: string;
  conditionDescription: string | null;
  weight: number | null;
  weightUnit: string;
  freeShipping: boolean;
  dimensionLength: number | null;
  dimensionWidth: number | null;
  dimensionHeight: number | null;
  dimensionUnit: string;
  tags: string[];
  images: {
    id: string;
    imageUrl: string;
    altText: string | null;
    order: number;
  }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    discountPrice: number | null;
    stock: number;
    attributes: Record<string, string>;
    imageUrl: string | null;
    variantImages: Array<{
      id: string;
      imageUrl: string;
      imagePublicId: string;
      altText: string | null;
      order: number;
    }>;
    status: string;
    reservedStock: number;
    lowStockAlert: number | null;
    barcode: string | null;
    weight: number | null;
    weightUnit: string;
    dimensionLength: number | null;
    dimensionWidth: number | null;
    dimensionHeight: number | null;
    dimensionUnit: string;
    freeShipping: boolean;
    availableAt: string | null;
    slug: string | null;
    attributeValues: Array<{
      attributeValue: {
        id: string;
        value: string;
        slug: string;
        optionId: string;
        imageUrl: string | null;
        imagePublicId: string | null;
      };
    }>;
  }[];
  attributeOptions: {
    id: string;
    name: string;
    values: string[];
    isVariantDefining: boolean;
    displayOrder: number;
    attributeValues: Array<{
      id: string;
      value: string;
      slug: string;
      displayOrder: number;
      imageUrl: string | null;
      imagePublicId: string | null;
      metadata: Record<string, unknown> | null;
    }>;
  }[];
  category: { id: string; name: string; slug: string };
  shop: {
    id: string;
    name: string;
    slug: string;
    status: string;
    logoUrl: string | null;
    rating: number;
    totalReviews: number;
    totalSales: number;
    createdAt: string;
  } | null;
  _count: { reviews: number };
  ratingBreakdown: Record<number, number>;
  createdAt: string;
};

export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc';

export function useCategoryProducts(slug: string | undefined) {
  return useQuery<CategoryProduct[]>({
    queryKey: [QUERY_KEYS.PUBLIC_PRODUCTS, 'category', slug],
    queryFn: async () => {
      const response = await apiClient.get<CategoryProduct[]>(
        '/api/product/public-by-category',
        { params: { slug } },
      );
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useAllProducts(
  params: {
    sort?: ProductSortOption;
    page?: number;
    limit?: number;
    category?: string;
    hasDiscount?: boolean;
    search?: string;
  },
  queryOptions?: { enabled?: boolean },
) {
  return useQuery<ProductListResponse>({
    queryKey: [QUERY_KEYS.PUBLIC_PRODUCTS, 'list', params],
    queryFn: async () => {
      const response = await apiClient.get<ProductListResponse>(
        '/api/product/public-list',
        { params },
      );
      return response.data;
    },
    ...(queryOptions ?? {}),
  });
}

type CompareProduct = CategoryProduct & {
  description: string;
  sku: string;
  brand: string | null;
  condition: string;
  freeShipping: boolean;
  tags: string[];
  discountPercent: number | null;
};

type CompareResponse = {
  products: CompareProduct[];
};

export function useCompareProducts(ids: string[]) {
  return useQuery<CompareResponse>({
    queryKey: [QUERY_KEYS.PUBLIC_PRODUCTS, 'compare', ids],
    queryFn: async () => {
      const response = await apiClient.get<CompareResponse>(
        '/api/product/public-compare',
        { params: { ids: ids.join(',') } },
      );
      return response.data;
    },
    enabled: ids.length >= 2,
  });
}

export type PublicReview = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  content: string;
  verified: boolean;
  helpfulCount: number;
  viewerVoted: boolean;
  vendorReply: string | null;
  vendorRepliedAt: string | null;
  createdAt: string;
  user: { id: string; name: string; image: string | null };
  images: { id: string; imageUrl: string; order: number }[];
};

type ProductReviewsResponse = {
  reviews: PublicReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  ratingBreakdown: Record<number, number>;
};

export function usePublicProductReviews(productId: string, page: number = 1) {
  return useQuery<ProductReviewsResponse>({
    queryKey: [QUERY_KEYS.PUBLIC_PRODUCTS, 'reviews', productId, page],
    queryFn: async () => {
      const response = await apiClient.get<ProductReviewsResponse>(
        '/api/product/public-reviews',
        { params: { productId, page, limit: 10 } },
      );
      return response.data;
    },
    enabled: !!productId,
  });
}

// CUST-21: toggle a "helpful" vote; the cached review list is patched in
// place so the button and count update without a refetch.
export function useToggleHelpfulVoteMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    { helpfulCount: number; voted: boolean },
    Error,
    { productId: string; reviewId: string }
  >({
    mutationFn: async ({ reviewId }) => {
      const response = await apiClient.post('/api/product/helpful-vote', {
        reviewId,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueriesData<ProductReviewsResponse>(
        {
          queryKey: [
            QUERY_KEYS.PUBLIC_PRODUCTS,
            'reviews',
            variables.productId,
          ],
        },
        (old) =>
          old
            ? {
                ...old,
                reviews: old.reviews.map((review) =>
                  review.id === variables.reviewId
                    ? {
                        ...review,
                        helpfulCount: data.helpfulCount,
                        viewerVoted: data.voted,
                      }
                    : review,
                ),
              }
            : old,
      );
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to record vote';
      toast.error(
        axios.isAxiosError(error) && error.response?.status === 401
          ? 'Sign in to mark a review as helpful'
          : message,
      );
    },
  });
}

type PublicQuestion = {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user: { id: string; name: string };
};

type ProductQuestionsResponse = {
  questions: PublicQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function useProductQuestions(productId: string, page: number = 1) {
  return useQuery<ProductQuestionsResponse>({
    queryKey: [QUERY_KEYS.PRODUCT_QUESTIONS, productId, page],
    queryFn: async () => {
      const response = await apiClient.get<ProductQuestionsResponse>(
        '/api/product/public-questions',
        { params: { productId, page, limit: 10 } },
      );
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useAskQuestionMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    PublicQuestion,
    Error,
    { productId: string; question: string }
  >({
    mutationFn: async ({ productId, question }) => {
      const response = await apiClient.post<PublicQuestion>(
        '/api/product/public-questions',
        { productId, question },
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRODUCT_QUESTIONS, variables.productId],
      });
      toast.success('Question submitted successfully!');
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to submit question';
      toast.error(`Error: ${message}`);
    },
  });
}

export function usePublicProduct(slug: string) {
  return useQuery<PublicProduct>({
    queryKey: [QUERY_KEYS.PUBLIC_PRODUCTS, 'single', slug],
    queryFn: async () => {
      const response = await apiClient.get<PublicProduct>(
        '/api/product/public-single',
        { params: { slug } },
      );
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useVendorProducts() {
  return useQuery<VendorProduct[]>({
    queryKey: [QUERY_KEYS.PRODUCTS, 'vendor-list'],
    queryFn: async () => {
      const response = await apiClient.get<VendorProduct[]>(
        '/api/product/vendor-list',
      );
      return response.data;
    },
  });
}

export function useProduct(id: string | undefined) {
  return useQuery<VendorProduct>({
    queryKey: [QUERY_KEYS.PRODUCTS, id],
    queryFn: async () => {
      const response = await apiClient.get<VendorProduct>(
        '/api/product/get-single',
        { params: { id } },
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useVendorCategories() {
  return useQuery<VendorCategory[]>({
    queryKey: [QUERY_KEYS.CATEGORIES, 'vendor'],
    queryFn: async () => {
      const response = await apiClient.get<VendorCategory[]>(
        '/api/product/vendor-categories',
      );
      return response.data;
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await apiClient.post('/api/product/delete', { id });
      return response.data;
    },
    onMutate: () => {
      toast.loading('Deleting product...', { id: 'product-delete' });
    },
    onSuccess: () => {
      toast.success('Product deleted successfully!', {
        id: 'product-delete',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to delete product';
      toast.error(`Error: ${message}`, { id: 'product-delete' });
    },
  });
}

// New FormData-based mutations for the modular form
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<CreateProductResponse, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await apiClient.post<CreateProductResponse>(
        '/api/product/create',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: () => {
      // Toast handled by form-layer (product-form-provider.tsx) to avoid duplicates
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to create product';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useUpdateProduct({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  return useMutation<CreateProductResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      formData.append('id', productId);
      const response = await apiClient.post<CreateProductResponse>(
        '/api/product/edit',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: () => {
      // Toast handled by form-layer (product-form-provider.tsx) to avoid duplicates
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRODUCTS, productId],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to update product';
      toast.error(`Error: ${message}`);
    },
  });
}

export function useAdminUpdateProduct({ productId }: { productId: string }) {
  const queryClient = useQueryClient();

  return useMutation<CreateProductResponse, Error, FormData>({
    mutationFn: async (formData) => {
      formData.append('id', productId);
      const response = await apiClient.post<CreateProductResponse>(
        '/api/product/edit',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return response.data;
    },
    onSuccess: () => {
      // Toast handled by form-layer (product-form-provider.tsx) to avoid duplicates
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PRODUCTS] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRODUCTS, productId],
      });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : 'Failed to update product';
      toast.error(`Error: ${message}`);
    },
  });
}
