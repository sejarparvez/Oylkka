import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import {
  AddressFormSchema,
  promoteDefaultAddress,
} from '@/lib/address-validation';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/addresses/edit')({
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

          const body = await request.json();
          if (!body?.id) {
            return Response.json({ error: 'id required' }, { status: 400 });
          }
          const { id, ...rest } = body;

          const existing = await prisma.userAddress.findFirst({
            where: { id, userId: session.user.id },
          });
          if (!existing) {
            return Response.json(
              { error: 'Address not found' },
              { status: 404 },
            );
          }

          if (rest.isDefault === true) {
            await prisma.userAddress.updateMany({
              where: { userId: session.user.id, id: { not: id } },
              data: { isDefault: false },
            });
          }

          const clean = Object.fromEntries(
            Object.entries(rest).filter(([, value]) => value !== undefined),
          );
          if (
            'postalCode' in clean &&
            (clean.postalCode === '' || clean.postalCode === null)
          ) {
            clean.postalCode = null;
          }
          for (const [key, value] of Object.entries(clean)) {
            if (key !== 'postalCode' && value === '') delete clean[key];
          }
          const parsed = AddressFormSchema.partial().safeParse(clean);
          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid address data' },
              { status: 400 },
            );
          }
          const {
            label,
            name,
            phone,
            address,
            upzila,
            district,
            postalCode,
            isDefault,
          } = parsed.data;

          const addr = await prisma.userAddress.update({
            where: { id },
            data: {
              ...(label !== undefined && { label: label?.trim() || 'Home' }),
              ...(name !== undefined && { name: name.trim() }),
              ...(phone !== undefined && { phone: phone.trim() }),
              ...(address !== undefined && { address: address.trim() }),
              ...(upzila !== undefined && { upzila: upzila.trim() }),
              ...(district !== undefined && { district }),
              ...(postalCode !== undefined && {
                postalCode: postalCode === null ? null : postalCode,
              }),
              ...(isDefault !== undefined && { isDefault }),
            },
          });

          // Unsetting the default must not leave the account with zero
          // defaults (MONEY-57).
          if (isDefault === false) {
            await promoteDefaultAddress(session.user.id);
          }

          return Response.json({ address: addr });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : 'Failed' },
            { status: 500 },
          );
        }
      },
    },
  },
});
