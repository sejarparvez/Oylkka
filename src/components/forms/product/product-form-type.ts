import { z } from 'zod';

import { SkuService } from '@/services/sku-service';

const VariantStatusEnum = z.enum([
  'ACTIVE',
  'DISABLED',
  'PRE_ORDER',
  'OUT_OF_STOCK',
  'DISCONTINUED',
]);

const ProductConditionEnum = z.enum([
  'NEW',
  'USED',
  'LIKE_NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'FOR_PARTS',
]);

const ProductStatusEnum = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'OUT_OF_STOCK',
]);

const DimensionsSchema = z
  .object({
    length: z.number().min(0, { message: 'Length must be a positive number' }),
    width: z.number().min(0, { message: 'Width must be a positive number' }),
    height: z.number().min(0, { message: 'Height must be a positive number' }),
    unit: z.enum(['cm', 'in', 'm'], {
      message: 'Dimension unit must be cm, in, or m',
    }),
  })
  .partial()
  .refine(
    (data) => {
      // FE-33: `unit` must not count towards the presence check — the edit
      // form always supplies it (defaults to 'cm'), so a product without
      // dimensions would otherwise fail validation on every save.
      const { unit: _unit, ...dimensions } = data;
      const hasAnyDimension = Object.values(dimensions).some(
        (val) => val !== undefined,
      );
      if (!hasAnyDimension) return true;
      return (
        dimensions.length !== undefined &&
        dimensions.width !== undefined &&
        dimensions.height !== undefined
      );
    },
    {
      message:
        'All dimension fields (length, width, height) must be provided together or not at all',
      path: ['dimensions'],
    },
  );

const ProductAttributeValueSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, { message: 'Attribute value is required' }),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayOrder: z.number().int().min(0).default(0),
  imageUrl: z.string().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  priceModifier: z.number().optional().nullable(),
  // FE-45: optional links to the canonical GlobalAttributeValue this local
  // value maps to (persisted as ProductGlobalAttributeValue). Kept by zod so
  // the round-trip through validation and `reset()` does not drop them.
  globalAttributeId: z.string().optional().nullable(),
  globalValueId: z.string().optional().nullable(),
});

const ExtendedAttributeOptionSchema = z.object({
  values: z.array(ProductAttributeValueSchema),
  isVariantDefining: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

const ExtendedAttributesSchema = z
  .record(z.string(), ExtendedAttributeOptionSchema)
  .optional();

const VariantAttributesSchema = z
  .record(z.string(), z.string())
  .refine(
    (attrs) =>
      Object.entries(attrs).every(
        ([key, val]) => key.trim() !== '' && val.trim() !== '',
      ),
    { message: 'Variant attributes must have non-empty keys and values' },
  );

const ProductVariantSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1, { message: 'Variant name is required' }),
    sku: z.string().min(1, { message: 'SKU is required' }),
    price: z.number().min(0.01, { message: 'Price must be greater than 0' }),
    discountPrice: z
      .union([
        z.number().min(0, { message: 'Discount price must be non-negative' }),
        z
          .string()
          .transform((val) => (val === '' ? 0 : Number.parseFloat(val))),
      ])
      .optional()
      .nullable()
      .default(0),
    stock: z
      .number()
      .int({ message: 'Stock must be a whole number' })
      .min(0, { message: 'Stock cannot be negative' }),
    attributes: VariantAttributesSchema,
    image: z.any().optional().nullable(),

    // NEW
    status: VariantStatusEnum.default('ACTIVE'),
    barcode: z.string().optional().nullable(),
    weight: z.number().min(0).optional().nullable(),
    weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).default('kg'),
    dimensionLength: z.number().min(0).optional().nullable(),
    dimensionWidth: z.number().min(0).optional().nullable(),
    dimensionHeight: z.number().min(0).optional().nullable(),
    dimensionUnit: z.enum(['cm', 'in', 'm']).default('cm'),
    freeShipping: z.boolean().default(false),
    reservedStock: z.number().int().min(0).default(0),
    lowStockAlert: z.number().int().min(1).optional().nullable(),
    availableAt: z.string().optional().nullable(),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.discountPrice && data.discountPrice > 0) {
        return data.discountPrice < data.price;
      }
      return true;
    },
    {
      message: 'Discount price must be less than regular price',
      path: ['discountPrice'],
    },
  );

