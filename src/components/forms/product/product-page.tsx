import { ArrowBigLeft, Plus } from 'lucide-react';
import { useContext } from 'react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';

import { BasicInformationCard } from './basic-information';
import PricingAndInventory from './pricing-and-inventory';
import { ProductCondition } from './product-condition';
import { ProductDimensions } from './product-dimension';
import { ProductFormContext } from './product-form-context';
import { ProductFormProvider } from './product-form-provider';
import type { ProductFormValues } from './product-form-type';
import { ProductImagesCard } from './product-image';
import ProductSeo from './product-seo';
import ProductStatus from './product-status';
import ProductVariant from './product-variant';

interface NewProductPageProps {
  productId?: string;
  defaultValues?: Partial<ProductFormValues>;
  initialImages?: Array<{ id: string; file: null; preview: string }>;
}

export function NewProductPage({
  productId,
  defaultValues,
  initialImages,
}: NewProductPageProps) {
  return (
    <ProductFormProvider
      productId={productId}
      defaultValues={defaultValues}
      initialImages={initialImages}
    >
      <NewProductForm />
    </ProductFormProvider>
  );
}

function NewProductForm() {
  const methods = useFormContext<ProductFormValues>();
  const { onSubmit, isPending, productId } = useContext(ProductFormContext);

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <div className='mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div className='flex items-center gap-3'>
          <Button variant='outline' type='button' onClick={() => window.history.back()}>
            <ArrowBigLeft />
          </Button>
          <h1 className='text-2xl font-bold'>New Product</h1>
        </div>
        <div className='flex items-center justify-end gap-5'>
          <Button variant='outline' type='button' onClick={() => methods.reset()}>
            Discard
          </Button>
          <Button type='submit' className='gap-2' disabled={isPending}>
            {isPending ? (
              'Saving...'
            ) : (
              <>
                <Plus className='h-4 w-4' />
                Save Product
              </>
            )}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-12'>
        <div className='space-y-6 md:col-span-8'>
          <BasicInformationCard productId={productId} />
          <PricingAndInventory />
          <ProductDimensions />
          <ProductVariant />
        </div>
        <div className='space-y-6 md:col-span-4'>
          <ProductImagesCard />
          <ProductStatus />
          <ProductCondition />
          <ProductSeo />
        </div>
      </div>
    </form>
  );
}
