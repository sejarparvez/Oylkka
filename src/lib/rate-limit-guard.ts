import { getRequestHeaders } from '@tanstack/react-start/server';
import { getClientIp } from '@/lib/client-ip';

const DEV_UNIDENTIFIED_KEY = 'dev:unidentified';

function getSafeRequestHeaders(): Headers | null {
  try {
    return getRequestHeaders();
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: this is fine
    console.error('Rate limit guard error:', error);
    return null;
  }
}

export async function checkRateLimit(
  limiter: {
    limit: (
      identifier: string,
    ) => Promise<{ success: boolean; remaining: number }>;
  },
  identifier?: string,
): Promise<Response | null> {
  const headers = getSafeRequestHeaders();
  const clientIp = getClientIp(headers);

  // Namespaced so an explicit identifier can never collide with an IP bucket.
  const key = identifier
    ? `id:${identifier}`
    : clientIp
      ? `ip:${clientIp}`
      : null;

  if (!key) {
    // No trustworthy client identity. Bucketing these together under a single
    // shared key would let one client exhaust the quota for everyone, so fail
    // closed instead. Local development has no edge proxy to supply a header.
    if (process.env.NODE_ENV === 'production') {
      return Response.json(
        { error: 'Unable to verify client identity.' },
        { status: 503 },
      );
    }
    return applyLimit(limiter, DEV_UNIDENTIFIED_KEY);
  }

  return applyLimit(limiter, key);
}

async function applyLimit(
  limiter: {
    limit: (
      identifier: string,
    ) => Promise<{ success: boolean; remaining: number }>;
  },
  key: string,
): Promise<Response | null> {
  const { success, remaining } = await limiter.limit(key);

  if (!success) {
    return Response.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Remaining': String(remaining),
        },
      },
    );
  }

  return null;
}
