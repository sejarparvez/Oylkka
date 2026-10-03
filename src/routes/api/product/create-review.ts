import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { UploadImage } from '@/cloudinary';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { reviewLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

const MAX_IMAGES = 3;

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  content: z.string().min(10).max(1000),
});

export const Route = createFileRoute('/api/product/create-review')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const rateLimitResponse = await checkRateLimit(
            reviewLimiter,
            `user:${session.user.id}`,
          );
          if (rateLimitResponse) return rateLimitResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const formData = await request.formData();

          const parsed = reviewSchema.safeParse({
            productId: formData.get('productId'),
            rating: formData.get('rating'),
            title: (formData.get('title') as string) || undefined,
            content: formData.get('content'),
          });

          if (!parsed.success) {
            const firstError = parsed.error.issues[0];
            return Response.json(
              { error: firstError?.message || 'Invalid review' },
              { status: 400 },
            );
          }

          const { productId, rating, title, content } = parsed.data;

          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
          });
          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          const existingReview = await prisma.review.findFirst({
            where: { productId, userId: session.user.id },
            select: { id: true },
          });
          if (existingReview) {
            return Response.json(
              { error: 'You have already reviewed this product' },
              { status: 409 },
            );
          }

          // Only customers who actually received the product may review it.
          const purchasedItem = await prisma.orderItem.findFirst({
            where: {
              productId,
              fulfillmentStatus: 'DELIVERED',
              order: { customerId: session.user.id },
              review: null,
            },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          });

          if (!purchasedItem) {
            return Response.json(
              {
                error:
                  'You can only review products you have purchased and received',
              },
              { status: 403 },
            );
          }

          const imageEntries = formData
            .getAll('images')
            .filter((v): v is File => v instanceof File && v.size > 0)
            .slice(0, MAX_IMAGES);

          const uploaded = [];
          for (const file of imageEntries) {
            uploaded.push(await UploadImage(file, 'reviews'));
          }

          const review = await prisma.review.create({
            data: {
              productId,
              userId: session.user.id,
              orderItemId: purchasedItem.id,
              rating,
              title: title || null,
              content,
              verified: true,
              images: {
                create: uploaded.map((image, index) => ({
                  imageUrl: image.secure_url,
                  imagePublicId: image.public_id,
                  order: index,
                })),
              },
            },
            include: { images: true },
          });

          return Response.json({ review }, { status: 201 });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
