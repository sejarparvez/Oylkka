import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import {
  requireAdmin,
  requireAdminOrManager,
  requireAuth,
} from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/admin/coupons/$id')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const coupon = await prisma.coupon.findUnique({
            where: { id: params.id },
            include: {
              tiers: { orderBy: { minQuantity: 'asc' } },
              _count: { select: { usages: true } },
            },
          });

          if (!coupon) {
            return Response.json(
              { error: 'Coupon not found' },
              { status: 404 },
            );
          }

          return Response.json({ coupon });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          // AUTH-09: authenticate through requireAuth so the per-actor admin
          // limiter applies to this mutating handler too.
          const headers = getRequestHeaders();
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;
          const roleResponse = requireAdminOrManager(session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.coupon.findUnique({
            where: { id: params.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Coupon not found' },
              { status: 404 },
            );
          }

          const body = await request.json();
          const {
            code,
            description,
            type,
            value,
            minOrderAmount,
            maxDiscount,
            minQuantity,
            freeShipping,
            shippingDiscount,
            bogoBuyQty,
            bogoFreeQty,
            scope,
            scopeId,
            maxUses,
            maxUsesPerUser,
            maxClaimCount,
            firstOrderOnly,
            repeatPurchaseOnly,
            requiredPaymentMethod,
            platformRestriction,
            autoApply,
            startsAt,
            expiresAt,
            isActive,
            tiers,
          } = body;

          if (code && code.toUpperCase() !== existing.code) {
            const duplicate = await prisma.coupon.findUnique({
              where: { code: code.toUpperCase() },
            });
            if (duplicate) {
              return Response.json(
                { error: 'A coupon with this code already exists' },
                { status: 409 },
              );
            }
          }

          const coupon = await prisma.coupon.update({
            where: { id: params.id },
            data: {
              ...(code !== undefined && { code: code.toUpperCase() }),
              ...(description !== undefined && { description }),
              ...(type !== undefined && { type }),
              ...(value !== undefined && { value }),
              ...(minOrderAmount !== undefined && {
                minOrderAmount: minOrderAmount || null,
              }),
              ...(maxDiscount !== undefined && {
                maxDiscount: maxDiscount || null,
              }),
              ...(minQuantity !== undefined && {
                minQuantity: minQuantity || null,
              }),
              ...(freeShipping !== undefined && { freeShipping }),
              ...(shippingDiscount !== undefined && {
                shippingDiscount: shippingDiscount || null,
              }),
              ...(bogoBuyQty !== undefined && {
                bogoBuyQty: bogoBuyQty || null,
              }),
              ...(bogoFreeQty !== undefined && {
                bogoFreeQty: bogoFreeQty || null,
              }),
              ...(scope !== undefined && { scope }),
              ...(scopeId !== undefined && { scopeId: scopeId || null }),
              ...(maxUses !== undefined && { maxUses }),
              ...(maxUsesPerUser !== undefined && { maxUsesPerUser }),
              ...(maxClaimCount !== undefined && { maxClaimCount }),
              ...(firstOrderOnly !== undefined && { firstOrderOnly }),
              ...(repeatPurchaseOnly !== undefined && { repeatPurchaseOnly }),
              ...(requiredPaymentMethod !== undefined && {
                requiredPaymentMethod: requiredPaymentMethod || null,
              }),
              ...(platformRestriction !== undefined && { platformRestriction }),
              ...(autoApply !== undefined && { autoApply }),
              ...(startsAt !== undefined && {
                startsAt: startsAt ? new Date(startsAt) : null,
              }),
              ...(expiresAt !== undefined && {
                expiresAt: expiresAt ? new Date(expiresAt) : null,
              }),
              ...(isActive !== undefined && { isActive }),
            },
            include: { _count: { select: { usages: true } } },
          });

          if (tiers !== undefined) {
            await prisma.couponTier.deleteMany({
              where: { couponId: params.id },
            });
            if (tiers.length > 0) {
              await prisma.couponTier.createMany({
                data: tiers.map(
                  (t: {
                    minQuantity: number;
                    value: number;
                    type?: string;
                  }) => ({
                    couponId: params.id,
                    minQuantity: t.minQuantity,
                    value: t.value,
                    type: t.type || null,
                  }),
                ),
              });
            }
          }

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role as string,
            action: 'COUPON_MODIFIED',
            entity: 'Coupon',
            entityId: coupon.id,
            details: { code: coupon.code },
            ipAddress: getClientIp(headers) ?? undefined,
          });

          return Response.json({ coupon });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ params }) => {
        try {
          // AUTH-09: route through requireAuth so the admin limiter applies.
          const headers = getRequestHeaders();
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;
          const roleResponse = requireAdmin(session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.coupon.findUnique({
            where: { id: params.id },
            include: { _count: { select: { usages: true } } },
          });

          if (!existing) {
            return Response.json(
              { error: 'Coupon not found' },
              { status: 404 },
            );
          }

          if (existing._count.usages > 0) {
            return Response.json(
              {
                error:
                  'Cannot delete coupon that has been used. Deactivate it instead.',
              },
              { status: 409 },
            );
          }

          await prisma.couponTier.deleteMany({
            where: { couponId: params.id },
          });
          await prisma.coupon.delete({ where: { id: params.id } });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role as string,
            action: 'COUPON_MODIFIED',
            entity: 'Coupon',
            entityId: params.id,
            details: { code: existing.code, action: 'deleted' },
            ipAddress: getClientIp(headers) ?? undefined,
          });

          return Response.json({ success: true });
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
