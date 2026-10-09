const DEV_FALLBACK_ORIGIN = 'http://localhost:3000';

function normalizeOrigin(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  for (const candidate of [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ]) {
    const origin = normalizeOrigin(candidate);
    if (origin) origins.add(origin);
  }

  if (origins.size === 0) {
    origins.add(DEV_FALLBACK_ORIGIN);
  }

  return [...origins];
}
