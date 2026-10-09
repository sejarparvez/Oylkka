import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ProductImage } from '@/hooks/use-product-image';
import { cleanFormData } from '@/lib/utils';
import { useCreateProduct, useUpdateProduct } from '@/services/product';

import { ProductFormContext } from './product-form-context';
import {
  type ProductFormInput,
  ProductFormSchema,
  type ProductFormValues,
} from './product-form-type';

interface ProductFormProviderProps {
  children: ReactNode;
  defaultValues?: Partial<ProductFormInput>;
  productId?: string;
  initialImages?: ProductImage[];
}

export function ProductFormProvider({
  children,
  defaultValues,
  productId,
  initialImages,
}: ProductFormProviderProps) {
  const [productImages, setProductImages] = useState<ProductImage[]>(
    initialImages || [],
  );
  const navigate = useNavigate();

  const methods = useForm<ProductFormInput>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: defaultValues || {
      productName: '',
      description: '',
      slug: '',
      category: '',
      brand: '',
      tags: [],
      price: 0,
      stock: 0,
      lowStockAlert: 5,
      sku: '',
      condition: 'NEW',
      conditionDescription: '',
      weight: 0,
      weightUnit: 'kg',
      dimensions: { length: 0, width: 0, height: 0, unit: 'cm' },
      freeShipping: false,
      metaTitle: '',
      metaDescription: '',
      attributes: {},
      status: 'DRAFT',
      featured: false,
      variants: [],
      images: [],
    },
  });

  // The reset must fire when the form switches to a *different* product, not
  // when `defaultValues` gets a fresh object identity on a background refetch —
  // the latter re-runs `reset()` on every render and discards unsaved edits
  // (FE-03). Keep the latest values in a ref; key the effect on a primitive.
  const defaultValuesRef = useRef(defaultValues);
  useEffect(() => {
    defaultValuesRef.current = defaultValues;
  }, [defaultValues]);

  const resetKey = productId ?? 'new';
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is an intentional trigger so the form resets when switching products; the values themselves are read from the ref to avoid discarding edits on background refetches (FE-03).
  useEffect(() => {
    const values = defaultValuesRef.current;
    if (values && Object.keys(values).length > 0) {
      methods.reset(values);
    }
  }, [resetKey, methods]);

  useEffect(() => {
    methods.setValue('images', productImages);
  }, [productImages, methods]);

  const { mutate: createMutate, isPending: createIsPending } =
    useCreateProduct();
  const { mutate: updateMutate, isPending: updateIsPending } = useUpdateProduct(
    { productId: productId || '' },
  );

  let mutate = createMutate;
  let isPending = createIsPending;

  if (productId) {
    mutate = updateMutate;
    isPending = updateIsPending;
  }

  const onSubmit = (data: ProductFormValues) => {
    const cleaned = cleanFormData(data);
    const formData = new FormData();

    for (const key in cleaned) {
      const value = cleaned[key as keyof typeof cleaned];

      if (key === 'tags' && Array.isArray(value)) {
        (value as string[]).forEach((tag) => {
          formData.append('tags', tag);
        });
      } else if (key === 'images') {
      } else if (
        key === 'variants' ||
        key === 'attributes' ||
        key === 'dimensions'
      ) {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }

    productImages.forEach((img) => {
      if (img.file) {
        formData.append('productImages', img.file);
      }
    });

    // ------------------------------------------------------------------
    // Tell the server what happened to the persisted gallery.
    //
    // Without this the request carries no image intent at all: the server cannot
    // tell "saved without touching images" from "removed every image", so it
    // either wipes the gallery on an unrelated edit or silently ignores the
    // removal the vendor just made in the UI (MONEY-33).
    //
    // Newly picked files get a temp id (`img_<ts>_<rand>`), so membership in
    // `initialImages` is what distinguishes a stored image from a fresh upload.
    // ------------------------------------------------------------------
    const initialIds = new Set(
      (initialImages ?? []).map((img) => img.id).filter(Boolean),
    );
    const currentIds = productImages.map((img) => img.id).filter(Boolean);

    const removedGalleryIds = [...initialIds].filter(
      (id) => !currentIds.includes(id),
    );
    if (removedGalleryIds.length > 0) {
      formData.append('removedGalleryIds', JSON.stringify(removedGalleryIds));
    }

    const retainsExisting = currentIds.some((id) => initialIds.has(id));
    const hasNewFiles = productImages.some((img) => img.file);

    // `false` means "replace the gallery wholesale" and is only correct when new
    // files are arriving and no stored image survives. Omitting the field lets
    // the server default to keeping, which is the safe direction.
    if (retainsExisting || !hasNewFiles) {
      formData.append('keepExistingImage', 'true');
    } else {
      formData.append('keepExistingImage', 'false');
    }

    if (cleaned.variants && Array.isArray(cleaned.variants)) {
      cleaned.variants.forEach((variant, index) => {
        if (variant.image instanceof File) {
          const variantId = variant.id || `variant-${index}`;
          formData.append(`variantImage_${variantId}`, variant.image);
        }
      });
    }

    const isUpdateMode = !!productId;
    toast.promise(
      new Promise((resolve, reject) => {
        mutate(formData, {
          onSuccess: (response) => {
            if (isUpdateMode) {
              toast.success('Product updated successfully!');
            } else {
              toast.success('Product submitted successfully!');
              setProductImages([]);
              methods.reset();
              // FE-28: leave the creation form instead of stranding the user
              // on a reset copy of it.
              void navigate({ to: '/dashboard/vendor/products' });
            }
            resolve(response);
          },
          onError: (err) => {
            reject(err);
          },
        });
      }),
      {
        loading: isUpdateMode ? 'Updating product...' : 'Submitting product...',
        error: (err) =>
          err?.response?.data?.message ||
          (isUpdateMode
            ? 'Failed to update product'
            : 'Failed to submit product'),
      },
    );
  };

  return (
    <ProductFormContext.Provider
      value={{
        productId,
        productImages,
        setProductImages,
        onSubmit,
        isPending,
      }}
    >
      <FormProvider {...methods}>{children}</FormProvider>
    </ProductFormContext.Provider>
  );
}
