import { createFileRoute, redirect } from '@tanstack/react-router';
import { Loader2, Package } from 'lucide-react';
import { useMemo } from 'react';

import { NewProductPage } from '@/components/forms/product/product-page';
import { useProduct } from '@/services/product';

type ProductEditSearch = {
  productId?: string;
};

export const Route = createFileRoute('/dashboard/vendor/products/edit')({
  validateSearch: (search): ProductEditSearch => ({
    productId: search.productId ? String(search.productId) : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { productId } = Route.useSearch();
  const { data: product, isLoading } = useProduct(productId);

  const defaultValues = useMemo(() => {
    if (!product) return undefined;
    return {
      productName: product.productName,
      description: product.description,
      category: product.categoryId,
      tags: product.tags,
      sku: product.sku,
      brand: product.brand ?? '',
      price: product.price,
      discountPrice: product.discountPrice ?? undefined,
      stock: product.stock,
      condition: product.condition as
        | 'NEW'
        | 'USED'
        | 'LIKE_NEW'
        | 'EXCELLENT'
        | 'GOOD'
        | 'FAIR'
        | 'POOR'
        | 'FOR_PARTS',
      conditionDescription: product.conditionDescription ?? '',
      weight: product.weight ?? undefined,
      weightUnit: product.weightUnit as 'kg' | 'g' | 'lb' | 'oz',
      dimensions: {
        length: product.dimensionLength ?? undefined,
        width: product.dimensionWidth ?? undefined,
        height: product.dimensionHeight ?? undefined,
        unit: product.dimensionUnit as 'cm' | 'in' | 'm',
      },
      freeShipping: product.freeShipping,
      metaTitle: product.metaTitle ?? '',
      metaDescription: product.metaDescription ?? '',
      status: product.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      featured: product.featured,
      slug: product.slug,
    };
  }, [product]);

  const initialImages = useMemo(
    () =>
      product
        ? product.images.map((img) => ({
            id: img.id,
            file: null as null,
            preview: img.imageUrl,
          }))
        : undefined,
    [product],
  );

  if (!productId) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
          <Package className='w-7 h-7 text-muted-foreground' />
        </div>
        <div>
          <p className='text-sm font-semibold'>No product selected</p>
          <p className='text-sm text-muted-foreground mt-1'>
            Choose a product from the list to edit it.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  if (!product) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
          <Package className='w-7 h-7 text-muted-foreground' />
        </div>
        <div>
          <p className='text-sm font-semibold'>Product not found</p>
          <p className='text-sm text-muted-foreground mt-1'>
            The product you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <NewProductPage
      productId={product.id}
      defaultValues={defaultValues}
      initialImages={initialImages}
    />
  );
}
