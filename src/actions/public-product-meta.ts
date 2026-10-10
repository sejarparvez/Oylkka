import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { prisma } from '@/lib/db';

const SlugSchema = z.object({
  slug: z.string().min(1),
});

/**
 * Minimal public product metadata for social sharing / SEO head tags. Mirrors
 * the visibility rules of `/api/product/public-single` (PUBLISHED product in an
 * ACTIVE shop) so the shared `og:` tags always describe a page a crawler can
 * actually open. Errors degrade to `null` — a broken head is worse than a
 * generic fallback.
 */
export type PublicProductMeta = {
  productName: string;
  metaTitle: string | null;
  metaDescription: string | null;
  description: string;
  imageUrl: string | null;
} | null;

export const getPublicProductMeta = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => SlugSchema.parse(data))
  .handler(async ({ data }): Promise<PublicProductMeta> => {
    const { slug } = data;

    try {
      const product = await prisma.product.findFirst({
        where: {
          slug,
          status: 'PUBLISHED',
          shop: { status: 'ACTIVE' },
        },
        select: {
          productName: true,
          metaTitle: true,
          metaDescription: true,
          description: true,
          images: {
            orderBy: { order: 'asc' },
            take: 1,
            select: { imageUrl: true },
          },
        },
      });

      if (!product) return null;

      return {
        productName: product.productName,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        description: product.description,
        imageUrl: product.images[0]?.imageUrl ?? null,
      };
    } catch {
      return null;
    }
  });
