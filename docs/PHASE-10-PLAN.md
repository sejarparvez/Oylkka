# Phase 10 — Dead code & documentation drift: implementation plan

**Scope:** `DEAD-01 … DEAD-11`, `DOC-01 … DOC-09` from `docs/AUDIT.md` (20 findings).
**Goal:** nothing that works is unreachable; nothing that is unreachable pretends to work; the
docs describe the code that actually exists.

**Decisions locked with the product owner:**

| Decision | Choice |
|---|---|
| Language | **English only.** Remove `i18next` + `i18next-browser-languagedetector` and correct the README claim (`DEAD-08`). No translation framework. |
| Dead endpoints | **Delete duplicates/superseded, build the customer-facing gaps.** `contact-vendor`, `pending-list`, `shipping/public-list` are removed; `answer-question` and `vendor/orders/cancel` get UI. |
| Unbuilt features (`DEAD-03/04/07`) | **Wire the ones whose backend is already complete** (global-attribute mapping, vouchers). **Delete** the product-report feature (no create endpoint exists) rather than build a new one in a hygiene phase. |
| Orphan stubs | Delete `careers.tsx` / `size-guide.tsx` route files (already unlinked from the footer). |
| `DEAD-11` (raw `apiClient`) | Route the four pages through their existing service hooks; add one missing avatar hook. |

## Baseline measured on the current tree

| Check | State |
|---|---|
| `DEAD-01` endpoints | All 5 files still present, **zero non-generated callers** (only `routeTree.gen.ts`). |
| `DEAD-02` hooks | 19 originally listed. `useContentBlock` is now **used** (Phase 8: `/terms`, `/shipping`, `/returns`, `/privacy`); `useMyVouchers` / `useAutoApplyVouchers` are used by `checkout.tsx`. The rest still have no caller. |
| `DEAD-04` reports | `admin/reports/list.ts` exists; **no update endpoint and no page**. `useReportProductMutation` posts to `/api/product/report/create`, which **does not exist**. |
| `DEAD-05` returns | No `/dashboard/vendor/returns` or `/dashboard/admin/returns` route. Endpoints + hooks exist. Nav "Returns" points at an *order* status filter, not a queue. |
| `DEAD-06` compare | `/compare` route is complete; grep finds **no inbound link** and no "add to compare" control. |
| `DEAD-07` vouchers | `useCollectVoucher` / `useProductVouchers` unused; no vouchers page (NAV-01 removed `/dashboard/vouchers`). |
| `DEAD-03` mapping | Placeholder at `global-attributes/$id.tsx:282-303`; `product-mappings.ts` already returns the product's local `attributeOptions` + existing mappings; mapping hooks unused. |
| `DEAD-08/09/10` | `i18next*` never imported; `vitest` never referenced outside `package.json`; `pnpm.onlyBuiltDependencies` present. |
| `DEAD-11` | Raw `apiClient` in `admin/content`, `admin/settings`, `admin/staff/audit-logs`; raw `fetch` in `my-account.tsx:159`. |
| `DOC-08` | **Already fixed** — `TAX_RATE` is in `.env.example`. |
| `DOC-03` | **Partially stale** — `src/cloudinary/` now exists and is the real import path; only the `src/routes/router.tsx` → `src/router.tsx` half is wrong. |
| `DOC-04` | `blog*` routes gone; `bestsellers`, `categories`, `help`, `tracking`, `new-arrivals` are built. Only `careers` / `size-guide` remain stubs. |

---

## Batch A — Delete dead code (mechanical, no feature loss)

### A.1 — Unreferenced API endpoints (`DEAD-01`)
| Endpoint | Reason | Action |
|---|---|---|
| `src/routes/api/messages/contact-vendor.ts` | Duplicate of `/api/conversations/create` (which `product.$slug.tsx` uses); has its own unvalidated `sendEmail`. | Delete. |
| `src/routes/api/shop/pending-list.ts` | Superseded by `my-shop`. | Delete. |
| `src/routes/api/vendor/shipping/public-list.ts` | Superseded by `computeShippingEstimate` (`services/checkout/shipping`), wired in Phase 1 (`MONEY-30`). | Delete. |

After deletion, regenerate the route tree (`bun run dev` or the router CLI) so
`src/routeTree.gen.ts` drops the routes.

### A.2 — Product-report feature (`DEAD-04` + `DEAD-02`)
No create endpoint exists, so the admin list can only ever be empty. Remove the entire dangling
feature now; a real report/moderation feature is a new product, not a hygiene fix.

