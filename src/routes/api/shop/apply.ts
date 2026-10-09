import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { DeleteImage, UploadImage } from '@/cloudinary';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { fallbackSlug, slugify } from '@/lib/slug';
import { ShopApiSchema } from '@/schemas/shop-schema';

export const Route = createFileRoute('/api/shop/apply')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // LIFE-11: track Cloudinary uploads so a failed shop write can clean
        // them up instead of leaking orphaned assets.
        let uploadedLogoPublicId: string | null = null;
        let uploadedBannerPublicId: string | null = null;

        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          const isReapply = existing?.status === 'REJECTED';
          if (existing && !isReapply) {
            return Response.json(
              { error: 'You already own a shop' },
              { status: 409 },
            );
          }

          const formData = await request.formData();

          // biome-ignore lint: error
          const data: Record<string, any> = {};
          for (const [key, value] of formData.entries()) {
            if (typeof value !== 'string') {
              data[key] = value;
            } else {
              data[key] = value;
            }
          }

          const textFields = { ...data };
          delete textFields.logo;
          delete textFields.banner;

          for (const key of Object.keys(textFields)) {
            if (textFields[key] === '') textFields[key] = undefined;
          }

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

          let baseSlug = slugify(parsed.data.name);
          if (!baseSlug) {
            baseSlug = fallbackSlug();
          }

          let slug = baseSlug;
          let counter = 1;
          for (;;) {
            const clash = await prisma.shop.findUnique({ where: { slug } });
            if (!clash || clash.id === existing?.id) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
          }

          const logoFile = data.logo;
          const bannerFile = data.banner;

          const validateImage = (file: File, label: string) => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
              throw new Error(`${label} must be JPEG, PNG, or WEBP`);
            }
            if (file.size > 2_097_152) {
              throw new Error(`${label} size must not exceed 2MB`);
            }
          };

          if (logoFile instanceof File && logoFile.size > 0) {
            validateImage(logoFile, 'Logo');
          }
          if (bannerFile instanceof File && bannerFile.size > 0) {
            validateImage(bannerFile, 'Banner');
          }

          let logoUrl: string | null = existing?.logoUrl ?? null;
          let logoPublicId: string | null = existing?.logoPublicId ?? null;
          let bannerUrl: string | null = existing?.bannerUrl ?? null;
          let bannerPublicId: string | null = existing?.bannerPublicId ?? null;

          if (logoFile instanceof File && logoFile.size > 0) {
            const result = await UploadImage(logoFile, 'shops');
            logoUrl = result.secure_url;
            logoPublicId = result.public_id;
            uploadedLogoPublicId = result.public_id;
          }

          if (bannerFile instanceof File && bannerFile.size > 0) {
            const result = await UploadImage(bannerFile, 'shops');
            bannerUrl = result.secure_url;
            bannerPublicId = result.public_id;
            uploadedBannerPublicId = result.public_id;
          }

          const shopFields = {
            name: parsed.data.name,
            slug,
            description: parsed.data.description || null,
            email: parsed.data.email,
            phone: parsed.data.phone || null,
            website: parsed.data.website || null,
            addressLine1: parsed.data.addressLine1 || null,
            addressLine2: parsed.data.addressLine2 || null,
            city: parsed.data.city || null,
            state: parsed.data.state || null,
            country: parsed.data.country || null,
            postalCode: parsed.data.postalCode || null,
            logoUrl,
            logoPublicId,
            bannerUrl,
            bannerPublicId,
          };

          const shop = isReapply
            ? await prisma.shop.update({
                where: { id: existing.id },
                data: {
                  ...shopFields,
                  status: 'PENDING',
                  rejectionReason: null,
                  approvedAt: null,
                  approvedBy: null,
                  suspendedAt: null,
                  suspendedReason: null,
                  suspendedBy: null,
                },
              })
            : await prisma.shop.create({
                data: {
                  ...shopFields,
                  status: 'PENDING',
                  ownerId: session.user.id,
                },
              });

          return Response.json(
            { message: 'Shop application submitted successfully', shop },
            { status: 200 },
          );
        } catch (error) {
          // LIFE-11: don't leak orphaned Cloudinary assets when an upload
          // succeeded but the shop write failed.
          if (uploadedLogoPublicId) {
            await DeleteImage(uploadedLogoPublicId).catch(() => {});
          }
          if (uploadedBannerPublicId) {
            await DeleteImage(uploadedBannerPublicId).catch(() => {});
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
