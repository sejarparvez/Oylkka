// Ordered by trustworthiness. These are set by the edge/proxy and stripped from
// inbound client requests. `x-forwarded-for` is deliberately absent: a client can
// set it to any value, which made audit IPs and rate-limit buckets spoofable.
const CLIENT_IP_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'x-real-ip',
  'x-vercel-forwarded-for',
  'fly-client-ip',
] as const;

export function getClientIp(headers: Headers | null): string | null {
  if (!headers) return null;
  for (const name of CLIENT_IP_HEADERS) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }
  return null;
}