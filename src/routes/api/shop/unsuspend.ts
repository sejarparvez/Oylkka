import { createFileRoute } from '@tanstack/react-router';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { vendorUnsuspensionHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';

export const Route = createFileRoute('/api/shop/unsuspend')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const { id } = (await request.json()) as { id: string };

          if (!id) {
            return Response.json(
              { error: 'Shop ID is required' },
              { status: 400 },
            );
          }

          const shop = await prisma.shop.findUnique({ where: { id } });
          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          if (shop.status !== 'SUSPENDED') {
            return Response.json(
              { error: 'Shop is not suspended' },
              { status: 400 },
            );
          }

          const updated = await prisma.shop.update({
            where: { id },
            data: {
              status: 'ACTIVE',
              suspendedReason: null,
              suspendedAt: null,
              suspendedBy: null,
            },
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'ADMIN',
            action: 'SHOP_UNSUSPENDED',
            entity: 'Shop',
            entityId: id,
            details: {
              shopName: shop.name,
              ownerId: shop.ownerId,
            },
          }).catch(() => {});

          prisma.user
            .findUnique({
              where: { id: shop.ownerId },
              select: { email: true, name: true },
            })
            .then((owner) => {
              if (!owner) return;
              sendEmail({
                to: owner.email,
                subject: 'Your shop has been reinstated',
                meta: {
                  description: '',
                  link: '',
                  callToActionText: '',
                },
                html: vendorUnsuspensionHtml(owner.name, shop.name),
              }).catch((err) =>
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to send reinstatement email:', err),
              );
            })
            .catch((err) =>
              // biome-ignore lint/suspicious/noConsole: this is fine
              console.error('Failed to look up shop owner:', err),
            );

          return Response.json(
            { message: 'Shop reinstated', shop: updated },
            { status: 200 },
          );
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