| File | Action |
|---|---|
| `src/routes/api/admin/reports/list.ts` | Delete. |
| `src/services/admin-reports.ts` | Delete (`useAdminReports`). |
| `src/services/extra.ts` | Delete the `useReportProductMutation` block (`:49-69`). The `extra.ts` file stays (followed-shops hooks). |
| `ProductReport` Prisma model | **Leave** (schema change out of scope; no migration in this phase). Note as an unused model until the feature ships. |

### A.3 — Other dangling service exports (`DEAD-02`)
| File | Export | Reason | Action |
|---|---|---|---|
| `src/services/admin-reviews.ts` | `useAdminReview` (single) | List page uses `useAdminReviews`; detail never opened. | Delete export. |
| `src/services/conversations.ts` | `useAdminCloseConversationMutation` | No UI action. | Delete export. |
| `src/services/conversations.ts` | `useUploadMessageImageMutation` | `api/messages/create.ts` inlines the upload; the validated `api/upload/message.ts` path is the only live one. | Delete export. |
| `src/services/extra.ts` | `useReportProductMutation` | See A.2. | Delete. |

The remaining `DEAD-02` exports are wired in Batches B–E, not deleted.

### A.4 — Orphan route stubs
`src/routes/careers.tsx`, `src/routes/size-guide.tsx` are `Hello "/x"!` stubs, already removed
from the footer (Phase 7). Delete both files; regenerate the route tree.

### A.5 — Dependencies & config (`DEAD-08/09/10`)
| `package.json` | Action |
|---|---|
| `dependencies.i18next`, `dependencies.i18next-browser-languagedetector` | Remove. |
| `devDependencies.vitest` | Remove (project uses `bun test`; `bunfig.toml` is the runner config). |
| `pnpm.onlyBuiltDependencies` | Remove the whole `pnpm` block. |

Run `bun install` after editing to refresh `bun.lock`.

---

## Batch B — Make working features reachable

### B.1 — Vendor + admin returns queues (`DEAD-05`)
Customers can submit returns that **no staff can action** — this is the most important item in
the phase. The endpoints (`/api/vendor/returns/{list,review}`, `/api/admin/returns/{list,review}`)
and hooks (`useVendorReturns`, `useReviewReturnMutation`, `useAdminReturns`,
`useAdminReviewReturnMutation`) already exist.

- New `src/routes/dashboard/vendor/returns/index.tsx` — table of `useVendorReturns()` with order
  number, customer, reason, status badge, and an `APPROVE`/`REJECT` review dialog calling
  `useReviewReturnMutation`. Mirror `dashboard/orders/returns/index.tsx` for structure and status
  badges.
- New `src/routes/dashboard/admin/returns/index.tsx` — `useAdminReturns(status?)` with status
  tabs, a review dialog calling `useAdminReviewReturnMutation` (approve / refund with
  `refundAmount`, note). Include loading/error/empty states.
- `nav-main.tsx`: repoint the vendor and admin **Returns** sub-items from
  `/dashboard/{vendor,admin}/orders?status=REFUNDED` to the new queue routes (keep the order-status
  filter only if still useful; the queue is the correct destination).

### B.2 — Vendor order cancel UI (`DEAD-01`)
`api/vendor/orders/cancel.ts` is fully implemented (reason validation, `unwindUnpaidOrder`,
restock, email, audit). Only a trigger is missing.

- Add `useCancelVendorOrderMutation` to `src/services/vendor-orders.ts`
  (`POST /api/vendor/orders/cancel`, `{ orderId, reason }`), invalidating the vendor order keys.
- On `dashboard/vendor/orders/$orderId.tsx`, render a **Cancel** action when the order is
  unpaid and not terminal (`paymentStatus !== 'PAID'`, status not `CANCELLED`/`REFUNDED`/`DELIVERED`),
  opening a reason dialog.

### B.3 — Vendor Q&A answering (`DEAD-01`)
`api/product/answer-question.ts` is complete; customers ask via `product-questions.tsx`, but no
vendor surface exists, so every question stays "Awaiting answer".

- New `GET /api/vendor/questions` — list `ProductQuestion` rows across the vendor's products
  (`where: { product: { shopId } }`, unanswered first), joined to product name/slug.
- New `src/services/vendor-questions.ts` — `useVendorQuestions()` + `useAnswerQuestionMutation()`
  (the latter can call the existing `/api/product/answer-question`).
