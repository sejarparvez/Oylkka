import { createFileRoute } from '@tanstack/react-router';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';

/**
 * FE-20: the only SiteSetting keys public pages are allowed to derive claims
 * from. Every consumer falls back to these values while the request is in
 * flight or the settings table is unreachable, so the public surface can never
 * go blank. Adding a key here does NOT auto-publish arbitrary admin content —
 * this explicit allowlist is what keeps the public reader from leaking
 * everything stored in `site_setting`.
 */
export const PUBLIC_SETTING_DEFAULTS: Record<string, string> = {
  // Public business identity (CONTENT-03/05/09). Defaults are deliberately
  // generic rather than a fabricated street address or phone number: the
  // contact page only renders entries that are actually configured, and admins
  // fill the real values in at /dashboard/admin/settings.
  platform_name: 'Oylkka',
  support_email: 'support@oylkka.com',
  support_phone: '',
  support_address: '',
  support_hours: 'Sun–Thu: 9AM – 6PM',
  social_facebook: '',
  social_instagram: '',
  social_twitter: '',
  free_shipping_threshold: '500',
  return_window_days: String(RETURN_WINDOW_DAYS),
  standard_delivery_fee: '60',
  express_delivery_fee: '150',
  processing_days: '1-2',
  standard_delivery_days: '5-7',
  express_delivery_days: '2-3',
};

export const Route = createFileRoute('/api/settings/public')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const rows = await prisma.siteSetting.findMany({
            where: { key: { in: Object.keys(PUBLIC_SETTING_DEFAULTS) } },
          });
          const settings: Record<string, string> = {
            ...PUBLIC_SETTING_DEFAULTS,
          };
          for (const row of rows) settings[row.key] = row.value;
          return Response.json({ settings });
        } catch (error) {
          // Page content must not fall over because the settings read failed —
          // degrade to the built-in defaults.
          logError('public settings read failed', error);
          return Response.json({ settings: { ...PUBLIC_SETTING_DEFAULTS } });
        }
      },
    },
  },
});
