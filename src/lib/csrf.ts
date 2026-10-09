import { getRequestHeaders } from '@tanstack/react-start/server';
import { getTrustedOrigins } from '@/lib/trusted-origins';

function csrfFailure(): Response {
  return Response.json({ error: 'CSRF validation failed' }, { status: 403 });
}

function isTrusted(value: string | null, trustedOrigins: string[]): boolean {
  if (!value) return false;
  try {
    return trustedOrigins.includes(new URL(value).origin);
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('CSRF validation error:', error);
    return false;
  }
}

export function validateCsrf(): Response | null {
  let headers: Headers | null;
  try {
    headers = getRequestHeaders();
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('CSRF header parse error:', error);
    return csrfFailure();
  }

  if (!headers) return csrfFailure();

  const origin = headers.get('origin');
  const referer = headers.get('referer');

  // Fail closed: a state-changing request must carry at least one of these.
  // Previously a missing pair was treated as "no cross-site context" and allowed.
  if (!origin && !referer) return csrfFailure();

  const trustedOrigins = getTrustedOrigins();

  if (origin && !isTrusted(origin, trustedOrigins)) {
    return csrfFailure();
  }

  if (referer && !isTrusted(referer, trustedOrigins)) {
    return csrfFailure();
  }

  return null;
}
