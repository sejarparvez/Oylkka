import { createFileRoute } from '@tanstack/react-router';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';

/**
 * FE-45: auth-free read of the GlobalAttribute taxonomy for the vendor product
 * form. Vendors still author their own local attribute values — the global
 * values are the canonical labels they can map to, which is what lets the
 * catalog aggregate/filter across vendors consistently. This endpoint is the
 * read half of the mapping; the write half lives in the product create/edit
 * APIs (`ProductGlobalAttributeValue`).
 */
export const Route = createFileRoute('/api/global-attributes/')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const attributes = await prisma.globalAttribute.findMany({
            orderBy: { displayOrder: 'asc' },
            take: 100,
            include: { values: { orderBy: { value: 'asc' } } },
          });
          return Response.json({ attributes });
        } catch (error) {
          logError('global attributes read failed', error);
          return Response.json({ attributes: [] }, { status: 500 });
        }
      },
    },
  },
});
