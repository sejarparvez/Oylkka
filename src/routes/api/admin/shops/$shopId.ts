import { createFileRoute } from '@tanstack/react-router';
import * as z from 'zod';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

const CommissionSchema = z.object({
  commissionRate: z.coerce.number().min(0).max(100),
});

export const Route = createFileRoute('/api/admin/shops/$shopId')({
  server: {
    handlers: {
      PUT: async ({ request, params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const { shopId } = params;

          const body = await request.json();
          const parsed = CommissionSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten(),
              },
              { status: 400 },
            );
          }

          const shop = await prisma.shop.findUnique({
            where: { id: shopId },
            select: { id: true, name: true, commissionRate: true },
          });
          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          const previous = Number(shop.commissionRate);
          const next = parsed.data.commissionRate;
          if (previous === next) {
            return Response.json({ commissionRate: next }, { status: 200 });
          }

          await prisma.shop.update({
            where: { id: shopId },
            data: { commissionRate: next },
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'ADMIN',
            action: 'SHOP_COMMISSION_CHANGED',
            entity: 'Shop',
            entityId: shopId,
            details: { shopName: shop.name, from: previous, to: next },
          }).catch(() => {});

          return Response.json({ commissionRate: next }, { status: 200 });
        } catch {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
