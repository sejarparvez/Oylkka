import { createFileRoute } from '@tanstack/react-router';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { vendorApprovalHtml } from '@/lib/email-templates';
import { sendEmail } from '@/lib/send-email';

export const Route = createFileRoute('/api/shop/approve')({
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

          const shop = await prisma.shop.findUnique({
            where: { id },
          });

          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          if (shop.status !== 'PENDING') {
            return Response.json(
              { error: 'Shop is not pending' },
              { status: 400 },
            );
          }

          if (shop.ownerId === session.user.id) {
            return Response.json(
              { error: 'Cannot approve your own shop' },
              { status: 400 },
            );
          }

          const [updated] = await prisma.$transaction(async (tx) => {
            const updatedShop = await tx.shop.update({
              where: { id },
              data: {
                status: 'ACTIVE',
                approvedAt: new Date(),
                approvedBy: session.user.id,
              },
            });

            const owner = await tx.user.findUnique({
              where: { id: shop.ownerId },
            });

            if (owner && owner.role !== 'ADMIN' && owner.role !== 'MANAGER') {
              await tx.user.update({
                where: { id: shop.ownerId },
                data: { role: 'VENDOR' },
              });
              createAuditLog({
                actorId: session.user.id,
                actorRole: session.user.role ?? 'ADMIN',
                action: 'USER_ROLE_CHANGED',
                entity: 'User',
                entityId: shop.ownerId,
                details: { from: owner.role, to: 'VENDOR' },
              }).catch(() => {});
            }

            return [updatedShop];
          });

          createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'ADMIN',
            action: 'SHOP_APPROVED',
            entity: 'Shop',
            entityId: id,
            details: { shopName: shop.name, ownerId: shop.ownerId },
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
                subject: 'Your shop has been approved',
                meta: {
                  description: '',
                  link: '',
                  callToActionText: '',
                },
                html: vendorApprovalHtml(owner.name, shop.name),
              }).catch((err) =>
                // biome-ignore lint/suspicious/noConsole: this is fine
                console.error('Failed to send approval email:', err),
              );
            })
            .catch((err) =>
              // biome-ignore lint/suspicious/noConsole: this is fine
              console.error('Failed to look up shop owner:', err),
            );

          return Response.json(
            { message: 'Shop approved successfully', shop: updated },
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
