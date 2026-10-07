import { prisma } from '@/lib/db';

type VendorShop = NonNullable<Awaited<ReturnType<typeof findShop>>>;

async function findShop(ownerId: string) {
  return prisma.shop.findUnique({ where: { ownerId } });
}

function inactiveResponse(status: string): Response {
  const detail =
    status === 'PENDING'
      ? 'pending approval'
      : status === 'REJECTED'
        ? 'rejected'
        : 'suspended';
  return Response.json(
    { error: `Your shop is ${detail} and cannot perform this action` },
    { status: 403 },
  );
}

/**
 * Vendor mutations (LIFE-14): only ACTIVE shops may write.
 * Reads stay allowed for suspended vendors so they can see their orders.
 *
 * Usage:
 *   const guard = await requireActiveVendorShop(session.user.id);
 *   if (guard.response) return guard.response;
 *   const shop = guard.shop;
 */
export async function requireActiveVendorShop(
  ownerId: string,
): Promise<
  { shop: VendorShop; response: null } | { shop: null; response: Response }
> {
  const shop = await findShop(ownerId);
  if (!shop) {
    return {
      shop: null,
      response: Response.json({ error: 'Shop not found' }, { status: 404 }),
    };
  }
  if (shop.status !== 'ACTIVE') {
    return { shop: null, response: inactiveResponse(shop.status) };
  }
  return { shop, response: null };
}
