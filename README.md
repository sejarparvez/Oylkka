# Oylkka — Bangladesh Marketplace

A full-featured e-commerce marketplace built for Bangladesh. Buyers can browse thousands of products from verified vendors, pay via bKash, COD, or wallet, and track orders in real time. Vendors get their own dashboard to manage products, orders, and payouts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) 1.3+ |
| Framework | [TanStack Start](https://tanstack.com/start/latest) (React 19) |
| Database | [PostgreSQL](https://neon.tech) via [Prisma](https://prisma.io) |
| Auth | [better-auth](https://better-auth.com) |
| Payments | bKash (tokenized checkout) + Cash on Delivery + Wallet |
| Email | Brevo SMTP via Nodemailer |
| Rate Limiting | Upstash Redis |
| Media | Cloudinary |
| Styling | Tailwind CSS 4 + shadcn/ui |

## Getting Started

```bash
bun install
bun run dev
```

The app starts at `http://localhost:3000`.

### Environment Variables

Copy `.env` from your team or set the following:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `SMTP_SERVER` | SMTP host (e.g. `smtp-relay.brevo.com`) |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_SENDER` | From email address |
| `BKASH_APP_KEY` | bKash merchant app key |
| `BKASH_APP_SECRET` | bKash merchant app secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

## Project Structure

```
src/
├── components/      # Reusable UI components (shadcn/ui + custom)
├── lib/             # Server utilities (auth, email, db, etc.)
├── routes/          # TanStack Start file-based routes + API
│   ├── api/         # Server API handlers
│   ├── auth/        # Auth pages
│   └── dashboard/   # Customer dashboard
│       ├── vendor/  # Vendor dashboard
│       └── admin/   # Admin dashboard
├── schemas/         # Zod validation schemas
├── services/        # Business logic services
├── types/           # Shared TypeScript types
└── generated/       # Prisma client (auto-generated)
```

## Key Features

- **Product browsing** with category filters, search, and sorting
- **Shopping cart** with real-time stock validation
- **Checkout** supporting bKash, COD, and Wallet payments
- **Order tracking** with per-item fulfillment status
- **Vendor dashboard** for product management and order fulfillment
- **Admin panel** for managing shops, orders, payouts, and content
- **Coupon & voucher system** with tiered discounts and BOGO
- **Email notifications** for orders, shipping, refunds, and more

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun test` | Run unit tests |
| `bun run test:components` | Run component tests (jsdom) |
| `bun run upstash:keepalive` | Write the Upstash keepalive key (CI uses this) |
| `bun run check` | Lint and format with Biome |
| `bun run typecheck` | Regenerate the Prisma client and typecheck with `tsc` |

`src/generated` (the Prisma client) is gitignored and `tsconfig.json` excludes it from
the root file set, so run `bun run typecheck` (or `prisma generate`) before a bare
`tsc --noEmit` on a fresh clone.

## Rate Limiting

Redis is used for rate limiting only — sessions and queues live in Postgres.
Each limiter is a 60 second sliding window keyed by IP, in
`src/lib/rate-limit.ts`.

### Redis outage behaviour

If Upstash is unreachable, `SafeRatelimit` catches the failure and falls back to
an in-process sliding window (`src/lib/rate-limit-fallback.ts`) with the same
limit and window. Rate limiting stays enforced instead of taking down every
route that calls `checkRateLimit` — which includes all of `/api/auth` and the
bKash checkout callbacks.

The fallback is per-process, so running multiple instances multiplies the
effective limit while it is active. Treat it as a degraded mode, not a
replacement for Redis.

If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are unset, no client
is constructed and the fallback is used unconditionally. That is what makes
local development work without Upstash credentials.

### Upstash Keepalive

Upstash archives free-tier databases after a period of inactivity, which takes
the REST URL offline. `.github/workflows/upstash-keepalive.yml` writes a real
key (`SET upstash:keepalive ... EX 1209600`) every 7 days so the database is
never considered idle. A bare `PING` may not count as activity.

It runs from GitHub Actions rather than the app itself, so it still fires when
the app is down or scaled to zero.

Required repository secrets: `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`.

Two things to know:

- The workflow can also be triggered manually from the Actions tab. Do that once
  after setup to confirm it goes green.
- Because this repo is public, GitHub disables scheduled workflows after 60 days
  without repository activity. If runs stop appearing, re-enable the workflow
  from the Actions tab.

## Deployment

The app is deployed via Nitro. Build output goes to `.output/`.

```bash
bun run build
bun run preview
```

## License

Private — all rights reserved.
