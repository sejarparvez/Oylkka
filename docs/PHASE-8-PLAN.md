# Phase 8 — Content & unverifiable claims: implementation plan

**Scope:** `CONTENT-01 … CONTENT-22` from `docs/AUDIT.md`.
**Goal:** every customer-visible claim is either true and dynamic, or removed.
**Decisions locked with the product owner:**

| Decision | Choice |
|---|---|
| Blog | Delete `/blog` + `/blog/$slug` routes and the footer link. 6 fabricated articles removed. |
| CMS | Wire `ContentBlock` to the policy/legal pages, with the current structured copy as fallback. No migration. |
| Contact | Persist to a new `ContactMessage` table and enqueue an email to `support_email`. |
| Settings | Enforce `min_order_amount`, `max_shipping`, `default_commission`. |
| Unverifiable UI | Remove Nagad/Rocket payment options, fake flash-sale countdown/claims, the 20% badge; soften unverifiable trust copy; social handles come from settings. |

## Already closed by Phase 5 (FE-20) — do not redo

- Public settings read path: `src/routes/api/settings/public.ts` (`PUBLIC_SETTING_DEFAULTS`) + `src/services/public-settings.ts`.
- Policy claims driven by settings: `shipping.tsx`, `returns.tsx`, `product.$slug.tsx`, `footer/index.tsx`, `trust-strip.tsx`; `RETURN_WINDOW_DAYS = 30` is the fallback.
- Admin settings validators allowlist the policy keys (`admin/settings/update.ts`).
- Homepage real counts (`stats-strip.tsx`).
- Return-window contradiction largely resolved.

## Batches

### Batch A — `SiteSetting` as the identity source (no migration)
- Extend `PUBLIC_SETTING_DEFAULTS` and the admin validator allowlist, and add admin UI fields, for: `platform_name`, `support_email`, `support_phone`, `support_address`, `support_hours`, `social_facebook`, `social_instagram`, `social_twitter`.
- Consume in `contact.tsx`, `footer/index.tsx`, `about.tsx` (hours) and `__root.tsx` meta.
- Fix residual CONTENT-08: derive the hardcoded zone prose in `shipping.tsx` rather than contradict the rate card beside it.

### Batch B — Contact (migration: `ContactMessage`)
- Add `ContactMessage` model + migration.
- Rewrite `api/contact.ts`: Zod validation, IP rate limit, persist, `queueEmail` to `support_email`.
- Add `services/contact.ts`; the page reads identity from Batch A.

### Batch C — About / trust / meta
- `/about` live counts (reuse `stats-strip.tsx` query pattern); soften "100% vetted" and "24/7".
- Make `__root.tsx` meta and `email-templates.ts` marketplace claims dynamic or softer.

### Batch D — Deals
- Remove the fake countdown, "Up to 60% off", "refresh every hour" and the `20%` / `20% OFF` badge.

### Batch E — Policy CMS (no migration)
- Extract a shared `<RichText>` renderer (from the soon-deleted `blog.$slug.tsx`).
- Render a published `ContentBlock` when present, else the existing structured sections. 404 → fallback, never error. FAQ stays structured.

### Batch F — Payment & currency
- Delete Nagad/Rocket from `payment-selector.tsx`; replace `$` / `BDT` literals with `formatBDT`.

### Batch G — Copy/link hygiene
- Delete blog routes + footer link + unused `posts`/`BlogPost`.
- Remove the `facebook` social-login branch; real category name in `products/category.$slug.tsx`; canonical from the request origin; localise placeholders; remove scaffold comments.

### Batch H — Settings enforcement
- `default_commission` feeds the checkout fallback; reject subtotal < `min_order_amount`; cap shipping at `max_shipping`; typed 4xx.

## Order

`A → G → B (migration) → C ‖ D ‖ F → H → E` (~3–4 focused days).

## Verification

1. `bunx prisma generate` (after Batch B).
2. `bunx tsc --noEmit` — expect only the 4 known pre-existing errors.
3. `biome check` on touched files.
4. `bun test` — baseline 399 pass / 1 pre-existing `rate-limit-fallback` failure.
5. New tests: contact persistence, settings enforcement, CMS fallback.
6. Manual: `/about`, `/contact`, `/deals`, `/faq`, `/shipping`, `/returns`, `/privacy`, `/terms`, footer/header, sub-minimum checkout.
