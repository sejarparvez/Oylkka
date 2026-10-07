import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import type { Prisma } from '@/generated/prisma/client';
import { DeleteImage } from '@/cloudinary/delete-image';
import { UploadImage } from '@/cloudinary/upload-image';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { ShopApiSchema } from '@/schemas/shop-schema';

const MAX_IMAGE_BYTES = 2_097_152;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateImage(file: File, label: string): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `${label} must be JPEG, PNG, or WEBP`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${label} size must not exceed 2MB`;
  }
  return null;
}

export const Route = createFileRoute('/api/shop/update')({
  server: {
    handlers: {
      PATCH: async ({ request }) => {
        const uploadedPublicIds: string[] = [];
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          const formData = await request.formData();

          const data: Record<string, unknown> = {};
          for (const [key, value] of formData.entries()) {
            data[key] = value;
          }

          const textFields = { ...data };
          delete textFields.logo;
          delete textFields.banner;
          delete textFields.keepExistingLogo;
          delete textFields.keepExistingBanner;
          delete textFields.hasExistingLogo;
          delete textFields.hasExistingBanner;

          // Presence of a key means "the client intends to set (or clear)
          // this field"; absent keys keep their current value.
          const presentKeys = new Set(Object.keys(textFields));

          for (const key of Object.keys(textFields)) {
            if (textFields[key] === '') textFields[key] = undefined;
          }

          // Schema-required fields default to current values so callers can
          // send any subset of keys (e.g. shippingCost only). presentKeys is
          // captured above, so these defaults are never written back.
          if (textFields.name === undefined) textFields.name = shop.name;
          if (textFields.email === undefined) textFields.email = shop.email;

          const parsed = ShopApiSchema.safeParse(textFields);
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten(),
              },
              { status: 400 },
            );
          }

          const logoFile = data.logo;
          const bannerFile = data.banner;

          const logoError =
            logoFile instanceof File && logoFile.size > 0
              ? validateImage(logoFile, 'Logo')
              : null;
          const bannerError =
            bannerFile instanceof File && bannerFile.size > 0
              ? validateImage(bannerFile, 'Banner')
              : null;
          const imageError = logoError ?? bannerError;
          if (imageError) {
            return Response.json({ error: imageError }, { status: 400 });
          }

          const keepLogo =
            data.keepExistingLogo == null ||
            data.keepExistingLogo === 'true' ||
            data.keepExistingLogo === true;
          const keepBanner =
            data.keepExistingBanner == null ||
            data.keepExistingBanner === 'true' ||
            data.keepExistingBanner === true;

          let logoUrl = shop.logoUrl;
          let logoPublicId = shop.logoPublicId;
          let bannerUrl = shop.bannerUrl;
          let bannerPublicId = shop.bannerPublicId;

          if (logoFile instanceof File && logoFile.size > 0) {
            const result = await UploadImage(logoFile, 'shops');
            uploadedPublicIds.push(result.public_id);
            const oldPublicId = shop.logoPublicId;
            logoUrl = result.secure_url;
            logoPublicId = result.public_id;
            if (oldPublicId) await DeleteImage(oldPublicId).catch(() => {});
          } else if (!keepLogo && shop.logoPublicId) {
            await DeleteImage(shop.logoPublicId).catch(() => {});
            logoUrl = null;
            logoPublicId = null;
          }

          if (bannerFile instanceof File && bannerFile.size > 0) {
            const result = await UploadImage(bannerFile, 'shops');
            uploadedPublicIds.push(result.public_id);
            const oldPublicId = shop.bannerPublicId;
            bannerUrl = result.secure_url;
            bannerPublicId = result.public_id;
            if (oldPublicId) await DeleteImage(oldPublicId).catch(() => {});
          } else if (!keepBanner && shop.bannerPublicId) {
            await DeleteImage(shop.bannerPublicId).catch(() => {});
            bannerUrl = null;
            bannerPublicId = null;
          }

          const fields: Prisma.ShopUpdateInput = {};
          if (presentKeys.has('name')) fields.name = parsed.data.name;
          if (presentKeys.has('description')) {
            fields.description = parsed.data.description || null;
          }
          if (presentKeys.has('email')) fields.email = parsed.data.email;
          if (presentKeys.has('phone'))
            fields.phone = parsed.data.phone || null;
          if (presentKeys.has('website')) {
            fields.website = parsed.data.website || null;
          }
          if (presentKeys.has('addressLine1')) {
            fields.addressLine1 = parsed.data.addressLine1 || null;
          }
          if (presentKeys.has('addressLine2')) {
            fields.addressLine2 = parsed.data.addressLine2 || null;
          }
          if (presentKeys.has('city')) fields.city = parsed.data.city || null;
          if (presentKeys.has('state'))
            fields.state = parsed.data.state || null;
          if (presentKeys.has('country')) {
            fields.country = parsed.data.country || null;
          }
          if (presentKeys.has('postalCode')) {
            fields.postalCode = parsed.data.postalCode || null;
          }
          // Vendor-owned flat shipping fallback (LIFE-13). Commission rate
          // is deliberately NOT accepted here — admin-only.
          if (
            presentKeys.has('shippingCost') &&
            parsed.data.shippingCost !== undefined
          ) {
            fields.shippingCost = parsed.data.shippingCost;
          }

          const imagesChanged =
            logoUrl !== shop.logoUrl ||
            logoPublicId !== shop.logoPublicId ||
            bannerUrl !== shop.bannerUrl ||
            bannerPublicId !== shop.bannerPublicId;
          if (imagesChanged) {
            fields.logoUrl = { set: logoUrl };
            fields.logoPublicId = { set: logoPublicId };
            fields.bannerUrl = { set: bannerUrl };
            fields.bannerPublicId = { set: bannerPublicId };
          }

          if (Object.keys(fields).length === 0) {
            return Response.json(
              { message: 'Nothing to update', shop },
              { status: 200 },
            );
          }

          const updated = await prisma.shop.update({
            where: { id: shop.id },
            data: fields,
          });

          return Response.json(
            { message: 'Shop updated successfully', shop: updated },
            { status: 200 },
          );
        } catch (error) {
          // Roll back assets uploaded during a failed request so nothing
          // is orphaned in Cloudinary.
          for (const publicId of uploadedPublicIds) {
            await DeleteImage(publicId).catch(() => {});
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
