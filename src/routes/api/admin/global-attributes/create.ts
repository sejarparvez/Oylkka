import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { generateColorFromHex } from '@/lib/color-utils';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { GlobalAttributeSchema } from '@/schemas/global-attribute-schema';

export const Route = createFileRoute('/api/admin/global-attributes/create')({
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
          const parsed = GlobalAttributeSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
              },
              { status: 400 },
            );
          }

          const { name, slug, displayOrder } = parsed.data;

          // Preprocess values: auto-generate color names from hex codes
          const values = parsed.data.values.map((v) => {
            let { value, slug, hex, metadata } = v;

            if (hex) {
              // If no explicit value/slug, try to generate from hex
              if (!value || !slug) {
                const generated = generateColorFromHex(hex);
                if (generated) {
                  value = value || generated.name;
                  slug = slug || generated.slug;
                }
              }
              // Always store hex in metadata
              const metaObj: Record<string, unknown> = {
                ...(metadata as Record<string, unknown> | undefined),
                hex,
              };
              metadata = metaObj;
            }

            return { value, slug, metadata };
          });

          const existing = await prisma.globalAttribute.findUnique({
            where: { slug },
          });
          if (existing) {
            return Response.json(
              { error: 'A global attribute with this slug already exists' },
              { status: 409 },
            );
          }

          const attribute = await prisma.globalAttribute.create({
            data: {
              name,
              slug,
              displayOrder,
              values: {
                create: values.map((v) => ({
                  value: v.value,
                  slug: v.slug,
                  // biome-ignore lint/suspicious/noExplicitAny: Prisma InputJsonValue
                  ...(v.metadata ? { metadata: v.metadata as any } : {}),
                })),
              },
            },
            include: {
              values: { orderBy: { slug: 'asc' } },
            },
          });

          await createAuditLog({
            actorId: session.user.id,
            actorRole: session.user.role ?? 'USER',
            action: 'GLOBAL_ATTRIBUTE_CREATED',
            entity: 'GlobalAttribute',
            entityId: attribute.id,
            details: { name, slug, valueCount: values.length },
            ipAddress: getRequestHeaders().get('x-forwarded-for') || undefined,
          });

          return Response.json({ attribute }, { status: 201 });
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
