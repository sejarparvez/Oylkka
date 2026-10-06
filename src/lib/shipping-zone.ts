import { prisma } from '@/lib/db';
import { BD_DISTRICTS } from '@/lib/bd-districts';

const VALID_DISTRICTS = new Set(BD_DISTRICTS);

/**
 * Validates a `districts` payload against the trusted list of Bangladesh
 * districts (MONEY-66). Returns the deduplicated set of valid district names,
 * or `null` when the payload is malformed or contains an unknown district.
 */
export function normalizeZoneDistricts(districts: unknown): string[] | null {
  if (!Array.isArray(districts) || districts.length === 0) return null;

  const unique = new Set<string>();
  for (const district of districts) {
    if (typeof district !== 'string' || !VALID_DISTRICTS.has(district)) {
      return null;
    }
    unique.add(district);
  }
  return [...unique];
}

export function isFiniteNonNegative(value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export async function findOverlappingZone(
  shopId: string,
  districts: string[],
  excludeZoneId?: string,
): Promise<{ name: string; districts: string[] } | null> {
  const zones = await prisma.shippingZone.findMany({
    where: {
      shopId,
      ...(excludeZoneId ? { id: { not: excludeZoneId } } : {}),
    },
    select: {
      name: true,
      districts: { select: { district: true } },
    },
  });

  for (const zone of zones) {
    for (const d of zone.districts) {
      if (districts.includes(d.district)) {
        return {
          name: zone.name,
          districts: zone.districts.map((x) => x.district),
        };
      }
    }
  }

  return null;
}