import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/constants';

export type GlobalAttributeValue = {
  id: string;
  value: string;
  slug: string;
  metadata: Record<string, unknown> | null;
};

export type GlobalAttribute = {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  values: GlobalAttributeValue[];
};

/**
 * FE-45: the GlobalAttribute taxonomy used by the vendor product form to link
 * local attribute values to canonical global ones. Read-only and cacheable —
 * the taxonomy only changes through the admin UI.
 */
export function useGlobalAttributes() {
  return useQuery<GlobalAttribute[]>({
    queryKey: [QUERY_KEYS.GLOBAL_ATTRIBUTES],
    queryFn: async () => {
      const r = await apiClient.get<{ attributes: GlobalAttribute[] }>(
        '/api/global-attributes',
      );
      return r.data.attributes;
    },
    staleTime: 5 * 60 * 1000,
  });
}
