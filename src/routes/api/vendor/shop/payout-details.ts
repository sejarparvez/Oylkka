import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import * as z from 'zod';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { requireActiveVendorShop } from '@/lib/vendor-guard';

const BD_MOBILE_PATTERN = /^(\+?8801|01)[3-9]\d{8}$/;

const PayoutDetailsSchema = z.object({
  payoutMethod: z.enum(['BANK', 'BKASH', 'NAGAD']),
  bankName: z.string().trim().max(100).optional(),
  bankAccountName: z.string().trim().max(100).optional(),
  bankAccountNumber: z.string().trim().min(4).max(40).optional(),
  mobileNumber: z.string().trim().optional(),
});

function maskValue(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

export const Route = createFileRoute('/api/vendor/shop/payout-details')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const shop = await prisma.shop.findUnique({
            where: { ownerId: session.user.id },
            select: {
              payoutMethod: true,
              bankName: true,
              bankAccountName: true,
              bankAccountNumber: true,
              mobileNumber: true,
            },
          });

          if (!shop) {
            return Response.json({ error: 'Shop not found' }, { status: 404 });
          }

          return Response.json({
            payoutMethod: shop.payoutMethod,
            bankName: shop.bankName,
            bankAccountName: shop.bankAccountName,
            bankAccountNumber: maskValue(shop.bankAccountNumber),
            mobileNumber: maskValue(shop.mobileNumber),
          });
        } catch {
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const guard = await requireActiveVendorShop(session.user.id);
          if (guard.response) return guard.response;
          const shop = guard.shop;

          const body = await request.json();
          const parsed = PayoutDetailsSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              { error: 'Validation failed', details: parsed.error.flatten() },
              { status: 400 },
            );
          }

          // Blank/absent fields keep whatever is already saved.
          const data = parsed.data;
          const bankName = data.bankName || shop.bankName || '';
          const bankAccountName =
            data.bankAccountName || shop.bankAccountName || '';
          const bankAccountNumber =
            data.bankAccountNumber || shop.bankAccountNumber || '';
          const mobileNumber = data.mobileNumber || shop.mobileNumber || '';

          const errors: Record<string, string> = {};
          if (data.payoutMethod === 'BANK') {
            if (!bankName) errors.bankName = 'Bank name is required';
            if (!bankAccountName)
              errors.bankAccountName = 'Account holder name is required';
            if (!bankAccountNumber)
              errors.bankAccountNumber = 'Account number is required';
          } else if (!BD_MOBILE_PATTERN.test(mobileNumber)) {
            errors.mobileNumber = 'Enter a valid Bangladeshi mobile number';
          }
          if (Object.keys(errors).length > 0) {
            return Response.json(
              { error: 'Validation failed', details: { fieldErrors: errors } },
              { status: 400 },
            );
          }

          const fields = {
            payoutMethod: data.payoutMethod,
            bankName: data.payoutMethod === 'BANK' ? bankName : null,
            bankAccountName:
              data.payoutMethod === 'BANK' ? bankAccountName : null,
            bankAccountNumber:
              data.payoutMethod === 'BANK' ? bankAccountNumber : null,
            mobileNumber: data.payoutMethod === 'BANK' ? null : mobileNumber,
          };

          await prisma.shop.update({ where: { id: shop.id }, data: fields });

          return Response.json({
            message: 'Payout details saved',
            payoutMethod: fields.payoutMethod,
            bankName: fields.bankName,
            bankAccountName: fields.bankAccountName,
            bankAccountNumber: maskValue(fields.bankAccountNumber),
            mobileNumber: maskValue(fields.mobileNumber),
          });
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