- New `src/routes/dashboard/vendor/questions/index.tsx` — unanswered questions with an inline
  answer box; `nav-main.tsx` gets a vendor **Questions** entry under Products.

### B.4 — Compare entry points (`DEAD-06`)
`/compare` is fully built but has no inbound link. Add a lightweight client-side compare list
(slug/id array in `localStorage`, same pattern as recently-viewed) and:
- an "Add to compare" control on `components/pages/shop/product-card.tsx` and the PDP
  (`product.$slug.tsx`) that appends the product and toasts;
- a "Compare (n)" affordance (e.g. in `product-card` toolbar / PDP) linking to `/compare`.

### B.5 — Voucher claim + wallet of vouchers (`DEAD-07`)
`useCollectVoucher` and `useProductVouchers` are unused, so issued vouchers can never be claimed.
- On the PDP, add an "Available vouchers" section using `useProductVouchers(productId)` with a
  **Collect** button calling `useCollectVoucher`.
- New `src/routes/dashboard/vouchers/index.tsx` listing `useMyVouchers()` (my/auto-apply already
  used at checkout) with used/expired states; add a **My Vouchers** entry to the customer nav
  (under Shopping) and the account dropdown.

---

## Batch C — Global-attribute mapping (`DEAD-03`)

Backend is complete: `product-mappings.ts` already returns both existing mappings **and** the
product's local `attributeOptions`; `map-product.ts` supports create/delete.

- `src/components/forms/product/` — add an **Attributes → Global mapping** section that uses
  `useProductGlobalAttributeMappings(productId)`, renders each local attribute value with a
  global-attribute/global-value selector, and calls `useMapProductAttributeMutation` /
  `useUnmapProductAttributeMutation`. Wire it into the product form (`product-page.tsx`).
- `dashboard/admin/global-attributes/$id.tsx:282-303` — replace the placeholder `MappingsView`.
  Extend `product-mappings.ts` with an optional `attributeId` query param (list
  `ProductGlobalAttributeValue` by `globalAttributeId`, joined to product) and render a read-only
  "products using this attribute" table. Remove the `_attributeId` unused-param workaround.

This closes the three `useProductGlobalAttributeMappings` / `useMapProductAttributeMutation` /
`useUnmapProductAttributeMutation` hooks and makes the admin model meaningful.

---

## Batch D — Service-layer hygiene (`DEAD-11`)

Replace raw data access with the hooks that already exist (this also consumes four `DEAD-02`
exports):

| Page | Replace with |
|---|---|
| `dashboard/admin/content/index.tsx:51,66` | `useAdminContentBlocks()` + `useSaveContentBlockMutation()` |
| `dashboard/admin/settings/index.tsx:34,44` | `useAdminSettings()` + `useUpdateSettingsMutation()` |
| `dashboard/admin/staff/audit-logs.tsx:42` | `useAdminAuditLogs()` |
| `dashboard/my-account.tsx:159` | New `useUploadAvatarMutation()` in `src/services/user.ts` (`apiClient.post('/api/upload/avatar', formData, { headers: multipart })`) |

Remove the now-unused local `apiClient` imports and duplicated `useState` load/save plumbing.

---

## Batch E — Documentation (`DOC-01 … DOC-09`)

| ID | File | Fix |
|---|---|---|
| DOC-01 | `docs/DESIGN.md:3` | "Next.js / shadcn-ui" → "TanStack Start / shadcn-ui". |
| DOC-02 | `docs/STRUCTURE.md:162, 315` | `reset-password.$token.tsx` → `reset-password.tsx` (URL `/reset-password`, uses `validateSearch`). |
| DOC-03 | `docs/STRUCTURE.md:141` | `src/routes/router.tsx` → `src/router.tsx`. **Cross out the `src/cloudinary/` half** — it exists and is correct. |
| DOC-04 | `docs/STRUCTURE.md:143-169` | Remove `blog.tsx` / `blog.$slug.tsx` / `careers.tsx` / `size-guide.tsx`; mark `bestsellers`/`categories`/`help`/`tracking`/`new-arrivals` as built; `shop.recently-viewed.tsx` → `recently-viewed.tsx`. |
| DOC-05 | `docs/STRUCTURE.md:216` | `admin/staff/ # Staff management` → audit logs only (index redirects); no member list/roles/invites. |
| DOC-06 | `docs/STRUCTURE.md:195-217`, `README.md:57-61` | Add `/dashboard/admin/global-attributes`, `/dashboard/admin/staff/audit-logs`, `/dashboard/vendor/sales`, `/dashboard/vendor/payouts/schedule`, `/dashboard/vendor/returns`, `/dashboard/vendor/questions`; fix the README tree to `routes/dashboard/vendor/` and `routes/dashboard/admin/`. |
| DOC-07 | `README.md:3, 73, 78` | Real-time tracking now exists (`/tracking`), wallet via top-up exists (`MONEY-16`) — verify phrasing; **remove** "Bengali language support (partial)". |
| DOC-08 | `.env.example` | **No change** — already fixed. Record as closed. |
| DOC-09 | `components.json:7` | Remove the `tailwind.config` key (Tailwind v4 is CSS-first; the file does not exist) so `shadcn add` works. |

