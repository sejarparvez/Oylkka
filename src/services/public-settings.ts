import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type PublicSettings = Record<string, string>;

/**
 * FE-20: read the allowlisted public SiteSettings (see
 * `routes/api/settings/public.ts`). Consumers should fall back to sensible
 * defaults while `data` is undefined (in flight / error), matching the values
 * the endpoint itself defaults to.
 */
export function usePublicSettings() {
  return useQuery<PublicSettings>({
    queryKey: [QUERY_KEYS.PUBLIC_SETTINGS],
    queryFn: async () => {
      const r = await apiClient.get<{ settings: PublicSettings }>(
        '/api/settings/public',
      );
      return r.data.settings;
    },
    // Static policy claims: no reason to refetch aggressively.
    staleTime: 5 * 60 * 1000,
  });
}
