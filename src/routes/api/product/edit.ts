import { createFileRoute } from '@tanstack/react-router';
import { DeleteImage, UploadImage } from '@/cloudinary';
import { requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import { slugify } from '@/lib/slug';
import { ProductApiEditSchema } from '@/schemas/product-api-schema';
import { SkuService } from '@/services/sku-service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2_097_152;

export const Route = createFileRoute('/api/product/edit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Assets uploaded during this request. Nothing in the database points at
        // them until the transaction commits, so if we fail we delete them
        // rather than leaking orphans into the bucket (MONEY-50).
        const uploadedPublicIds: string[] = [];
        let committed = false;
        // `variants` is absent from the payload on any edit that does not touch
        // variants. Zod's `.default([])` would turn that into an empty array,
        // which reads as "the vendor deleted every variant" — so track whether
        // the field was actually sent.
        let variantsProvided = false;

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
              { error: 'You need an active shop to edit products' },
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
              key === 'featured' ||
              key === 'keepExistingImage'
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
                if (key === 'variants') variantsProvided = true;
              } catch (error) {
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to parse JSON field:', error);
                data[key] = undefined;
              }
            } else if (key === 'removedGalleryIds') {
              try {
                data[key] = JSON.parse(value as string);
              } catch (error) {
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to parse removed gallery IDs:', error);
                data[key] = [];
              }
            } else if (key === 'tags') {
              if (!data.tags) data.tags = [];
              (data.tags as string[]).push(value as string);
            } else {
              data[key] = value;
            }
          }

          const productId = data.id as string;
          if (!productId) {
            return Response.json(
              { error: 'Product ID is required' },
              { status: 400 },
            );
          }

          const existing = await prisma.product.findUnique({
            where: { id: productId },
            include: {
              images: true,
              variants: true,
              attributeOptions: { include: { attributeValues: true } },
            },
          });

          if (!existing) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          if (existing.shopId !== shop.id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          // Normalize optional category field
          if (!data.category && data.categoryId) {
            data.category = data.categoryId;
          }

          // Validate parsed data against schema
          const parsed = ProductApiEditSchema.safeParse(data);
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

          // Validate SKU format if provided
          if (v.sku && !SkuService.isValidSku(v.sku)) {
            return Response.json(
              {
                error: 'Invalid SKU format. Expected pattern like CAT-PRD-001',
              },
              { status: 400 },
            );
          }

          // Check SKU uniqueness if changed
          if (v.sku && v.sku !== existing.sku) {
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
          }

          // Map field names
          const categoryId = v.category || existing.categoryId;

          // Handle dimensions
          const dims = v.dimensions;
          let dimensionLength = existing.dimensionLength;
          let dimensionWidth = existing.dimensionWidth;
          let dimensionHeight = existing.dimensionHeight;
          let dimensionUnit = existing.dimensionUnit;

          if (dims && dims.length !== undefined) {
            dimensionLength = dims.length ?? existing.dimensionLength;
            dimensionWidth = dims.width ?? existing.dimensionWidth;
            dimensionHeight = dims.height ?? existing.dimensionHeight;
            dimensionUnit = dims.unit || existing.dimensionUnit;
          }

          // Generate slug if name changed
          const nameChanged = v.productName !== existing.productName;
          let slug = existing.slug;
          if (nameChanged) {
            const baseSlug = slugify(v.productName ?? '');
            if (!baseSlug) {
              return Response.json(
                { error: 'Invalid product name — unable to generate slug' },
                { status: 400 },
              );
            }
            slug = baseSlug;
            let counter = 1;
            while (
              await prisma.product.findUnique({
                where: { slug, NOT: { id: productId } },
              })
            ) {
              slug = `${baseSlug}-${counter}`;
              counter++;
            }
          }

          // ------------------------------------------------------------------
          // Stock guards.
          //
          // `reservedStock` holds units for bKash checkouts that have not been
          // captured yet. Writing the form's absolute stock over it silently
          // releases those holds and lets the same unit be sold twice
          // (MONEY-34). Reject rather than clamp, so the vendor is told instead
          // of quietly losing inventory.
          // ------------------------------------------------------------------
          const variants = variantsProvided ? v.variants : undefined;
          const incomingVariantIds = new Set(
            (variants ?? [])
              .map((x) => x.id)
              .filter((id): id is string => Boolean(id)),
          );

          // When the payload says nothing about variants every existing variant
          // is still alive, so every one of their reservations counts against
          // the product-level stock the vendor is setting.
          const survivingReserved = existing.variants
            .filter((ev) => !variantsProvided || incomingVariantIds.has(ev.id))
            .reduce((sum, ev) => sum + ev.reservedStock, 0);

          if (v.stock !== undefined && v.stock < survivingReserved) {
            return Response.json(
              {
                error: `Stock cannot be set below ${survivingReserved} — that many units are reserved for pending orders. Cancel those orders first.`,
              },
              { status: 400 },
            );
          }

          for (const variant of variants ?? []) {
            if (!variant.id) continue;
            const current = existing.variants.find(
              (ev) => ev.id === variant.id,
            );
            if (!current) continue;

            if (variant.stock < current.reservedStock) {
              return Response.json(
                {
                  error: `Variant "${variant.name}" stock cannot be set below ${current.reservedStock} — that many units are reserved for pending orders.`,
                },
                { status: 400 },
              );
            }
          }

          // ------------------------------------------------------------------
          // Images: validate everything before uploading anything, so a bad
          // file late in the list cannot strand the uploads already done.
          // ------------------------------------------------------------------
          // Default to *keeping* the gallery. Treating an absent flag as false
          // deleted every product image on any edit whose form happened not to
          // send the field, then deleted the Cloudinary assets to match.
          const keepExistingImage = v.keepExistingImage !== false;
          const productImages = data.productImages as File[] | undefined;
          const variantImages = data.variantImages as
            | Record<string, File>
            | undefined;

          // Only ever remove images that actually belong to this product.
          const removedImageIds = (v.removedGalleryIds ?? []).filter((id) =>
            existing.images.some((img) => img.id === id),
          );

          const pendingUploads: Array<{ file: File; label: string }> = [];
          productImages?.forEach((file, i) => {
            if (file instanceof File && file.size > 0) {
              pendingUploads.push({ file, label: `Image ${i + 1}` });
            }
          });
          for (const variant of variants ?? []) {
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

          const survivingImageCount =
            existing.images.length - removedImageIds.length;

          const uploadedProductImages: Array<{
            imageUrl: string;
            imagePublicId: string;
            order: number;
          }> = [];

          for (let i = 0; i < (productImages?.length ?? 0); i++) {
            const file = productImages?.[i];
            if (!(file instanceof File) || file.size === 0) continue;

            const result = await UploadImage(file, 'products');
            uploadedPublicIds.push(result.public_id);
            uploadedProductImages.push({
              imageUrl: result.secure_url,
              imagePublicId: result.public_id,
              order: survivingImageCount + uploadedProductImages.length,
            });
          }

          const uploadedVariantImages = new Map<
            string,
            { imageUrl: string; imagePublicId: string }
          >();

          for (const variant of variants ?? []) {
            const file = variantImages?.[variant.id ?? ''];
            if (!(file instanceof File) || file.size === 0) continue;

            const result = await UploadImage(file, 'products/variants');
            uploadedPublicIds.push(result.public_id);
            if (variant.id) {
              uploadedVariantImages.set(variant.id, {
                imageUrl: result.secure_url,
                imagePublicId: result.public_id,
              });
            }
          }

          // Cloudinary assets that become unreferenced once the transaction
          // lands. Deleting them *after* commit is the whole point: deleting
          // first left the database pointing at images that no longer existed
          // whenever the write then failed (MONEY-33).
          const supersededVariantPublicIds: string[] = [];

          // ------------------------------------------------------------------
          // One transaction for every database write.
          //
          // These used to be independent autocommit statements, so a failure
          // halfway through left the product with its attributes and variants
          // already deleted (MONEY-32).
          // ------------------------------------------------------------------
          const product = await prisma.$transaction(async (tx) => {
            // ---- Variants the vendor removed from the form ----
            if (variants) {
              const removedVariantIds = existing.variants
                .filter((ev) => !incomingVariantIds.has(ev.id))
                .map((ev) => ev.id);

              if (removedVariantIds.length > 0) {
                const referenced = await tx.orderItem.findMany({
                  where: { variantId: { in: removedVariantIds } },
                  select: { variantId: true },
                  distinct: ['variantId'],
                });
                const referencedIds = new Set(
                  referenced
                    .map((r) => r.variantId)
                    .filter((id): id is string => Boolean(id)),
                );

                // OrderItem.variant is onDelete: Restrict, so deleting a variant
                // an order references throws. Retire those instead of failing
                // the whole save, and never keep them sellable.
                //
                // A live `reservedStock` blocks deletion for the same reason:
                // the row is the only record that those units are held for an
                // in-flight bKash payment, and dropping it would sell stock
                // that is already spoken for.
                const reservedByVariant = new Map(
                  existing.variants.map((ev) => [ev.id, ev.reservedStock]),
                );
                const isHeld = (id: string) =>
                  (reservedByVariant.get(id) ?? 0) > 0;

                const removable = removedVariantIds.filter(
                  (id) => !referencedIds.has(id) && !isHeld(id),
                );
                const retired = removedVariantIds.filter(
                  (id) => referencedIds.has(id) || isHeld(id),
                );

                // These rows are going away, so their Cloudinary assets become
                // unreferenced. Collected here, deleted after commit.
                for (const id of removable) {
                  const variant = existing.variants.find((ev) => ev.id === id);
                  if (variant?.imagePublicId) {
                    supersededVariantPublicIds.push(variant.imagePublicId);
                  }
                }

                if (removable.length > 0) {
                  await tx.productVariant.deleteMany({
                    where: { id: { in: removable } },
                  });
                }
                if (retired.length > 0) {
                  await tx.productVariant.updateMany({
                    where: { id: { in: retired } },
                    data: { status: 'DISCONTINUED' },
                  });
                }
              }
            }

            // ---- Attribute options ----
            //
            // Upserted rather than deleted and recreated. Recreating changed
            // every ProductAttributeValue id, and those ids are what
            // ProductVariantAttribute rows point at, so saving an unrelated
            // field silently detached every variant from its attributes — and
            // deleting them outright trips the Restrict on that same relation.
            const attributes = v.attributes;
            if (attributes) {
              const isNewAttributeFormat =
                Object.keys(attributes).length > 0 &&
                typeof Object.values(attributes)[0] === 'object' &&
                !Array.isArray(Object.values(attributes)[0]);

              const normalizedAttributes = Object.entries(attributes).map(
                ([name, value]) => {
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
                      values: entry.values.map((av) => av.value),
                      isVariantDefining: entry.isVariantDefining ?? true,
                      displayOrder: entry.displayOrder ?? 0,
                      attributeValues: entry.values.map((av) => ({
                        value: av.value,
                        slug: av.slug,
                        displayOrder: av.displayOrder ?? 0,
                        imageUrl: av.imageUrl ?? null,
                        imagePublicId: av.imagePublicId ?? null,
                        ...(av.metadata != null
                          ? // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict
                            { metadata: av.metadata as any }
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
                },
              );

              for (const attr of normalizedAttributes) {
                const option = await tx.productAttributeOption.upsert({
                  where: { productId_name: { productId, name: attr.name } },
                  create: {
                    productId,
                    name: attr.name,
                    values: attr.values,
                    isVariantDefining: attr.isVariantDefining,
                    displayOrder: attr.displayOrder,
                  },
                  update: {
                    values: attr.values,
                    isVariantDefining: attr.isVariantDefining,
                    displayOrder: attr.displayOrder,
                  },
                });

                if (!attr.attributeValues) continue;

                for (const av of attr.attributeValues) {
                  await tx.productAttributeValue.upsert({
                    where: {
                      optionId_slug: { optionId: option.id, slug: av.slug },
                    },
                    create: {
                      optionId: option.id,
                      value: av.value,
                      slug: av.slug,
                      displayOrder: av.displayOrder ?? 0,
                      imageUrl: av.imageUrl ?? null,
                      imagePublicId: av.imagePublicId ?? null,
                      ...(av.metadata != null
                        ? // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict
                          { metadata: av.metadata as any }
                        : {}),
                    },
                    update: {
                      value: av.value,
                      displayOrder: av.displayOrder ?? 0,
                      imageUrl: av.imageUrl ?? null,
                      imagePublicId: av.imagePublicId ?? null,
                      ...(av.metadata != null
                        ? // biome-ignore lint/suspicious/noExplicitAny: Prisma JSON types are strict
                          { metadata: av.metadata as any }
                        : {}),
                    },
                  });
                }
              }
            }

            // ---- Variants: update in place, create the new ones ----
            const resultingVariantIds: string[] = [];

            for (const variant of variants ?? []) {
              const current = variant.id
                ? existing.variants.find((ev) => ev.id === variant.id)
                : undefined;
              const uploaded = variant.id
                ? uploadedVariantImages.get(variant.id)
                : undefined;

              const shared = {
                name: variant.name,
                sku: variant.sku,
                price: variant.price || 0,
                discountPrice: variant.discountPrice ?? null,
                attributes: variant.attributes,
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

              if (current) {
                // reservedStock is server-owned and deliberately omitted: an
                // in-flight bKash hold must survive a catalog edit.
                await tx.productVariant.update({
                  where: { id: current.id },
                  data: {
                    ...shared,
                    stock: variant.stock,
                    // Only overwrite the image when a new file was actually
                    // uploaded. Writing null unconditionally wiped the variant
                    // image on every unrelated edit.
                    ...(uploaded
                      ? {
                          imageUrl: uploaded.imageUrl,
                          imagePublicId: uploaded.imagePublicId,
                        }
                      : {}),
                  },
                });

                resultingVariantIds.push(current.id);

                if (uploaded) {
                  await tx.productVariantImage.create({
                    data: {
                      variantId: current.id,
                      imageUrl: uploaded.imageUrl,
                      imagePublicId: uploaded.imagePublicId,
                      altText: variant.name,
                      order: 0,
                    },
                  });
                  if (current.imagePublicId) {
                    supersededVariantPublicIds.push(current.imagePublicId);
                  }
                }
              } else {
                const created = await tx.productVariant.create({
                  data: {
                    ...shared,
                    productId,
                    stock: variant.stock,
                    imageUrl: uploaded?.imageUrl ?? null,
                    imagePublicId: uploaded?.imagePublicId ?? null,
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
                  },
                });

                resultingVariantIds.push(created.id);
              }
            }

            // ---- Variant ↔ attribute-value joins ----
            if (resultingVariantIds.length > 0) {
              const options = await tx.productAttributeOption.findMany({
                where: { productId },
                include: { attributeValues: true },
              });

              const valueIdByNameAndValue = new Map<string, string>();
              for (const option of options) {
                for (const av of option.attributeValues) {
                  valueIdByNameAndValue.set(
                    `${option.name}::${av.value}`,
                    av.id,
                  );
                }
              }

              const variantsForJoin = await tx.productVariant.findMany({
                where: { id: { in: resultingVariantIds } },
              });

              for (const variant of variantsForJoin) {
                // Replace rather than merge: re-pointing the join rows is what
                // keeps them consistent when the vendor changes a variant's
                // attributes.
                await tx.productVariantAttribute.deleteMany({
                  where: { variantId: variant.id },
                });

                const attrRecord = variant.attributes as Record<
                  string,
                  string
                > | null;
                if (!attrRecord) continue;

                for (const [attrName, attrValue] of Object.entries(
                  attrRecord,
                )) {
                  const attributeValueId = valueIdByNameAndValue.get(
                    `${attrName}::${attrValue}`,
                  );
                  if (!attributeValueId) continue;

                  await tx.productVariantAttribute.create({
                    data: { variantId: variant.id, attributeValueId },
                  });
                }
              }
            }

            // ---- Product images ----
            const supersededProductPublicIds: string[] = [];

            if (!keepExistingImage) {
              // Replace wholesale. This used to run only when new files were
              // also present, so clearing the gallery without uploading
              // anything silently kept the old rows.
              const survivors = existing.images.filter(
                (img) => !removedImageIds.includes(img.id),
              );
              for (const img of survivors) {
                if (img.imagePublicId) {
                  supersededProductPublicIds.push(img.imagePublicId);
                }
              }
              await tx.productImage.deleteMany({ where: { productId } });
            } else if (removedImageIds.length > 0) {
              for (const id of removedImageIds) {
                const img = existing.images.find((i) => i.id === id);
                if (img?.imagePublicId) {
                  supersededProductPublicIds.push(img.imagePublicId);
                }
              }
              await tx.productImage.deleteMany({
                where: { id: { in: removedImageIds }, productId },
              });
            }

            if (uploadedProductImages.length > 0) {
              await tx.productImage.createMany({
                data: uploadedProductImages.map((img) => ({
                  ...img,
                  productId,
                })),
              });
            }

            // ---- The product row ----
            const updated = await tx.product.update({
              where: { id: productId },
              data: {
                productName: v.productName ?? existing.productName,
                slug,
                description: v.description ?? existing.description,
                categoryId,
                tags: v.tags ?? existing.tags,
                sku: v.sku ?? existing.sku,
                brand: v.brand ?? existing.brand,
                price: v.price ?? existing.price,
                discountPrice: v.discountPrice ?? existing.discountPrice,
                stock: v.stock ?? existing.stock,
                hasVariants: variantsProvided
                  ? (variants?.length ?? 0) > 0
                  : existing.hasVariants,
                condition:
                  (v.condition as
                    | 'NEW'
                    | 'USED'
                    | 'LIKE_NEW'
                    | 'EXCELLENT'
                    | 'GOOD'
                    | 'FAIR'
                    | 'POOR'
                    | 'FOR_PARTS') ?? existing.condition,
                conditionDescription:
                  v.conditionDescription ?? existing.conditionDescription,
                weight: v.weight ?? existing.weight,
                weightUnit: v.weightUnit ?? existing.weightUnit,
                freeShipping: v.freeShipping ?? existing.freeShipping,
                dimensionLength,
                dimensionWidth,
                dimensionHeight,
                dimensionUnit,
                metaTitle: v.metaTitle ?? existing.metaTitle,
                metaDescription: v.metaDescription ?? existing.metaDescription,
                status:
                  (v.status as
                    | 'DRAFT'
                    | 'PUBLISHED'
                    | 'REJECTED'
                    | 'ARCHIVED'
                    | 'OUT_OF_STOCK') ?? existing.status,
                featured: v.featured ?? existing.featured,
              },
              include: {
                images: { orderBy: { order: 'asc' } },
                category: true,
                variants: {
                  include: {
                    variantImages: { orderBy: { order: 'asc' } },
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
                attributeOptions: { include: { attributeValues: true } },
              },
            });

            return { product: updated, supersededProductPublicIds };
          });

          committed = true;

          // ------------------------------------------------------------------
          // Database no longer references these, so they can finally go. Logged
          // rather than swallowed: a failure here leaves a paid-for asset in
          // the bucket, which is worth knowing about (MONEY-33).
          // ------------------------------------------------------------------
          const orphanedPublicIds = [
            ...product.supersededProductPublicIds,
            ...supersededVariantPublicIds,
          ].filter((id): id is string => Boolean(id));

          if (orphanedPublicIds.length > 0) {
            const results = await Promise.allSettled(
              orphanedPublicIds.map((id) => DeleteImage(id)),
            );
            const failed = results.filter(
              (r) => r.status === 'rejected',
            ).length;
            if (failed > 0) {
              logError(
                'product-edit-cloudinary-cleanup',
                new Error(
                  `Deleted ${orphanedPublicIds.length - failed}/${orphanedPublicIds.length} superseded asset(s) for product ${productId}`,
                ),
              );
            }
          }

          return Response.json(
            {
              message: 'Product updated successfully',
              product: product.product,
            },
            { status: 200 },
          );
        } catch (error) {
          // Nothing committed, so these uploads are referenced by nothing.
          if (!committed && uploadedPublicIds.length > 0) {
            await Promise.allSettled(
              uploadedPublicIds.map((id) => DeleteImage(id)),
            );
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
