import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { AddressFormSchema } from '@/lib/address-validation';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

export const Route = createFileRoute('/api/addresses/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }
          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const body = await request.json();
          const parsed = AddressFormSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid address data' },
              { status: 400 },
            );
          }
          const { label, name, phone, address, upzila, district, postalCode, isDefault } =
            parsed.data;

          const existingCount = await prisma.userAddress.count({
            where: { userId: session.user.id },
          });

          // First address on the account becomes the default so the account
          // never has zero defaults (MONEY-57).
          const makeDefault = isDefault === true || existingCount === 0;

          if (makeDefault) {
            await prisma.userAddress.updateMany({
              where: { userId: session.user.id },
              data: { isDefault: false },
            });
          }

          const addr = await prisma.userAddress.create({
            data: {
              userId: session.user.id,
              label: label?.trim() || 'Home',
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
              upzila: upzila.trim(),
              district,
              postalCode: postalCode || null,
              isDefault: makeDefault,
            },
          });
          return Response.json({ address: addr }, { status: 201 });
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