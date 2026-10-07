import { createContext } from 'react';

import type { ProductImage } from '@/hooks/use-product-image';

import type { ProductFormValues } from './product-form-type';

interface ProductFormContextType {
  productId?: string;
  productImages: ProductImage[];
  setProductImages: React.Dispatch<React.SetStateAction<ProductImage[]>>;
  onSubmit: (data: ProductFormValues) => void;
  isPending?: boolean;
}

export const ProductFormContext = createContext<ProductFormContextType>({
  productId: undefined,
  productImages: [],
  setProductImages: () => {},
  onSubmit: () => {},
  isPending: false,
});
