import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { hitFallback } from '@/lib/rate-limit-fallback';

/**
 * Upstash archives free-tier databases after a period of inactivity, and
 * archival is what takes the REST URL offline. Constructing a client against
 * empty credentials would defer that failure to the first request, so the
 * client is only built when both values are present.
 */
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

const redis = createRedisClient();

const WINDOW_SECONDS = 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;

interface RateLimitResult {
  success: boolean;
  remaining: number;
}

/**
 * Wraps a Ratelimit so that Redis failures degrade to in-process rate limiting
 * instead of throwing. checkRateLimit duck-types its limiter argument on
 * `limit(identifier)`, so this stays structurally compatible with every call
 * site.
 */
class SafeRatelimit {
  constructor(
    private readonly scope: string,
    private readonly limitCount: number,
    private readonly ratelimit: Ratelimit | null,
  ) {}

  async limit(identifier: string): Promise<RateLimitResult> {
    if (this.ratelimit) {
      try {
        return await this.ratelimit.limit(identifier);
      } catch (error) {
        // biome-ignore lint/suspicious/noConsole: surfaced deliberately, see below
        console.error(
          `Rate limit Redis call failed (${this.scope}), ` +
            'falling back to in-process limiting:',
          error,
        );
      }
    }
    return hitFallback(this.scope, identifier, this.limitCount, WINDOW_MS);
  }
}

function build(scope: string, limitCount: number): SafeRatelimit {
  const ratelimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limitCount, `${WINDOW_SECONDS} s`),
        analytics: false,
        prefix: scope,
      })
    : null;

  return new SafeRatelimit(scope, limitCount, ratelimit);
}

export const authLimiter = build('ratelimit:auth', 5);
export const checkoutLimiter = build('ratelimit:checkout', 3);
export const couponLimiter = build('ratelimit:coupon', 10);
export const reviewLimiter = build('ratelimit:review', 5);
export const messageLimiter = build('ratelimit:message', 10);
export const generalLimiter = build('ratelimit:general', 100);
export const adminLimiter = build('ratelimit:admin', 60);
export const newsletterLimiter = build('ratelimit:newsletter', 5);
export const contactLimiter = build('ratelimit:contact', 5);

/** Whether Upstash credentials were present at boot. Exposed for tests. */
export const isRedisConfigured = redis !== null;