export const ProductFormSchema = z
  .object({
    productName: z
      .string()
      .min(2, { message: 'Product name must be at least 2 characters' }),
    description: z
      .string()
      .min(10, { message: 'Description must be at least 10 characters' }),
    category: z.string().min(1, { message: 'Category is required' }),
    slug: z
      .string()
      .min(1, { message: 'Slug is required' })
      .regex(/^[a-z0-9-]+$/, {
        message:
          'Slug should only contain lowercase letters, numbers, and hyphens',
      }),
    tags: z
      .array(z.string())
      .min(1, { message: 'At least one tag is required' })
      .max(10, { message: 'You can add a maximum of 10 tags' })
      .default([]),

    sku: z
      .string()
      .min(1, 'SKU is required')
      .refine((val) => SkuService.isValidSku(val), {
        message: 'Invalid SKU format. Should follow pattern like CAT-PRD-001',
      }),

    price: z.number().min(0.01, { message: 'Price must be greater than 0' }),
    discountPrice: z.preprocess((val) => {
      if (val === '' || val === undefined || val === null) return undefined;
      if (typeof val === 'number' && Number.isNaN(val)) return undefined;
      const parsed = typeof val === 'string' ? Number.parseFloat(val) : val;
      return typeof parsed === 'number' && Number.isNaN(parsed)
        ? undefined
        : parsed;
    }, z
      .number()
      .min(0, { message: 'Discount price must be non-negative' })
      .optional()),
    discountPercent: z
      .number()
      .min(0, { message: 'Discount percent must be at least 0' })
      .max(100, { message: 'Discount percent cannot exceed 100%' })
      .optional()
      .default(0),
    stock: z.number().int().min(0, { message: 'Stock cannot be negative' }),
    lowStockAlert: z
      .number()
      .int()
      .min(1, { message: 'Low stock alert must be at least 1' })
      .default(5),

    brand: z
      .string()
      .max(40, { message: 'Brand must be at most 40 characters' })
      .optional(),
    condition: ProductConditionEnum,
    conditionDescription: z.string().optional(),

    weight: z
      .number()
      .min(0, { message: 'Weight must be at least 0' })
      .optional(),
    weightUnit: z
      .string()
      .refine((val) => ['kg', 'g', 'lb', 'oz'].includes(val), {
        message: 'Weight unit must be kg, g, lb, or oz',
      })
      .default('kg'),
    dimensions: DimensionsSchema.optional(),
    freeShipping: z.boolean().default(false),

    images: z
      .array(z.any())
      .min(1, { message: 'At least one product image is required' })
      .optional()
      .default([]),
    attributes: ExtendedAttributesSchema,
    variants: z.array(ProductVariantSchema).optional().default([]),

    metaTitle: z.string().optional(),
    metaDescription: z
      .string()
      .max(160, {
        message: 'Meta description should be at most 160 characters',
      })
      .optional(),

    status: ProductStatusEnum,
    featured: z.boolean().default(false).optional(),
  })
  .refine(
    (data) => {
      if (data.discountPrice === undefined) return true;
      return data.discountPrice < data.price;
    },
    {
      message: 'Discount price must be less than regular price',
      path: ['discountPrice'],
    },
  )
  .refine(
    (data) => {
      if (data.discountPrice && data.discountPrice > 0) {
        const calculatedPercent = Math.round(
          ((data.price - data.discountPrice) / data.price) * 100,
        );
        return data.discountPercent === calculatedPercent;
      }
      return true;
    },
    {
      message: 'Discount percent does not match calculated value',
      path: ['discountPercent'],
    },
  )
  .refine(
    (data) => {
      const needsDescription = [
        'USED',
        'GOOD',
        'FAIR',
        'POOR',
        'FOR_PARTS',
      ].includes(data.condition);
      return (
        !needsDescription ||
        (data.conditionDescription && data.conditionDescription.length > 0)
      );
    },
    {
      message: 'Condition description is required for this condition',
      path: ['conditionDescription'],
    },
  )
  .refine(
    (data) => {
      if (!data.variants || data.variants.length === 0) return true;
      const skus = data.variants.map((v) => v.sku);
      return new Set(skus).size === skus.length;
    },
    {
      message: 'Variant SKUs must be unique',
      path: ['variants'],
    },
  )
  .refine(
    (data) => {
      if (!data.variants || data.variants.length <= 1) return true;
      const attributeSets = data.variants.map((v) =>
        JSON.stringify(Object.entries(v.attributes).sort()),
      );
      return new Set(attributeSets).size === attributeSets.length;
    },
    {
      message: 'Variants must have unique attribute combinations',
      path: ['variants'],
    },
  )
  .refine(
    (data) => {
      if (data.status !== 'PUBLISHED') return true;
      if (data.variants && data.variants.length > 0) return true;
      return data.stock >= 1;
    },
    {
      message: 'Stock must be at least 1 for published products',
      path: ['stock'],
    },
  );

export type ProductFormInput = z.input<typeof ProductFormSchema>;
export type ProductFormValues = z.output<typeof ProductFormSchema>;