Also update `docs/STRUCTURE.md` §6 status enums to match the current schema
(`ShopStatus` has no `APPROVED` after Phase 2; `ProductStatus` is `PUBLISHED`-based after DATA-13).

---

## Finding → batch map

| Finding | Batch | Resolution |
|---|---|---|
| DEAD-01 | A.1, B.2, B.3 | Delete 3 duplicate/superseded endpoints; wire answer-question + vendor cancel |
| DEAD-02 | A.2, A.3, B, C, D | Wire 8 hooks; delete 4 dangling hooks |
| DEAD-03 | C | Wire mapping UI + admin view |
| DEAD-04 | A.2 | Delete report feature (defer real build) |
| DEAD-05 | B.1 | Build vendor + admin returns queues |
| DEAD-06 | B.4 | Add compare entry points |
| DEAD-07 | B.5 | Add voucher claim + My Vouchers page |
| DEAD-08 | A.5, E | Remove i18n deps + README claim |
| DEAD-09 | A.5 | Remove `vitest` |
| DEAD-10 | A.5 | Remove `pnpm` block |
| DEAD-11 | D | Route 4 pages through services |
| DOC-01 | E | DESIGN.md framework |
| DOC-02 | E | reset-password route |
| DOC-03 | E | router path (cloudinary already correct) |
| DOC-04 | E | route list after Phase 7/8 |
| DOC-05 | E | admin/staff description |
| DOC-06 | E | structure/README trees |
| DOC-07 | E | README claims (Bengali removed) |
| DOC-08 | — | Already fixed |
| DOC-09 | E | components.json |

## Order

`A (delete) → B (reachability) → C (mapping) → D (service layer) → E (docs)`.

A first: it removes files the later batches would otherwise have to account for. C is the only
larger new UI and is independent; if schedule pressure appears, ship A + B + D + E and defer C
with the placeholder removed rather than left misleading.

## Verification

1. `bun install` (after A.5) → `bun.lock` updated, no `i18next`/`vitest` entries.
2. `bun run dev` → `src/routeTree.gen.ts` regenerated; deleted routes absent.
3. `bunx tsc --noEmit` → no new errors (baseline: the known pre-existing sites only).
4. `bunx biome check .` → clean on touched files.
5. `bun test` → baseline holds (≥399 pass / 1 pre-existing `rate-limit-fallback` failure).
6. New tests (cheap):
   - vendor/admin returns page renders list + review dialog; hook calls the right endpoint;
   - `useCancelVendorOrderMutation` posts `{ orderId, reason }`;
   - compare list add/remove is idempotent;
   - `useUploadAvatarMutation` posts multipart to `/api/upload/avatar`.
7. `grep -rn "apiClient" src/routes/dashboard/{admin/content,admin/settings,admin/staff/audit-logs}.tsx src/routes/dashboard/my-account.tsx` → empty.
8. `grep -rn "contact-vendor\|pending-list\|shipping/public-list\|api/product/report/create" src` → only `routeTree.gen.ts` (if stale) or nothing.
9. Manual: vendor actions a return and cancels an unpaid order; admin actions a return; add two
   products to compare from a card + PDP and open `/compare`; collect a product voucher and see it
   under My Vouchers; answer a question as a vendor and see it on the PDP.

## Out of scope (explicitly deferred)

- The **product report** feature (create + moderation) — deleted, not built.
- **Real i18n / Bengali** — dependencies removed; English only.
- **Denormalised shop stat columns** and other Prisma schema changes — no migration in Phase 10.
- `ProductReport` model stays in the schema (unused) until the report feature is revisited.
