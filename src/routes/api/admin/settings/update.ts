import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '@/lib/auth-middleware';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';

// Allowlisted SiteSetting keys with per-key value validation (MONEY-47).
const optionalUrl = z.union([z.literal(''), z.url().max(200)]);

const SETTING_VALIDATORS: Record<string, z.ZodType<string>> = {
  platform_name: z.string().trim().min(1).max(60),
  support_email: z.email().max(120),
  // CONTENT-03/05: public business identity. Phone/address/hours may be left
  // blank; the contact page simply omits unset rows.
  support_phone: z.string().trim().max(40),
  support_address: z.string().trim().max(200),
  support_hours: z.string().trim().max(80),
  social_facebook: optionalUrl,
  social_instagram: optionalUrl,
  social_twitter: optionalUrl,
  min_order_amount: z.string().regex(/^\d+(\.\d+)?$/),
  default_commission: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, {
      message: 'default_commission must be between 0 and 100',
    }),
  max_shipping: z.string().regex(/^\d+(\.\d+)?$/),
  // FE-20: public policy claims surfaced on the PDP, /shipping, /returns and
  // the footer. Keep them validatable here so `/api/settings/public` can serve
  // them straight from the table.
  free_shipping_threshold: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'must be a number'),
  return_window_days: z
    .string()
    .regex(/^\d+$/, 'must be a whole number of days'),
  standard_delivery_fee: z.string().regex(/^\d+(\.\d+)?$/, 'must be a number'),
  express_delivery_fee: z.string().regex(/^\d+(\.\d+)?$/, 'must be a number'),
  processing_days: z.string().regex(/^\d+(-\d+)?$/, 'must be like "1-2"'),
  standard_delivery_days: z
    .string()
    .regex(/^\d+(-\d+)?$/, 'must be like "5-7"'),
  express_delivery_days: z.string().regex(/^\d+(-\d+)?$/, 'must be like "2-3"'),
};

export const Route = createFileRoute('/api/admin/settings/update')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authResult = await requireAuth();
          if (authResult.response) return authResult.response;
          const roleResponse = requireAdmin(authResult.session);
          if (roleResponse) return roleResponse;

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const { settings }: { settings: Record<string, string> } =
            await request.json();

          const clean: Record<string, string> = {};
          for (const [key, value] of Object.entries(settings ?? {})) {
            const validator = SETTING_VALIDATORS[key];
            if (!validator) {
              return Response.json(
                { error: `Unknown setting key: ${key}` },
                { status: 400 },
              );
            }
            const parsed = validator.safeParse(value);
            if (!parsed.success) {
              return Response.json(
                { error: `Invalid value for "${key}"` },
                { status: 400 },
              );
            }
            clean[key] = parsed.data;
          }

          for (const [key, value] of Object.entries(clean)) {
            await prisma.siteSetting.upsert({
              where: { key },
              create: { key, value },
              update: { value },
            });
          }
          return Response.json({ message: 'Settings updated' });
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
