import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit-log';
import { requireAdminOrManager, requireAuth } from '@/lib/auth-middleware';
import { getClientIp } from '@/lib/client-ip';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { USER_ROLES } from '@/lib/roles';

const roleSchema = z.enum([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.VENDOR,
  USER_ROLES.CUSTOMER_SERVICE,
  USER_ROLES.USER,
]);

const banExpiresSchema = z
  .union([z.string().trim().min(1), z.literal('')])
  .nullable()
  .optional()
  .refine(
    (value) =>
      value === null || value === undefined || !Number.isNaN(Date.parse(value)),
    { message: 'Invalid ban expiry date' },
  )
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null;
    return new Date(value);
  });

const updateCustomerSchema = z
  .object({
    banned: z.boolean().optional(),
    banReason: z.string().trim().max(500).nullable().optional(),
    banExpires: banExpiresSchema,
    role: roleSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No fields to update',
  });

export const Route = createFileRoute('/api/admin/customers/$id')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdminOrManager(authResult.session);
          if (roleResponse) return roleResponse;

          const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              banned: true,
              banReason: true,
              banExpires: true,
              imageUrl: true,
              emailVerified: true,
              createdAt: true,
              _count: { select: { orders: true, reviews: true } },
            },
          });

          if (!user) {
            return Response.json(
              { error: 'Customer not found' },
              { status: 404 },
            );
          }

          const recentOrders = await prisma.order.findMany({
            where: { customerId: params.id },
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              createdAt: true,
            },
          });

          const totalSpent = await prisma.order.aggregate({
            where: { customerId: params.id, paymentStatus: 'PAID' },
            _sum: { total: true },
          });

          return Response.json({
            customer: user,
            recentOrders,
            totalSpent: totalSpent._sum.total ?? 0,
          });
        } catch (_error) {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const headers = getRequestHeaders();
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const session = authResult.session;

          const roleResponse = requireAdminOrManager(session);
          if (roleResponse) return roleResponse;

          // Narrowed to ADMIN | MANAGER by requireAdminOrManager above.
          const actorRole = session.user.role as string;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const parsed = updateCustomerSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              {
                error: 'Invalid request body',
                details: parsed.error.flatten(),
              },
              { status: 400 },
            );
          }

          const { banned, banReason, banExpires, role } = parsed.data;

          if (role !== undefined && session.user.role !== USER_ROLES.ADMIN) {
            return Response.json(
              { error: 'Only administrators can change user roles' },
              { status: 403 },
            );
          }

          if (role !== undefined && params.id === session.user.id) {
            return Response.json(
              { error: 'You cannot change your own role' },
              { status: 400 },
            );
          }

          const existing = await prisma.user.findUnique({
            where: { id: params.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Customer not found' },
              { status: 404 },
            );
          }

          const roleChanged = role !== undefined && role !== existing.role;

          if (roleChanged && existing.role === USER_ROLES.ADMIN) {
            const adminCount = await prisma.user.count({
              where: { role: USER_ROLES.ADMIN },
            });
            if (adminCount <= 1) {
              return Response.json(
                { error: 'Cannot demote the last remaining administrator' },
                { status: 400 },
              );
            }
          }

          const wasBanned = existing.banned;
          const user = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
              where: { id: params.id },
              data: {
                ...(banned !== undefined && { banned }),
                ...(banReason !== undefined && {
                  banReason: banReason || null,
                }),
                ...(banExpires !== undefined && { banExpires }),
                ...(role !== undefined && { role }),
              },
            });

            if (banned === true && !wasBanned) {
              await tx.session.deleteMany({ where: { userId: params.id } });
            }

            // AUTH-04: the audit row belongs in the same transaction as the
            // mutation — the record can never disagree with what happened.
            const ipAddress = getClientIp(headers) ?? undefined;

            if (banned === true && !wasBanned) {
              await createAuditLog({
                actorId: session.user.id,
                actorRole,
                action: 'USER_BANNED',
                entity: 'User',
                entityId: params.id,
                details: { reason: banReason, name: existing.name },
                ipAddress,
                tx,
              });
            }

            if (roleChanged) {
              await createAuditLog({
                actorId: session.user.id,
                actorRole,
                action: 'USER_ROLE_CHANGED',
                entity: 'User',
                entityId: params.id,
                details: { from: existing.role, to: role, name: existing.name },
                ipAddress,
                tx,
              });
            }

            return updated;
          });

          return Response.json({ customer: user });
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
