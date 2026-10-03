import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute(
  '/api/admin/global-attributes/map-product',
)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const { productId, globalAttributeId, localValueId, globalValueId } =
            body;

          if (
            !productId ||
            !globalAttributeId ||
            !localValueId ||
            !globalValueId
          ) {
            return Response.json(
              {
                error:
                  'Missing required fields: productId, globalAttributeId, localValueId, globalValueId',
              },
              { status: 400 },
            );
          }

          // Verify the product exists
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { id: true },
          });
          if (!product) {
            return Response.json(
              { error: 'Product not found' },
              { status: 404 },
            );
          }

          // Verify the local value exists
          const localValue = await prisma.productAttributeValue.findUnique({
            where: { id: localValueId },
            select: { id: true },
          });
          if (!localValue) {
            return Response.json(
              { error: 'Local attribute value not found' },
              { status: 404 },
            );
          }

          // Verify the global value exists
          const globalValue = await prisma.globalAttributeValue.findUnique({
            where: { id: globalValueId },
            select: { id: true, attributeId: true },
          });
          if (!globalValue) {
            return Response.json(
              { error: 'Global attribute value not found' },
              { status: 404 },
            );
          }

          // Verify the global value belongs to the specified attribute
          if (globalValue.attributeId !== globalAttributeId) {
            return Response.json(
              {
                error:
                  'Global value does not belong to the specified global attribute',
              },
              { status: 400 },
            );
          }

          // Upsert the mapping
          const mapping = await prisma.productGlobalAttributeValue.upsert({
            where: {
              productId_globalAttributeId_localValueId: {
                productId,
                globalAttributeId,
                localValueId,
              },
            },
            update: { globalValueId },
            create: {
              productId,
              globalAttributeId,
              localValueId,
              globalValueId,
            },
            include: {
              globalAttribute: { select: { name: true, slug: true } },
              globalValue: { select: { value: true, slug: true } },
            },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'USER',
            action: 'GLOBAL_ATTRIBUTE_MAPPING_CREATED',
            entity: 'ProductGlobalAttributeValue',
            entityId: mapping.id,
            details: {
              productId,
              globalAttribute: mapping.globalAttribute.name,
              attributeSlug: mapping.globalAttribute.slug,
              globalValue: mapping.globalValue.value,
              globalValueSlug: mapping.globalValue.slug,
            },
            ipAddress: getClientIp(getRequestHeaders()) ?? undefined,
          });

          return Response.json({ mapping }, { status: 200 });
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

      DELETE: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;
          const session = authResult.session;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const { productId, globalAttributeId, localValueId } = body;

          if (!productId || !globalAttributeId || !localValueId) {
            return Response.json(
              {
                error:
                  'Missing required fields: productId, globalAttributeId, localValueId',
              },
              { status: 400 },
            );
          }

          const mapping = await prisma.productGlobalAttributeValue.findUnique({
            where: {
              productId_globalAttributeId_localValueId: {
                productId,
                globalAttributeId,
                localValueId,
              },
            },
          });

          if (!mapping) {
            return Response.json(
              { error: 'Mapping not found' },
              { status: 404 },
            );
          }

          await prisma.productGlobalAttributeValue.delete({
            where: { id: mapping.id },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'USER',
            action: 'GLOBAL_ATTRIBUTE_MAPPING_DELETED',
            entity: 'ProductGlobalAttributeValue',
            entityId: mapping.id,
            details: { productId, globalAttributeId, localValueId },
            ipAddress: getClientIp(getRequestHeaders()) ?? undefined,
          });

          return Response.json({ message: 'Mapping removed' });
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
