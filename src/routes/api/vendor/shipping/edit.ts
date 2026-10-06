import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import {
  findOverlappingZone,
  isFiniteNonNegative,
  normalizeZoneDistricts,
} from '@/lib/shipping-zone';

export const Route = createFileRoute('/api/vendor/shipping/edit')({
  server: {
    handlers: {
      PUT: async ({ request }) => {
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
            return Response.json({ error: 'No shop found' }, { status: 404 });
          }

          if (shop.status !== 'ACTIVE') {
            return Response.json(
              { error: 'Your shop must be active to manage shipping zones' },
              { status: 403 },
            );
          }

          const body = await request.json();
          const {
            id,
            name,
            districts,
            baseCost,
            perItem,
            freeAbove,
            estDays,
            isActive,
          } = body;

          if (!id) {
            return Response.json(
              { error: 'Zone ID is required' },
              { status: 400 },
            );
          }

          const existing = await prisma.shippingZone.findFirst({
            where: { id, shopId: shop.id },
          });

          if (!existing) {
            return Response.json(
              { error: 'Shipping zone not found' },
              { status: 404 },
            );
          }

          let normalizedDistricts: string[] | null = null;
          if (districts !== undefined) {
            normalizedDistricts = normalizeZoneDistricts(districts);
            if (!normalizedDistricts) {
              return Response.json(
                { error: 'Provide at least one valid Bangladesh district' },
                { status: 400 },
              );
            }

            const overlapping = await findOverlappingZone(
              shop.id,
              normalizedDistricts,
              id,
            );
            if (overlapping) {
              return Response.json(
                {
                  error: `District already covered by zone "${overlapping.name}": ${overlapping.districts.join(', ')}`,
                },
                { status: 409 },
              );
            }
          }

          if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
            return Response.json(
              { error: 'Name must be a non-empty string' },
              { status: 400 },
            );
          }

          if (baseCost !== undefined && !isFiniteNonNegative(baseCost)) {
            return Response.json(
              { error: 'Base cost must be a non-negative number' },
              { status: 400 },
            );
          }

          if (perItem !== undefined && !isFiniteNonNegative(perItem)) {
            return Response.json(
              { error: 'Per-item cost must be a non-negative number' },
              { status: 400 },
            );
          }

          if (
            freeAbove !== undefined &&
            freeAbove !== null &&
            freeAbove !== '' &&
            !isFiniteNonNegative(freeAbove)
          ) {
            return Response.json(
              { error: 'Free-above threshold must be a non-negative number' },
              { status: 400 },
            );
          }

          const zone = await prisma.shippingZone.update({
            where: { id },
            data: {
              ...(typeof name === 'string' && { name: name.trim() }),
              ...(baseCost !== undefined && { baseCost }),
              ...(perItem !== undefined && { perItem }),
              ...(freeAbove !== undefined && { freeAbove: freeAbove === '' ? null : freeAbove }),
              ...(typeof estDays === 'string' && { estDays }),
              ...(estDays === null && { estDays: null }),
              ...(typeof isActive === 'boolean' && { isActive }),
              ...(normalizedDistricts && {
                districts: {
                  deleteMany: {},
                  create: normalizedDistricts.map((district) => ({
                    district,
                  })),
                },
              }),
            },
            include: { districts: { select: { district: true } } },
          });

          return Response.json({
            zone: {
              ...zone,
              districts: zone.districts.map((d) => d.district),
            },
          });
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