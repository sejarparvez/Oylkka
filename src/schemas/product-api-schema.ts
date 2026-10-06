import { z } from 'zod';

export const ProductConditionEnum = z.enum([
  'NEW',
  'USED',
  'LIKE_NEW',
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'FOR_PARTS',
]);

export const ProductStatusEnum = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'OUT_OF_STOCK',
]);

export const VariantStatusEnum = z.enum([
  'ACTIVE',
  'DISABLED',
  'PRE_ORDER',
  'OUT_OF_STOCK',
  'DISCONTINUED',
]);

/**
 * A discount at or above the list price is not a discount — it silently raises
 * the effective price of every cart line and voucher calculation that prefers
 * `discountPrice` over `price` (MONEY-64).
 */
function priceRefinement<T extends z.ZodTypeAny>(
  schema: T,
  priceKey: string,
  discountKey: string,
) {
  return schema.refine(
    (val: unknown) => {
      if (typeof val !== 'object' || val === null) return true;
      const record = val as Record<string, unknown>;
      const price = record[priceKey];
      const discount = record[discountKey];
      if (typeof price !== 'number' || typeof discount !== 'number')
        return true;
      return discount < price;
    },
    {
      message: 'Discount price must be lower than the price',
      path: [discountKey],
    },
  );
}

const VariantSchema = priceRefinement(
  z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Variant name is required'),
    sku: z.string().min(1, 'SKU is required'),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    discountPrice: z.number().min(0).optional().nullable(),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    attributes: z.record(z.string(), z.string()),

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
    // Server-owned. Still accepted so an edit form that echoes a whole variant
    // back does not fail validation, but it is never written to the database: it
    // tracks in-flight bKash holds, and letting a vendor set it would release
    // stock that is already spoken for.
    reservedStock: z.number().int().min(0).default(0),
    lowStockAlert: z.number().int().min(1).optional().nullable(),
    availableAt: z.string().datetime().optional().nullable(),
    slug: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .optional()
      .nullable(),
  }),
  'price',
  'discountPrice',
);

// NEW — normalized attribute value schema (Phase 2)
export const ProductAttributeValueSchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1, 'Attribute value is required'),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  displayOrder: z.number().int().min(0).default(0),
  imageUrl: z.string().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  priceModifier: z.number().optional().nullable(),
});

export const ExtendedAttributeOptionSchema = z.object({
  values: z.array(ProductAttributeValueSchema),
  isVariantDefining: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});

// Extended attributes accepts either the old format (string | string[]) or the new format (with value objects)
export const ExtendedAttributesSchema = z
  .record(z.string(), ExtendedAttributeOptionSchema)
  .optional();

// Accepts both old format (string | string[]) and new extended format (with value objects)
const AttributesSchema = z
  .union([
    z.record(z.string(), z.union([z.string(), z.array(z.string())])),
    z.record(z.string(), ExtendedAttributeOptionSchema),
  ])
  .optional();

const DimensionsSchema = z
  .object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
    unit: z.enum(['cm', 'in', 'm']).optional(),
  })
  .optional();

/**
 * Unrefined product shape. `ProductApiEditSchema` derives from this via
 * `.partial()`, and zod v4 refuses to apply `.partial()` to a schema that
 * already carries a refinement — so the discount rule is attached afterwards,
 * to each exported schema individually.
 */
const ProductApiBaseSchema = z.object({
  productName: z.string().min(2, 'Product name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  tags: z.array(z.string()).default([]),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  discountPrice: z.number().min(0).optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  lowStockAlert: z.number().int().min(0).default(5),
  brand: z.string().max(40).optional().nullable(),
  condition: ProductConditionEnum.default('NEW'),
  conditionDescription: z.string().optional().nullable(),
  weight: z.number().min(0).optional().nullable(),
  weightUnit: z.enum(['kg', 'g', 'lb', 'oz']).default('kg'),
  freeShipping: z.boolean().default(false),
  dimensions: DimensionsSchema,
  hasVariants: z.boolean().default(false),
  attributes: AttributesSchema,
  variants: z.array(VariantSchema).optional().default([]),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  status: ProductStatusEnum.default('DRAFT'),
  featured: z.boolean().default(false),
});

export const ProductApiCreateSchema = priceRefinement(
  ProductApiBaseSchema,
  'price',
  'discountPrice',
);

export const ProductApiEditSchema = priceRefinement(
  ProductApiBaseSchema.partial().extend({
    id: z.string().min(1, 'Product ID is required'),
    productName: z
      .string()
      .min(2, 'Product name must be at least 2 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .regex(
        /^[a-z0-9-]+$/,
        'Slug must be lowercase alphanumeric with hyphens',
      ),
    sku: z.string().min(1, 'SKU is required'),
    price: z.number().min(0.01, 'Price must be greater than 0'),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    keepExistingImage: z.boolean().optional(),
    removedGalleryIds: z.array(z.string()).optional().default([]),
    category: z.string().optional(),
  }),
  'price',
  'discountPrice',
);

export type ProductApiCreateInput = z.input<typeof ProductApiCreateSchema>;
export type ProductApiEditInput = z.input<typeof ProductApiEditSchema>;
