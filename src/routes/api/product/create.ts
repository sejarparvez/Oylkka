import { createFileRoute } from '@tanstack/react-router';
import { UploadImage } from '@/cloudinary';
import { requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/slug';
import { ProductApiCreateSchema } from '@/schemas/product-api-schema';
import { SkuService } from '@/services/sku-service';

export const Route = createFileRoute('/api/product/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop || shop.status !== 'ACTIVE') {
            return Response.json(
              { error: 'You need an active shop to create products' },
              { status: 403 },
            );
          }

          const formData = await request.formData();
          const data: Record<string, unknown> = {};

          for (const [key, value] of formData.entries()) {
            if (key === 'productImages') {
              if (!data.productImages) data.productImages = [];
              (data.productImages as File[]).push(value as unknown as File);
            } else if (key.startsWith('variantImage_')) {
              if (!data.variantImages) data.variantImages = {};
              const variantId = key.replace('variantImage_', '');
              (data.variantImages as Record<string, File>)[variantId] =
                value as unknown as File;
            } else if (typeof value !== 'string') {
              if (key === 'gallery') {
                if (!data.gallery) data.gallery = [];
                (data.gallery as File[]).push(value);
              } else {
                data[key] = value;
              }
            } else if (
              key === 'hasVariants' ||
              key === 'freeShipping' ||
              key === 'featured'
            ) {
              data[key] = value === 'true';
            } else if (
              key === 'price' ||
              key === 'discountPrice' ||
              key === 'stock' ||
              key === 'weight' ||
              key === 'lowStockAlert'
            ) {
              data[key] = value ? Number(value) : undefined;
            } else if (
              key === 'dimensions' ||
              key === 'attributes' ||
              key === 'variants'
            ) {
              try {
                data[key] = JSON.parse(value as string);
              } catch (error) {
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to parse JSON field:', error);
                data[key] = undefined;
              }
            } else if (key === 'tags') {
              if (!data.tags) data.tags = [];
              (data.tags as string[]).push(value as string);
            } else {
              data[key] = value;
            }
          }

          // Handle backward compatibility: old format sends image + gallery
          if (!data.productImages && data.image) {
            data.productImages = [data.image];
          }
          if (!data.productImages && data.gallery) {
            data.productImages = [
              ...((data.productImages as File[]) || []),
              ...(data.gallery as File[]),
            ];
          }

          // Normalize optional category field
          if (!data.category && data.categoryId) {
            data.category = data.categoryId;
          }

          // Validate parsed data against schema
          const parsed = ProductApiCreateSchema.safeParse(data);
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten(),
              },
              { status: 400 },
            );
          }
          const v = parsed.data;

          // Validate SKU format
          if (!SkuService.isValidSku(v.sku)) {
            return Response.json(
              {
                error: 'Invalid SKU format. Expected pattern like CAT-PRD-001',
              },
              { status: 400 },
            );
          }

          // Check SKU uniqueness
          const existingSku = await prisma.product.findUnique({
            where: { sku: v.sku },
            select: { id: true },
          });
          if (existingSku) {
            return Response.json(
              { error: `SKU "${v.sku}" is already in use` },
              { status: 409 },
            );
          }

          // Map field names (handle both old and new formats)
          const categoryId = v.category;

          const textFields: Record<string, unknown> = {
            productName: v.productName,
            description: v.description,
            categoryId,
            slug: v.slug,
            sku: v.sku,
            brand: v.brand || null,
            price: v.price,
            discountPrice: v.discountPrice || null,
            stock: v.stock,
            lowStockAlert: v.lowStockAlert,
            condition: v.condition,
            conditionDescription: v.conditionDescription || null,
            weight: v.weight || null,
            weightUnit: v.weightUnit,
            freeShipping: v.freeShipping,
            metaTitle: v.metaTitle || null,
            metaDescription: v.metaDescription || null,
            status: v.status,
            featured: v.featured,
          };

          // Handle dimensions (nested JSON or flat)
          const dims = v.dimensions;
          if (dims && dims.length !== undefined) {
            textFields.dimensionLength = dims.length ?? null;
            textFields.dimensionWidth = dims.width ?? null;
            textFields.dimensionHeight = dims.height ?? null;
            textFields.dimensionUnit = dims.unit || 'cm';
          }

          // Generate slug from product name if not provided
          const baseSlug = textFields.slug
            ? slugify(textFields.slug as string)
            : slugify(textFields.productName as string);

          if (!baseSlug) {
            return Response.json(
              { error: 'Invalid product name — unable to generate slug' },
              { status: 400 },
            );
          }

          let slug = baseSlug;
          let counter = 1;
          while (await prisma.product.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          // Upload main product images
          const productImageFiles = data.productImages as File[] | undefined;
          const imageData: Array<{
            imageUrl: string;
            imagePublicId: string;
            order: number;
          }> = [];

          if (productImageFiles && productImageFiles.length > 0) {
            for (let i = 0; i < productImageFiles.length; i++) {
              const file = productImageFiles[i];
              if (file instanceof File && file.size > 0) {
                const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                if (!allowedTypes.includes(file.type)) {
                  return Response.json(
                    { error: `Image ${i + 1} must be JPEG, PNG, or WEBP` },
                    { status: 400 },
                  );
                }

                const maxSize = 2_097_152;
                if (file.size > maxSize) {
                  return Response.json(
                    { error: `Image ${i + 1} size must not exceed 2MB` },
                    { status: 400 },
                  );
                }

                const folder = i === 0 ? 'products' : 'products/gallery';
                const result = await UploadImage(file, folder);
                imageData.push({
                  imageUrl: result.secure_url,
                  imagePublicId: result.public_id,
                  order: i,
                });
              }
            }
          }

          const attributes = v.attributes;
          const variants = v.variants;

          // Handle variant images
          const variantImages = data.variantImages as
            | Record<string, File>
            | undefined;

          // Detect attribute format (old: Record<string, string|string[]>, new: Record<string, {values,isVariantDefining,displayOrder}>)
          const isNewAttributeFormat =
            attributes &&
            Object.keys(attributes).length > 0 &&
            typeof Object.values(attributes)[0] === 'object' &&
            !Array.isArray(Object.values(attributes)[0]);

          // Normalize attributes to common structure
          const normalizedAttributes = attributes
            ? Object.entries(attributes).map(([name, value]) => {
                if (isNewAttributeFormat) {
                  const entry = value as unknown as {
                    values: Array<{
                      value: string;
                      slug: string;
                      displayOrder?: number;
                      imageUrl?: string | null;
                      imagePublicId?: string | null;
                      metadata?: Record<string, unknown> | null;
                    }>;
                    isVariantDefining?: boolean;
                    displayOrder?: number;
                  };
                  return {
                    name,
                    values: entry.values.map((v) => v.value),
                    isVariantDefining: entry.isVariantDefining ?? true,
                    displayOrder: entry.displayOrder ?? 0,
                    attributeValues: entry.values.map((v) => ({
                      value: v.value,
                      slug: v.slug,
                      displayOrder: v.displayOrder ?? 0,
                      imageUrl: v.imageUrl ?? null,
                      imagePublicId: v.imagePublicId ?? null,
                      ...(v.metadata != null
                        ? // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict
                          { metadata: v.metadata as any }
                        : {}),
                    })),
                  };
                }
                return {
                  name,
                  values: Array.isArray(value) ? value : [value as string],
                  isVariantDefining: true,
                  displayOrder: 0,
                  attributeValues: null,
                };
              })
            : [];

          const product = await prisma.product.create({
            data: {
              productName: textFields.productName as string,
              slug,
              description: textFields.description as string,
              categoryId: textFields.categoryId as string,
              tags: v.tags,
              sku: textFields.sku as string,
              brand: textFields.brand as string | null,
              price: textFields.price as number,
              discountPrice: textFields.discountPrice as number | null,
              stock: textFields.stock as number,
              hasVariants: !!(variants && variants.length > 0),
              condition: textFields.condition as
                | 'NEW'
                | 'USED'
                | 'LIKE_NEW'
                | 'EXCELLENT'
                | 'GOOD'
                | 'FAIR'
                | 'POOR'
                | 'FOR_PARTS',
              conditionDescription: textFields.conditionDescription as
                | string
                | null,
              weight: textFields.weight as number | null,
              weightUnit: textFields.weightUnit as string,
              freeShipping: textFields.freeShipping as boolean,
              dimensionLength: textFields.dimensionLength as number | null,
              dimensionWidth: textFields.dimensionWidth as number | null,
              dimensionHeight: textFields.dimensionHeight as number | null,
              dimensionUnit: textFields.dimensionUnit as string,
              images:
                imageData.length > 0
                  ? {
                      create: imageData.map((img) => ({
                        imageUrl: img.imageUrl,
                        imagePublicId: img.imagePublicId,
                        order: img.order,
                      })),
                    }
                  : undefined,
              metaTitle: textFields.metaTitle as string | null,
              metaDescription: textFields.metaDescription as string | null,
              status: textFields.status as
                | 'DRAFT'
                | 'PUBLISHED'
                | 'ARCHIVED'
                | 'OUT_OF_STOCK',
              featured: textFields.featured as boolean,
              shopId: shop.id,
              createdBy: session.user.id,

              // Create variants
              ...(variants && variants.length > 0
                ? {
                    variants: {
                      create: await Promise.all(
                        variants.map(async (variant) => {
                          const attrRecord = variant.attributes;

                          let variantImageUrl: string | null = null;
                          let variantImagePublicId: string | null = null;

                          const vId = variant.id ?? '';
                          const vImage = variantImages?.[vId];
                          if (vImage instanceof File && vImage.size > 0) {
                            const result = await UploadImage(
                              vImage,
                              'products/variants',
                            );
                            variantImageUrl = result.secure_url;
                            variantImagePublicId = result.public_id;
                          }

                          return {
                            name: variant.name,
                            sku: variant.sku,
                            price: variant.price || 0,
                            discountPrice: variant.discountPrice ?? null,
                            stock: variant.stock,
                            attributes: attrRecord,
                            imageUrl: variantImageUrl,
                            imagePublicId: variantImagePublicId,
                            // Phase 4 — Store uploaded image as variant image record
                            ...(variantImageUrl
                              ? {
                                  variantImages: {
                                    create: {
                                      imageUrl: variantImageUrl,
                                      imagePublicId: variantImagePublicId ?? '',
                                      altText: variant.name,
                                      order: 0,
                                    },
                                  },
                                }
                              : {}),
                            // Phase 1 — Variant Enrichment fields
                            status: variant.status ?? 'ACTIVE',
                            barcode: variant.barcode ?? null,
                            weight: variant.weight ?? null,
                            weightUnit: variant.weightUnit ?? 'kg',
                            dimensionLength: variant.dimensionLength ?? null,
                            dimensionWidth: variant.dimensionWidth ?? null,
                            dimensionHeight: variant.dimensionHeight ?? null,
                            dimensionUnit: variant.dimensionUnit ?? 'cm',
                            freeShipping: variant.freeShipping ?? false,

                            lowStockAlert: variant.lowStockAlert ?? null,
                            availableAt: variant.availableAt ?? null,
                            slug: variant.slug ?? null,
                          };
                        }),
                      ),
                    },
                  }
                : {}),
            },
            include: {
              images: { orderBy: { order: 'asc' } },
              category: true,
              variants: true,
              attributeOptions: true,
            },
          });

          // Create attribute options with dual-write (separate from product create for clarity)
          if (normalizedAttributes.length > 0) {
            for (const attr of normalizedAttributes) {
              await prisma.productAttributeOption.create({
                data: {
                  productId: product.id,
                  name: attr.name,
                  values: attr.values,
                  isVariantDefining: attr.isVariantDefining,
                  displayOrder: attr.displayOrder,
                  ...(attr.attributeValues
                    ? {
                        attributeValues: {
                          // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict; the shape is correct
                          create: attr.attributeValues as any,
                        },
                      }
                    : {}),
                },
              });
            }
          }

          // Phase 3 — Create ProductVariantAttribute join rows
          if (
            variants &&
            variants.length > 0 &&
            normalizedAttributes.length > 0
          ) {
            const options = await prisma.productAttributeOption.findMany({
              where: { productId: product.id },
              include: { attributeValues: true },
            });
            const optionByName = new Map(options.map((o) => [o.name, o]));

            for (const variant of product.variants) {
              const attrRecord = variant.attributes as Record<string, string>;
              if (!attrRecord) continue;

              for (const [attrName, attrValue] of Object.entries(attrRecord)) {
                const option = optionByName.get(attrName);
                if (!option) continue;

                const attrVal = option.attributeValues.find(
                  (av) => av.value === attrValue,
                );
                if (!attrVal) continue;

                await prisma.productVariantAttribute.create({
                  data: {
                    variantId: variant.id,
                    attributeValueId: attrVal.id,
                  },
                });
              }
            }
          }

          // Re-fetch product with attribute options included
          const productWithOptions = await prisma.product.findUnique({
            where: { id: product.id },
            include: {
              images: { orderBy: { order: 'asc' } },
              category: true,
              variants: {
                include: {
                  variantImages: {
                    orderBy: { order: 'asc' },
                  },
                  attributeValues: {
                    select: {
                      attributeValue: {
                        select: {
                          id: true,
                          value: true,
                          slug: true,
                          optionId: true,
                        },
                      },
                    },
                  },
                },
              },
              attributeOptions: {
                include: { attributeValues: true },
              },
            },
          });

          return Response.json(
            {
              message: 'Product created successfully',
              product: productWithOptions,
            },
            { status: 200 },
          );
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
