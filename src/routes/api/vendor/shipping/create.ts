import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { generalLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import {
  findOverlappingZone,
  isFiniteNonNegative,
  normalizeZoneDistricts,
} from '@/lib/shipping-zone';

export const Route = createFileRoute('/api/vendor/shipping/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const rateLimitResponse = await checkRateLimit(generalLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
          });

          if (!shop) {
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          if (shop.status !== 'ACTIVE') {
            return Response.json(
              { error: 'Your shop must be active to manage shipping zones' },
              { status: 403 },
            );
          }

          const body = await request.json();
          const { name, districts, baseCost, perItem, freeAbove, estDays } =
            body;

          if (typeof name !== 'string' || name.trim().length === 0) {
            return Response.json(
              { error: 'Name is required' },
              { status: 400 },
            );
          }

          const normalizedDistricts = normalizeZoneDistricts(districts);
          if (!normalizedDistricts) {
            return Response.json(
              { error: 'Provide at least one valid Bangladesh district' },
              { status: 400 },
            );
          }

          if (!isFiniteNonNegative(baseCost)) {
            return Response.json(
              { error: 'Base cost must be a non-negative number' },
              { status: 400 },
            );
          }

          if (perItem != null && !isFiniteNonNegative(perItem)) {
            return Response.json(
              { error: 'Per-item cost must be a non-negative number' },
              { status: 400 },
            );
          }

          if (
            freeAbove != null &&
            freeAbove !== '' &&
            !isFiniteNonNegative(freeAbove)
          ) {
            return Response.json(
              { error: 'Free-above threshold must be a non-negative number' },
              { status: 400 },
            );
          }

          const overlapping = await findOverlappingZone(
            shop.id,
            normalizedDistricts,
          );
          if (overlapping) {
            return Response.json(
              {
                error: `District already covered by zone "${overlapping.name}": ${overlapping.districts.join(', ')}`,
              },
              { status: 409 },
            );
          }

          const zone = await prisma.shippingZone.create({
            data: {
              shopId: shop.id,
              name: name.trim(),
              baseCost,
              perItem: isFiniteNonNegative(perItem) ? perItem : 0,
              freeAbove:
                typeof freeAbove === 'number' ? freeAbove : null,
              estDays: typeof estDays === 'string' ? estDays : null,
              districts: {
                create: normalizedDistricts.map((district) => ({
                  district,
                })),
              },
            },
            include: { districts: { select: { district: true } } },
          });

          return Response.json(
            {
              zone: {
                ...zone,
                districts: zone.districts.map((d) => d.district),
              },
            },
            { status: 201 },
          );
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