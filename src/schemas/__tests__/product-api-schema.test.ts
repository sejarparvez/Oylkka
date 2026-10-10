import { describe, expect, it } from 'bun:test';
import {
  ProductApiCreateSchema,
  ProductApiEditSchema,
} from '@/schemas/product-api-schema';

const validProduct = {
  productName: 'Test Product',
  description: 'A valid description that is long enough',
  category: 'cat-1',
  slug: 'test-product',
  sku: 'TST-PRO001',
  price: 100,
  stock: 10,
};

describe('ProductApiCreateSchema', () => {
  it('accepts valid product data', () => {
    const result = ProductApiCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('rejects empty product name', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      productName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short product name', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      productName: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short description', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      description: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      category: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug format', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      slug: 'Invalid Slug!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      price: -10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero price', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      price: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative stock', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      stock: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer stock', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      stock: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional discountPrice', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      discountPrice: 80,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fields omitted', () => {
    const result = ProductApiCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
      expect(result.data.condition).toBe('NEW');
      expect(result.data.hasVariants).toBe(false);
      expect(result.data.featured).toBe(false);
      expect(result.data.status).toBe('PUBLISHED');
      expect(result.data.weightUnit).toBe('kg');
    }
  });

  it('accepts valid variants', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      hasVariants: true,
      variants: [
        {
          name: 'Red',
          sku: 'TST-RED001',
          price: 110,
          stock: 5,
          attributes: { color: 'red' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects variant with empty name', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      hasVariants: true,
      variants: [
        { name: '', sku: 'TST-RED001', price: 110, stock: 5, attributes: {} },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid dimensions', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      dimensions: { length: 10, width: 5, height: 3, unit: 'cm' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative dimension', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      dimensions: { length: -5, width: 5, height: 3, unit: 'cm' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects long brand name', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      brand: 'A'.repeat(41),
    });
    expect(result.success).toBe(false);
  });
});

describe('discount price refinement (MONEY-64)', () => {
  const priced = { ...validProduct, price: 1000, stock: 10 };

  const variant = {
    name: 'Large',
    sku: 'TST-PRO001-L',
    price: 1000,
    stock: 5,
    attributes: { size: 'L' },
  };

  it('rejects a product discount equal to the list price', () => {
    expect(
      ProductApiCreateSchema.safeParse({ ...priced, discountPrice: 1000 })
        .success,
    ).toBe(false);
  });

  it('rejects a product discount above the list price', () => {
    expect(
      ProductApiCreateSchema.safeParse({ ...priced, discountPrice: 1500 })
        .success,
    ).toBe(false);
  });

  it('accepts a product discount below the list price', () => {
    expect(
      ProductApiCreateSchema.safeParse({ ...priced, discountPrice: 900 })
        .success,
    ).toBe(true);
  });

  it('accepts an absent or null discount', () => {
    expect(ProductApiCreateSchema.safeParse(priced).success).toBe(true);
    expect(
      ProductApiCreateSchema.safeParse({ ...priced, discountPrice: null })
        .success,
    ).toBe(true);
  });

  it('rejects a variant discount above the variant list price', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...priced,
      variants: [{ ...variant, discountPrice: 1200 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a variant discount below the variant list price', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...priced,
      variants: [{ ...variant, discountPrice: 800 }],
    });
    expect(result.success).toBe(true);
  });

  it('applies the same rule on the edit schema', () => {
    const base = {
      id: 'product-1',
      productName: validProduct.productName,
      description: validProduct.description,
      slug: validProduct.slug,
      sku: validProduct.sku,
      stock: 10,
    };

    expect(
      ProductApiEditSchema.safeParse({
        ...base,
        price: 1000,
        discountPrice: 1000,
      }).success,
    ).toBe(false);

    expect(
      ProductApiEditSchema.safeParse({
        ...base,
        price: 1000,
        discountPrice: 500,
      }).success,
    ).toBe(true);
  });

  it('still requires price and stock on edit, as before', () => {
    // Pre-existing contract: `.partial().extend({ price, stock })` re-required
    // both. Pinned because the stock guards in product/edit.ts rely on
    // `stock` always being present.
    const result = ProductApiEditSchema.safeParse({
      id: 'product-1',
      productName: 'Renamed Product',
      description: 'A valid description that is long enough',
      slug: 'renamed-product',
      sku: 'TST-PRO002',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toContain('price');
      expect(paths).toContain('stock');
    }
  });
});

describe('variant reservedStock stays server-owned (MONEY-34)', () => {
  it('is still accepted so an echoed edit form validates', () => {
    const result = ProductApiCreateSchema.safeParse({
      ...validProduct,
      variants: [
        {
          name: 'Large',
          sku: 'TST-PRO001-L',
          price: 1000,
          stock: 5,
          attributes: { size: 'L' },
          reservedStock: 3,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
