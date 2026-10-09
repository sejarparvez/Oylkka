import { createFileRoute } from '@tanstack/react-router';
import { DeleteImage, UploadImage } from '@/cloudinary';
import { requireAuth } from '@/lib/auth-middleware';
import {
  PRODUCT_IMAGE_ACCEPTED_TYPES,
  PRODUCT_IMAGE_MAX_BYTES,
} from '@/lib/constants';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import { slugify } from '@/lib/slug';
import { ProductApiCreateSchema } from '@/schemas/product-api-schema';
import { SkuService } from '@/services/sku-service';

export const Route = createFileRoute('/api/product/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Cloudinary cannot participate in the Prisma transaction, so uploads
        // land first. Track them so a failed create deletes them again instead
        // of leaving paid-for orphans in the bucket (MONEY-50).
        const uploadedPublicIds: string[] = [];
        let committed = false;

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

          // ------------------------------------------------------------------
          // FE-41: duplicate SKUs inside the payload would only surface as a
          // unique-constraint violation (500) deep inside the transaction, so
          // reject them here as a clear 400 instead.
          // ------------------------------------------------------------------
          const variantSkuCounts = new Map<string, number>();
          for (const variant of v.variants) {
            variantSkuCounts.set(
              variant.sku,
              (variantSkuCounts.get(variant.sku) ?? 0) + 1,
            );
          }
          const duplicateVariantSku = [...variantSkuCounts.entries()].find(
            ([, count]) => count > 1,
          )?.[0];
          if (duplicateVariantSku) {
            return Response.json(
              {
                error: `Variant SKU "${duplicateVariantSku}" is used more than once — variant SKUs must be unique`,
              },
              { status: 400 },
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

          // ------------------------------------------------------------------
          // Images: validate every file before uploading anything, so a bad file
          // late in the list cannot strand the uploads already done.
          //
          // Uploads still have to happen before the database write — Cloudinary
          // cannot join the Prisma transaction — so every public id is tracked
          // and the catch block deletes them if the write fails (MONEY-50).
          // ------------------------------------------------------------------
          // FE-38: size/type constraints shared with the client form.
          const ALLOWED_IMAGE_TYPES: readonly string[] =
            PRODUCT_IMAGE_ACCEPTED_TYPES;
          const MAX_IMAGE_BYTES = PRODUCT_IMAGE_MAX_BYTES;

          const productImageFiles = data.productImages as File[] | undefined;
          const attributes = v.attributes;
          const variants = v.variants;
          const variantImages = data.variantImages as
            | Record<string, File>
            | undefined;

          const pendingUploads: Array<{ file: File; label: string }> = [];
          productImageFiles?.forEach((file, i) => {
            if (file instanceof File && file.size > 0) {
              pendingUploads.push({ file, label: `Image ${i + 1}` });
            }
          });
          for (const variant of variants) {
            const file = variantImages?.[variant.id ?? ''];
            if (file instanceof File && file.size > 0) {
              pendingUploads.push({
                file,
                label: `Image for variant "${variant.name}"`,
              });
            }
          }

          for (const { file, label } of pendingUploads) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
              return Response.json(
                { error: `${label} must be JPEG, PNG, or WEBP` },
                { status: 400 },
              );
            }
            if (file.size > MAX_IMAGE_BYTES) {
              return Response.json(
                { error: `${label} size must not exceed 2MB` },
                { status: 400 },
              );
            }
          }

          const imageData: Array<{
            imageUrl: string;
            imagePublicId: string;
            order: number;
          }> = [];

          for (let i = 0; i < (productImageFiles?.length ?? 0); i++) {
            const file = productImageFiles?.[i];
            if (!(file instanceof File) || file.size === 0) continue;

            const folder = i === 0 ? 'products' : 'products/gallery';
            const result = await UploadImage(file, folder);
            uploadedPublicIds.push(result.public_id);
            imageData.push({
              imageUrl: result.secure_url,
              imagePublicId: result.public_id,
              order: i,
            });
          }

          const variantImageByKey = new Map<
            string,
            { imageUrl: string; imagePublicId: string }
          >();
          for (const variant of variants) {
            const key = variant.id ?? '';
            const file = variantImages?.[key];
            if (!(file instanceof File) || file.size === 0) continue;

            const result = await UploadImage(file, 'products/variants');
            uploadedPublicIds.push(result.public_id);
            variantImageByKey.set(key, {
              imageUrl: result.secure_url,
              imagePublicId: result.public_id,
            });
          }

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
                      priceModifier?: number | null;
                      // FE-45: optional canonical mapping links
                      globalAttributeId?: string | null;
                      globalValueId?: string | null;
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
                      priceModifier: v.priceModifier ?? null,
                      globalAttributeId: v.globalAttributeId ?? null,
                      globalValueId: v.globalValueId ?? null,
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

          // ------------------------------------------------------------------
          // One transaction for the product row, its attribute options and the
          // variant↔value join rows. These were independent autocommit writes,
          // so a failure anywhere left a product whose variants pointed at
          // attribute values that were never created (MONEY-50).
          // ------------------------------------------------------------------
          const product = await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
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
                ...(variants.length > 0
                  ? {
                      variants: {
                        create: variants.map((variant) => {
                          const key = variant.id ?? '';
                          const uploaded = variantImageByKey.get(key);

                          return {
                            name: variant.name,
                            sku: variant.sku,
                            price: variant.price || 0,
                            discountPrice: variant.discountPrice ?? null,
                            stock: variant.stock,
                            attributes: variant.attributes,
                            imageUrl: uploaded?.imageUrl ?? null,
                            imagePublicId: uploaded?.imagePublicId ?? null,
                            // Phase 4 — Store uploaded image as variant image record
                            ...(uploaded
                              ? {
                                  variantImages: {
                                    create: {
                                      imageUrl: uploaded.imageUrl,
                                      imagePublicId: uploaded.imagePublicId,
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
                const option = await tx.productAttributeOption.create({
                  data: {
                    productId: product.id,
                    name: attr.name,
                    values: attr.values,
                    isVariantDefining: attr.isVariantDefining,
                    displayOrder: attr.displayOrder,
                  },
                });

                if (attr.attributeValues && attr.attributeValues.length > 0) {
                  for (const av of attr.attributeValues) {
                    const localValue = await tx.productAttributeValue.create({
                      data: {
                        optionId: option.id,
                        value: av.value,
                        slug: av.slug,
                        displayOrder: av.displayOrder ?? 0,
                        imageUrl: av.imageUrl ?? null,
                        imagePublicId: av.imagePublicId ?? null,
                        priceModifier: av.priceModifier ?? null,
                        ...(av.metadata != null
                          ? // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict; the shape is correct
                            { metadata: av.metadata as any }
                          : {}),
                      },
                    });

                    // FE-45: persist the canonical mapping when the vendor's
                    // local value was linked to a GlobalAttributeValue.
                    if (av.globalAttributeId && av.globalValueId) {
                      await tx.productGlobalAttributeValue.create({
                        data: {
                          productId: product.id,
                          globalAttributeId: av.globalAttributeId,
                          localValueId: localValue.id,
                          globalValueId: av.globalValueId,
                        },
                      });
                    }
                  }
                }
              }
            }

            // Phase 3 — Create ProductVariantAttribute join rows
            if (
              variants &&
              variants.length > 0 &&
              normalizedAttributes.length > 0
            ) {
              const options = await tx.productAttributeOption.findMany({
                where: { productId: product.id },
                include: { attributeValues: true },
              });
              const optionByName = new Map(options.map((o) => [o.name, o]));

              for (const variant of product.variants) {
                const attrRecord = variant.attributes as Record<string, string>;
                if (!attrRecord) continue;

                for (const [attrName, attrValue] of Object.entries(
                  attrRecord,
                )) {
                  const option = optionByName.get(attrName);
                  if (!option) continue;

                  const attrVal = option.attributeValues.find(
                    (av) => av.value === attrValue,
                  );
                  if (!attrVal) continue;

                  await tx.productVariantAttribute.create({
                    data: {
                      variantId: variant.id,
                      attributeValueId: attrVal.id,
                    },
                  });
                }
              }
            }

            return product;
          });

          // Nothing in the database references the uploads yet until the
          // transaction above commits, so from here on they are keepers.
          committed = true;

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
          // No product row exists, so nothing references these uploads.
          if (!committed && uploadedPublicIds.length > 0) {
            const results = await Promise.allSettled(
              uploadedPublicIds.map((id) => DeleteImage(id)),
            );
            const failed = results.filter(
              (r) => r.status === 'rejected',
            ).length;
            if (failed > 0) {
              logError(
                'product-create-cloudinary-cleanup',
                new Error(
                  `Could not delete ${failed}/${uploadedPublicIds.length} orphaned asset(s)`,
                ),
              );
            }
          }

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
