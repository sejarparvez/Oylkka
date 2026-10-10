import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

/**
 * CONTENT-19: derive the canonical origin from the request actually serving the
 * page — the host header on the server, `window.location.origin` on the client —
 * rather than a hardcoded domain. VITE_SITE_URL and the production domain are
 * only deployment/local fallbacks.
 *
 * Used for canonical links and for absolute Open Graph / Twitter image URLs
 * (social crawlers like Facebook require an absolute `og:image`).
 *
 * `createIsomorphicFn` keeps the `@tanstack/react-start/server` import out of
 * the client bundle: the compiler replaces the whole expression with the
 * `.client()` implementation on the client, so the `.server()` body (and its
 * `getRequestHeaders` usage) is tree-shaken there.
 */
export const getSiteUrl = createIsomorphicFn()
  .server(() => {
    const headers = getRequestHeaders();
    const host = headers.get('x-forwarded-host') ?? headers.get('host');
    if (host) return `https://${host}`;
    return (
      (import.meta.env.VITE_SITE_URL as string | undefined) ??
      'https://oylkka.com'
    );
  })
  .client(() => {
    return (
      (import.meta.env.VITE_SITE_URL as string | undefined) ??
      window.location.origin
    );
  });

/** Absolute URL for a site asset (e.g. the generic share image). */
export function siteAsset(path: string): string {
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
