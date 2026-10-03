import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/admin/global-attributes/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const attribute = await prisma.globalAttribute.findUnique({
            where: { id: params.id },
            include: {
              values: { orderBy: { slug: 'asc' } },
              _count: { select: { productLinks: true } },
            },
          });

          if (!attribute) {
            return Response.json(
              { error: 'Global attribute not found' },
              { status: 404 },
            );
          }

          return Response.json({ attribute });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.globalAttribute.findUnique({
            where: { id: params.id },
            include: { values: true },
          });

          if (!existing) {
            return Response.json(
              { error: 'Global attribute not found' },
              { status: 404 },
            );
          }

          const body = await request.json();
          const { name, slug, displayOrder, values, removedValueIds } = body;

          if (slug && slug !== existing.slug) {
            const slugExists = await prisma.globalAttribute.findUnique({
              where: { slug },
            });
            if (slugExists) {
              return Response.json(
                { error: 'A global attribute with this slug already exists' },
                { status: 409 },
              );
            }
          }

          // Remove deleted values
          if (removedValueIds?.length > 0) {
            await prisma.globalAttributeValue.deleteMany({
              where: {
                id: { in: removedValueIds },
                attributeId: params.id,
              },
            });
          }

          // Upsert values
          if (values?.length > 0) {
            for (const v of values) {
              if (v.id) {
                await prisma.globalAttributeValue.update({
                  where: { id: v.id },
                  data: {
                    value: v.value,
                    slug: v.slug,
                    metadata: v.metadata ?? undefined,
                  },
                });
              } else {
                await prisma.globalAttributeValue.create({
                  data: {
                    attributeId: params.id,
                    value: v.value,
                    slug: v.slug,
                    metadata: v.metadata ?? undefined,
                  },
                });
              }
            }
          }

          const attribute = await prisma.globalAttribute.update({
            where: { id: params.id },
            data: {
              ...(name !== undefined ? { name } : {}),
              ...(slug !== undefined ? { slug } : {}),
              ...(displayOrder !== undefined ? { displayOrder } : {}),
            },
            include: {
              values: { orderBy: { slug: 'asc' } },
              _count: { select: { productLinks: true } },
            },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'USER',
            action: 'GLOBAL_ATTRIBUTE_MODIFIED',
            entity: 'GlobalAttribute',
            entityId: attribute.id,
            details: {
              name,
              slug,
              valueCount: attribute.values.length,
              removedValueCount: removedValueIds?.length || 0,
            },
            ipAddress: getClientIp(getRequestHeaders()) ?? undefined,
          });

          return Response.json({ attribute });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const existing = await prisma.globalAttribute.findUnique({
            where: { id: params.id },
          });

          if (!existing) {
            return Response.json(
              { error: 'Global attribute not found' },
              { status: 404 },
            );
          }

          await prisma.globalAttribute.delete({
            where: { id: params.id },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'USER',
            action: 'GLOBAL_ATTRIBUTE_DELETED',
            entity: 'GlobalAttribute',
            entityId: params.id,
            details: { name: existing.name, slug: existing.slug },
            ipAddress: getClientIp(getRequestHeaders()) ?? undefined,
          });

          return Response.json({ message: 'Global attribute deleted' });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
