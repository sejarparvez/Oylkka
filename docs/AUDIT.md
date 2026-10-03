# Oylkka — Project Audit

**Subject:** `G:\mycode\Oylkka` — multi-vendor e-commerce marketplace (Bangladesh; bKash / COD / wallet)
**Stack:** TanStack Start (React 19) · Vite 8 · Prisma 7 + Neon · better-auth · Bun · Tailwind v4 + shadcn/ui
**Surface audited:** 102 page routes · 132 API routes · 131 service hooks · 49 Prisma models
**Findings:** ~350

---

## 0. How to read this document

### 0.1 Confidence markers

Every finding carries one of three markers. Do not skip it — it determines whether you need to reproduce the bug before fixing it.

| Marker | Meaning |
|---|---|
| **[V]** Verified | Read the code; the failure follows directly from what is written. |
| **[RTC]** Needs runtime confirmation | The defect is in place but only manifests at runtime (query shape, concurrency, browser behaviour). Reproduce before fixing. |
| **[I]** Inference | Conclusion drawn from adjacent code that was not fully traced. Verify before acting. |

### 0.2 ID scheme

IDs are prefixed by domain so they can be referenced directly in commit messages. Vendor-dashboard and admin-dashboard findings are filed under their **functional** domain (e.g. payouts land in `MONEY-`, shop stats in `DATA-`) rather than under a dashboard prefix, because the defect belongs to that subsystem.

| Prefix | Domain | Count |
|---|---|---|
| `MONEY-` | Payments, refunds, payouts, cart/checkout totals, stock | 68 |
| `FE-` | Frontend / React logic | 45 |
| `LIFE-` | Vendor onboarding & shop lifecycle | 25 |
| `CONTENT-` | Hardcoded copy, fabricated claims, dead content | 22 |
| `CUST-` | Customer-facing flows | 21 |
| `DATA-` | Analytics & denormalised aggregates | 15 |
| `AUTH-` | Authorisation, roles, audit | 12 |
| `STUB-` | Scaffold / placeholder pages | 11 |
| `DEAD-` | Dead code & documentation drift | 11 |
| `NAV-` | Navigation & routing | 10 |
| `DOC-` | Documentation & config | 9 |
| `A11Y-` | Accessibility | 6 |
| `TS-` | Type-safety escapes & tooling | 4 |
| `IMG-` | Image handling | 3 |

Severity: **CRIT** / **MAJ** / **MIN**

### 0.3 Two systemic findings that change how you read a green build

**The build passes typecheck. That is not evidence of correctness.**

1. **Prisma query shapes are not typechecked at all.** `SelectSubset` (`src/generated/prisma/internal/prismaNamespace.ts:163-165`) is a mapped type over `keyof T` where `T` is *your* literal, so an unknown field resolves to `never` instead of erroring:
   ```ts
   export type SelectSubset<T, U> = {
     [key in keyof T]: key extends keyof U ? T[key] : never
   } & ...
   ```
   `select: { image: true }` therefore compiles cleanly — `image` is typed `never`, and `never` is assignable to `boolean`. `tsc` reported **0 errors** on this project while `src/routes/api/product/public-reviews.ts:38` selects a field that does not exist. See Appendix F and `MONEY-14`.

2. **~20 router links bypass path type-checking.** `params={{} as never}` / `search={{} as never}` / `to={... as any}` appear at ~20 sites (Appendix F.2). This is precisely why `desktop-nav.tsx:14`'s `href: '/sale'` — a route that does not exist — compiles without complaint.

**Net effect:** an entire class of defect (renamed columns, dead links, wrong params) is invisible to static analysis in this codebase. Do not treat `tsc` passing as a quality gate.

### 0.4 Tooling baseline

| Check | Result |
|---|---|
| `tsc --noEmit` | 0 errors — **see §0.3, not meaningful** |
| `biome lint .` | 1 warning (`carousel.tsx:3` unused suppression) |
| `biome format` | 454 files fail — CRLF/LF line-ending drift only, no content issues |
| `bun test` | **Not run.** `bun` is not on PATH in the audit environment. 42 test files exist. |
| `pnpm.onlyBuiltDependencies` in `package.json` | Vestigial — project is Bun-managed |

---

## Phase 0 — Ship blockers

Money leaks, checkout is broken, or an unauthenticated actor can mutate orders. Nothing else matters until these close.

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| MONEY-01 | `api/checkout/bkash-callback.ts:30-56` | `GET ?status=cancel&orderId=<id>` has **no session, no ownership check, no signature verification and no state guard**. It releases reserved stock and sets `paymentStatus: 'FAILED'` on any order, including `PAID` ones. Replayable. | Require bKash signature + order ownership. Gate the transition with a conditional update: `order.updateMany({ where: { id, paymentStatus: 'PENDING' }, ... })` and branch on `result.count`. | CRIT | [RTC] | [X] |
| MONEY-02 | `api/checkout/bkash-callback.ts:30-56` + `lib/stock.ts:53-56` | `releaseReservedStock` decrements `reservedStock` with **no floor**. Combined with MONEY-01's replay, an attacker drives `reservedStock` negative; since `available = stock − reservedStock`, availability becomes unbounded. | Add `where: { id, reservedStock: { gte: quantity } }` via `updateMany`; treat `count === 0` as a no-op. Clamp with `Math.max(0, …)` as a second guard. | CRIT | [RTC] | [X] |
| MONEY-03 | `api/orders/admin-refund.ts:69-75` → `:129` | Concurrent refunds lose updates. Both read `refundAmount = 0`, both pass the `totalRefunded > order.total` check, the second write **overwrites** the first. Result: over-refund, double restock, double `refundBkashPayment`. | Conditional write: `order.updateMany({ where: { id, refundAmount: alreadyRefunded }, data: … })`; abort if `count === 0`. Or introduce a refund-ledger row with a unique constraint on `(orderId, idempotencyKey)`. | CRIT | [RTC] | [X] |
| MONEY-04 | `api/admin/returns/review.ts:85-128` | `refundAmount` comes from the request body with **no upper bound** (only `amount <= 0` rejected at `:78`), no `paymentStatus === 'PAID'` gate, and no re-entry guard — `VALID_STATUSES` (`:32`) validates only the destination, so `REJECTED → REFUNDED` is allowed and the endpoint is re-callable indefinitely. **Unlimited wallet-balance minting.** Contrast `orders/admin-refund.ts:72`, which *does* validate the cap. | Cap `amount` against `order.total − order.refundAmount`; require `paymentStatus === 'PAID'`; restrict the transition graph; make the operation idempotent. | CRIT | [V] | [X] |
| MONEY-05 | `api/admin/returns/review.ts:85-160` | Wallet credit (`:87-109`) and the order update (`:117`) commit in **separate** transactions. A crash between them leaves money credited with no order state change — and MONEY-04 lets the caller retry. | Single `$transaction`. | CRIT | [V] | [X] |
| MONEY-06 | `api/admin/returns/review.ts:85-160` | Only `WALLET` is handled. For `BKASH` / `CASH_ON_DELIVERY` the row is set to `REFUNDED` and the customer is emailed *"Refund Processed"* (`:140-160`) while **no gateway call is ever made**. Compare `orders/admin-refund.ts:188`, which correctly calls `refundBkashPayment()`. | Dispatch per payment method; do not mark `REFUNDED` or send a success email until the gateway confirms. | CRIT | [V] | [X] |
| MONEY-07 | `api/orders/admin-refund.ts:98-124` | The wallet branch has no `paymentStatus` gate. `bkashRefundInfo` is gated at `:89`; the wallet path is not. A `PENDING` / `FAILED` / `CANCELLED` wallet order can be refunded — balance from nothing. | Gate the wallet branch on `paymentStatus === 'PAID'`. | CRIT | [V] | [X] |
| MONEY-08 | `api/orders/admin-refund.ts:165-168` | `orderItem.updateMany({ where: { id: { in: body.itemIds } } })` — **not scoped to `orderId`**. `body.itemIds` is unvalidated client input, so items on a *different* order can be marked `REFUNDED`. Contrast `:146`, which filters correctly for the restock loop. | `where: { id: { in: body.itemIds }, orderId: body.orderId }`. | CRIT | [V] | [X] |
| MONEY-09 | `api/orders/admin-refund.ts:143-175` | With no `itemIds`, **all** items are restored on *every* partial refund — two partial refunds restore stock twice. No check that an item ever shipped. `amount` (`:26`) is fully decoupled from `itemIds`, so refunding ৳1000 against two ৳300 items restores both. | Restore only items whose value is covered by the refund; track per-item refunded state (the `fulfillmentStatus: 'REFUNDED'` write at `:166` is the natural place to gate on). | CRIT | [V] | [X] |
| MONEY-10 | `prisma/shop.prisma:87-99` + `api/admin/payouts/process.ts:42-48` | **No payout clawback exists anywhere.** Sequence: deliver → admin pays vendor → admin refunds customer. Vendor keeps the payout *and* the customer is refunded. `prisma/order.prisma:73-74` uses `onDelete: Restrict`, so the money can never be reversed. | Add a `PayoutItem` reversal/refund field; on refund, either claw back or flag the payout for recovery. | CRIT | [I] |  |
| MONEY-11 | `api/checkout/create.ts:285-306` + `api/checkout/bkash-callback.ts:107-118` | Success path is a read-check-write with no row lock: re-reads `paymentStatus` via `findUnique` (`:109`) then writes. At Read Committed two concurrent callbacks — or a callback racing the IPN — both observe `PENDING`, both proceed, and the cashback `balance: { increment }` at `:195-197` **fires twice**. | `order.updateMany({ where: { id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'PAID', … } })` inside the transaction; return early if `count === 0`. | CRIT | [RTC] | [X] |
| MONEY-12 | `api/checkout/bkash-ipn.ts` + `bkash-callback.ts:97` | Gateway status is queried and trusted, but the **captured amount is never compared to `order.total`** before marking `PAID`. Combined with MONEY-11's replay window, a lower-value transaction settles a larger order. | Assert `result.amount === order.total` (allow tolerance) before finalising. | CRIT | [I] | [X] |
| MONEY-13 | `checkout.tsx:227-236, 491` + `api/checkout/create.ts:34-52` | **Customer is shown a discount and charged full price.** `appliedCoupon.discountAmount` reduces the displayed total, but `onPlaceOrder` (`checkout.tsx:300-311`) never sends `couponCode`, and `checkoutSchema` has no such field. Direct charge dispute. | Add `couponCode: z.string().optional()` to `checkoutSchema`; resolve and validate it server-side; return the authoritative total and re-render from the response. | CRIT | [V] |  |
| MONEY-14 | `api/product/public-reviews.ts:38` | `user: { select: { id, name, image: true } }` — `User` has **`imageUrl`**, not `image` (`prisma/user.prisma:7`). Confirmed against the generated `UserSelect` type, which lists `imageUrl` and has no `image`. Throws `PrismaClientValidationError` at runtime → **the reviews section 500s on every product page.** Typecheck does not catch it (§0.3). | `image: true` → `imageUrl: true`. Grep the whole codebase for other invalid selects — there is likely more than one. | CRIT | [V] schema mismatch / [RTC] for the throw | [X] |
| MONEY-15 | `components/pages/product/review-form.tsx:101` | Posts `/api/product/create-review`. **That endpoint does not exist** (`api/product/` has only answer-question, check-sku, create, delete, edit, get-single, public-*, vendor-*). Reviews can be read, edited, deleted and moderated — but **never created**. Worse, `:107` calls `await res.json()` on a non-OK response, so the real error is swallowed. | Add `api/product/create-review.ts` (verify the reviewer bought the product; validate with a Zod schema; guard CSRF and rate limit). Check `res.ok` before parsing. | CRIT | [V] |  |
| MONEY-16 | `services/wallet.ts:37-42` + `dashboard/wallet.tsx:24,43` | `useTopUpMutation` posts `/api/wallet/top-up`. `api/wallet/` contains **only `get.ts`**. The wallet page advertises a Top Up button that always 404s — so the `WALLET` payment method, marked `available: true` in `payment-selector.tsx:51`, can never be funded. | Add the top-up endpoint (bKash `payment/create` for top-ups) + transaction history endpoint; the wallet page currently has no history either. | CRIT | [V] |  |
| MONEY-17 | `api/admin/customers/$id.ts:74-146` | Gated by `requireAdminOrManager`, accepts an **arbitrary role string** with no Zod enum, then spreads raw JSON into `prisma.user.update`. A **manager can promote anyone — including themselves — to `ADMIN`**, or demote/ban existing admins. No self-targeting guard, no last-admin guard. | `z.enum([...])` on `role`; restrict role mutation to `ADMIN`; block self-demotion and demoting the last admin. | CRIT | [V] | [X] |
| MONEY-18 | `api/admin/customers/$id.ts:125-137` + `lib/auth.ts:191` | Banning sets `banned` / `banReason` but **never deletes the target's `Session` rows**. Sessions last `30 * 24 * 60 * 60`. A banned user — or a compromised vendor account holding customer PII — stays authenticated for up to 30 days. | `prisma.session.deleteMany({ where: { userId } })` in the same transaction as the ban. | CRIT | [V] | [X] |
| MONEY-19 | `lib/rate-limit-guard.ts:22-26` | The bucket key is client-controlled: `headers?.get('x-forwarded-for')`. Rotating the header yields a fresh bucket every request, defeating `authLimiter`, `checkoutLimiter`, `couponLimiter` and `messageLimiter` — enabling login brute force, coupon-code brute force and message spam. | Use the platform-provided client IP (Vercel/Nitro/host header), or fall back to a session/user identifier. Never trust a forwarded header directly. | CRIT | [V] | [X] |
| MONEY-20 | `lib/csrf.ts:29-31` | `if (!origin && !referer) return null;` — **fails open.** An attacker simply omits both headers. Additionally, several authenticated mutations skip `validateCsrf()` entirely: `api/addresses/{create,edit,delete}`, `api/shop/follow/toggle`, `api/admin/reviews/$id`, `api/reviews/my/$id`, `api/coupons` create, global-attribute mutations, question submission. | Require a custom header or double-submit token. Failing closed on absent headers. Roll CSRF out to every mutating route. | CRIT | [V] | [X] |
| MONEY-21 | `api/checkout/create.ts:102-109` + `api/product/public-single.ts:20` | `Shop.status` is **never selected and never validated** anywhere in the 655-line checkout flow, and public product queries filter only `status: 'PUBLISHED'`. Contrast `api/shop/public-single.ts:20`, which correctly filters `['APPROVED','ACTIVE']`. **A suspended vendor's products remain listed and purchasable**, and they can still mutate shipping zones and message customers. (Compounded by `LIFE-09`: nothing writes `SUSPENDED`, so the control doesn't exist yet.) | Add `shop: { status: { in: ['APPROVED','ACTIVE'] } }` to every public product query and validate shop status in checkout. | CRIT | [V] |  |
| LIFE-12 | `api/checkout/bkash-callback.ts:135-153` + `api/checkout/bkash-ipn.ts:113-131` | If `decrementStock` / `decrementVariantStock` throw during post-payment processing, the transaction rolls back and the order stays `PENDING`. `bkash-pay.ts:55-63` then rejects retry with *"Payment already processed"*. **The customer has paid, the order is dead, and there is no reconciliation path.** | Separate the payment-finalisation transaction from stock deduction. If stock fails, keep the order `PAID` and mark it for manual reconciliation rather than rolling back the payment. | CRIT | [I] | [X] |
| LIFE-13 | `api/checkout/bkash-pay.ts:66-85, 96-101` + `bkash-callback.ts:53` | The callback sets `FAILED` but **never clears `metadata.bkashCheckoutURL`**. On retry the order flips back to `PENDING` and the **stale, dead checkout URL** from the previous attempt is returned. A customer whose payment failed can never successfully retry. | Store the checkout URL per attempt; always mint a fresh one on retry. | CRIT | [V] | [X] |
| MONEY-22 | `api/checkout/create.ts:138-151` | The bKash reservation loop iterates **only `item.variant`** — simple (non-variant) products are never reserved, while COD/WALLET do decrement parent `stock` at `:512-528`. The last unit of a simple product can sell twice, and the bKash/COD paths are asymmetric. | Reserve variant stock *and* parent product stock for bKash, matching the COD path. | CRIT | [V] |  |
| MONEY-23 | `api/checkout/create.ts:556-583` | Cashback is credited to the wallet and vouchers marked `usedAt` at order-creation time for `CASH_ON_DELIVERY` — which may never be collected. **Repeatable cashback-farming vector.** | Defer cashback and voucher consumption to `PAID` / `DELIVERED`. | CRIT | [V] |  |
| MONEY-24 | `api/cart/add.ts:94-100, 120-135` | `!quantity \|\| quantity < 1` accepts `1.5` and any magnitude. Only `available < 1` is checked; nothing compares `quantity` to `stock` or to `stock − reservedStock`. Then `existingItem.quantity + quantity` is written blindly. Repeated adds drive cart quantity far past stock; COD then fails at `create.ts:512-528` **after** the customer completes the form. | `z.number().int().min(1).max(available)` server-side, where `available = stock − reservedStock`. | CRIT | [V] |  |
| MONEY-25 | `lib/stock.ts:31-41` | The reservation guard is **mathematically wrong**: `where: { stock: { gte: variant.reservedStock + quantity } }` tests `stock` against a *stale* `reservedStock` and never constrains `reservedStock` itself. `stock >= a + b` is not `stock − a >= b`. Two concurrent reservations both read `stock=5, reservedStock=0`, both pass `5 >= 0+qty`, both increment → oversell. | Optimistic version check: `where: { id: variantId, reservedStock: variant.reservedStock }`, or a conditional on `stock − reservedStock`. | CRIT | [RTC] | [X] |
| MONEY-26 | `api/product/edit.ts:409` + `variant-list.tsx:39-52` | `edit.ts` writes `reservedStock: variant.reservedStock ?? 0`, but the variant form never carries that field. **Every vendor product save zeroes all active bKash holds**, feeding MONEY-25 directly. | Exclude `reservedStock` from the update payload. | CRIT | [V] | [X] |
| MONEY-27 | `api/checkout/create.ts:483-491` vs `:628-651` | The insufficient-wallet-balance message is built precisely, then discarded: `catch (_error)` at both handlers replaces it with a generic 500. Combined with MONEY-16, a user cannot pay by wallet or learn why. | Re-throw typed domain errors and map them to 4xx; keep the generic 500 for genuinely unexpected failures. | CRIT | [V] |  |
| MONEY-28 | `api/cart/add.ts:50-59` | The parent-stock check (`if (product.stock < 1) throw`) runs **before** the variant check. For any product where variants carry the real inventory and the parent row is `stock = 0`, **every variant add-to-cart fails**. | Check `product.hasVariants && !variantId` first; validate against variant stock only. | CRIT | [V] |  |
| MONEY-29 | `api/cart/add.ts:103` + `cart.tsx:40-43` | `savedPrice` is computed from `product.discountPrice ?? product.price` **outside** the `if (variantId)` block, and the client subtotal uses `item.savedPrice ?? item.product.price`. **Variant prices never reach the cart line or the displayed subtotal.** Feeds MONEY-13 and makes displayed ≠ charged. | Use `variant?.discountPrice ?? variant?.price ?? product.discountPrice ?? product.price` in both places. | CRIT | [V] |  |

---

## Phase 1 — Data integrity

Inventory, edit-safety, and queue correctness.

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| MONEY-29b | `api/checkout/create.ts:354` | `TAX_RATE` is read from the environment but exists in **neither `.env` nor `.env.example`** → tax is silently always 0, undocumented. `checkout.tsx:236` has no tax term despite `cart.tsx:180` promising *"taxes calculated at checkout"*, and `invoice-pdf.ts` omits tax entirely. | Add `TAX_RATE` to `.env.example`; add a tax line to the client summary; include it in the invoice. | MAJ | [V] |  |
| MONEY-30 | `api/checkout/discount-preview.ts:43-56` vs `create.ts:285-306` | The quote the customer sees uses a **flat `Shop.shippingCost`** and ignores the district entirely; the charge uses zone `baseCost + perItem × qty` with `freeAbove`. Vendors configure zones in a fully-wired 443-line page — the preview just never reads them. `api/vendor/shipping/public-list.ts` exists and is unreferenced. | Make the preview zone-aware using the same lookup as `create.ts`. This is a pricing-accuracy bug, not a missing feature. | MAJ | [V] |  |
| MONEY-31 | `api/checkout/create.ts:262, 295-305` | With no matching zone, cost falls back to `shop.shippingCost`, which **defaults to `0`** (`prisma/shop.prisma:35`). A new shop with no zones configured silently gives free shipping nationwide. Overlapping zones are resolved by a bare `findFirst` — nondeterministic. | Require at least one active zone before a shop can list products; or default `shippingCost` to a sane non-zero value; make zone selection deterministic. | MAJ | [V] |  |
| MONEY-32 | `api/product/edit.ts:207-219, 324-356` | Cloudinary assets and product attributes are deleted **before** the DB work, with no transaction. `prisma/order.prisma:73-74` makes `OrderItem.variantId` `onDelete: Restrict`, so a variant that has been ordered cannot be deleted-and-recreated → the request fails **after** the images are already gone. One bad edit permanently loses catalog data. | Do destructive work last, inside a transaction; skip deletion of referenced variants; take a pre-edit snapshot. | CRIT | [V] |  |
| MONEY-33 | `components/forms/product/product-form-provider.tsx:110-126` vs `api/product/edit.ts:56, 79, 258-265, 498` | The provider only appends `productImages` for entries with a `file` (`:122-126`). It **never sends `keepExistingImage` or `removedGalleryIds`**, which the server reads at `:56`/`:79`. `keepExistingImage` defaults to `false`, so `:258-265` deletes every existing Cloudinary asset and `:498` runs `deleteMany: {}` on `ProductImage` rows. **Save a product without uploading a new image and all images are gone.** Removing an image in the UI has no server effect. | Send `keepExistingImage` for retained images and `removedGalleryIds` for deleted ones; server must default to *keeping* when the key is absent. | CRIT | [V] |  |
| MONEY-34 | `api/product/edit.ts:354` | Variants are deleted then re-created with new IDs. For any product with an order item the FK `Restrict` blocks deletion → 500 and the whole edit is lost. For un-ordered products, variant IDs, `VariantImage` rows and downstream references are silently destroyed. | Upsert variants and diff against existing IDs; only delete variants with no order items. | CRIT | [V] |  |
| MONEY-35 | `prisma/cart.prisma:14` + `api/wishlist/add.ts:44-50` | `WishlistItem` is `@@unique([userId, productId])` but the duplicate check **includes `variantId`**. Wishlisting variant B after variant A finds no match, then violates the constraint → 500. | Align the check with the constraint (decide deliberately whether wishlist is per-product or per-variant, then make schema, check and UI agree). | MAJ | [V] |  |
| MONEY-36 | `api/cart/update.ts:48-52` | Validates quantity against **raw `stock`**, ignoring `reservedStock` — so the cart permits a quantity that checkout will reject. | Validate against `stock − reservedStock`. | MAJ | [V] |  |
| MONEY-37 | `prisma/cart.prisma` | No unique constraint on `(cartId, productId, variantId)`. Concurrent adds create duplicate cart lines. | Add `@@unique([cartId, productId, variantId])` and upsert. | MAJ | [V] |  |
| MONEY-38 | `services/checkout/coupon-validator.ts`, `api/vouchers/collect.ts:60-68` | `maxUses` / `maxClaimCount` use **check-then-increment** with no conditional update, and `CouponUsage` has no uniqueness. A replayed claim is not prevented. `startsAt` is never checked, so a not-yet-active voucher is claimable. | Conditional `updateMany` on the counter, or a unique constraint on `(couponId, userId)` per order. Validate `startsAt <= now`. | MAJ | [V] |  |
| MONEY-39 | `services/checkout/voucher-processor.ts` | Category-scoped coupons cannot identify category IDs from the cart shape it selects, so scope is evaluated against the **whole cart**. The BOGO path mixes parent and variant prices when valuing free items. | Select the category in the cart query and evaluate scope per item. | MAJ | [I] |  |
| MONEY-40 | `lib/email-queue.ts` | `PENDING` rows are read with **no atomic claim**, and `queueEmail` also triggers immediate processing which overlaps the 30s interval worker. Emails send multiple times. | Claim with `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PROCESSING' } })` and branch on `count`. | MAJ | [V] |  |
| MONEY-41 | `lib/invoice-queue.ts` | `findMany(PENDING)` followed by `update(status: 'PROCESSING')` is a non-atomic two-step; concurrent workers process the same invoice twice. | Same claim pattern as MONEY-40. | MAJ | [V] |  |
| MONEY-42 | `lib/db.ts:19-48` | Three `setInterval` workers (email queue, invoice queue, cart cleanup) start on **module import** via floating dynamic imports, guarded only by per-process globals. Unsuitable for serverless; multiple instances multiply the work. | Move to an external scheduler / dedicated worker process, or gate behind an explicit env flag. | MAJ | [V] |  |
| MONEY-43 | `lib/cart-cleanup.ts` | Hourly-deletes expired carts, but **nothing ever writes `expiresAt`** — dead code; carts never expire. | Write `expiresAt` on cart create, or remove the worker. | MIN | [V] |  |
| MONEY-44 | `api/orders/admin-cancel.ts`, `api/vendor/orders/cancel.ts`, `api/orders/admin-fulfill.ts` | Cancelling a pending bKash order **does not release reserved stock** (permanent leak). Conversely `vendor/orders/cancel` and `admin-fulfill` call `incrementStock` / `incrementVariantStock` on **physical** `stock` for orders whose checkout path only ever *reserved* — so both increment and release touch `stock`, producing phantom inventory. | One consistent model: reserve → commit-or-release, with a single set of helpers used by every transition. | MAJ | [V] |  |
| MONEY-45 | `api/orders/admin-refund.ts:150-160`, `api/vendor/orders/cancel.ts`, `api/admin/payouts/pending.ts` | Restock paths use raw `tx.product.update({ data: { stock: { increment } } })` rather than the `incrementStock` helpers — divergent behaviour and no status check. | Route all stock movement through `lib/stock.ts`. | MIN | [V] |  |
| MONEY-46 | `api/orders/admin-cancel.ts` | Does not restock, and it is not checked against terminal states — a delivered or shipped order can be cancelled. | Restrict to cancellable statuses; restock consistently. | MAJ | [I] |  |
| MONEY-47 | `api/admin/settings/update.ts:19-27` | Upserts **arbitrary keys** with no allowlist. | Whitelist `SiteSetting` keys and validate values per key. | MAJ | [V] |  |
| MONEY-48 | `api/admin/reviews/$id.ts:47-145` | Moderation mutations lack CSRF, pass unvalidated booleans straight into Prisma, and delete across 3 tables non-transactionally. No soft-delete semantics, so a rejected review cannot be reinstated. | CSRF + Zod; single transaction; add a moderation status with history. | MAJ | [V] |  |
| MONEY-49 | `api/messages/create.ts:73-78` | Direct Cloudinary upload with **no MIME check and no size cap**, bypassing the validated `api/upload/message.ts` path. Unbounded uploads from any authenticated user. | Delete the inline upload path; go through the validated endpoint. | MAJ | [V] |  |
| MONEY-50 | `api/product/create.ts:219, 355, 415-470` | Uploads to Cloudinary **before** the DB write, and attribute/join rows are written outside a transaction → orphaned Cloudinary assets on failure. Contrast `api/shop/apply.ts:105-126`, which has the same shape (see LIFE-11). | Write the DB first, upload second, and delete orphans on failure. | MAJ | [V] |  |
| MONEY-51 | `api/orders/$orderId.ts:34-39` | Returns `fulfillmentStatus`, `trackingNumber`, `trackingUrl`, `shippedAt`, `deliveredAt` — but `$orderId.tsx` renders a **static timeline** with no tracking link and no per-shop grouping. Half the data is fetched and discarded. | Render the fields; group items by shop. | MAJ | [V] |  |
| MONEY-52 | `api/orders/list.ts`, `api/vendor/orders/list.ts` | Both **unbounded** — no `take`, no cursor. A customer or vendor with thousands of orders loads everything. | Paginate. | MAJ | [V] |  |
| MONEY-53 | `api/admin/payouts/pending.ts:15-52` | N+1: `take: 200` shops with no `orderBy`/`where`, then `take: 500` items each. Shops and items beyond the cap are **silently omitted** from the payout queue. Vendor-facing equivalents have the same shape. | Aggregate in a single grouped query; paginate; make truncation visible. | MAJ | [V] |  |
| MONEY-54 | `Invoice.pdfUrl` | Returned directly from the API. A shared or Cloudinary URL is the **only access control** on customer invoices. | Serve through a signed, short-lived URL or an authorised endpoint. | MAJ | [I] |  |
| MONEY-55 | `api/checkout/create.ts:447` | Writes `shopId: ''` when a product has no shop. | Reject or quarantine orphan products. | MIN | [V] |  |
| MONEY-56 | `api/shop/follow/toggle.ts` | No CSRF check and no shop validation. | Add both. | MAJ | [V] |  |
| MONEY-57 | `api/addresses/{create,edit,delete}.ts` | Authenticate but skip `validateCsrf()` and BD-format validation. Unsetting or deleting the default address leaves the account with **zero** defaults. | CSRF + Zod; promote another address to default on unset/delete. | MAJ | [V] |  |
| MONEY-58 | `api/reviews/my/$id.ts` | Skips CSRF and does not bound the `rating` value. | CSRF + Zod. | MIN | [V] |  |
| MONEY-59 | `lib/bkash.ts`, `cloudinary/upload-image.ts:13-32` | External calls with **no timeout and no `AbortSignal`**. A hung gateway holds the request open indefinitely. | Wrap in `AbortSignal.timeout(...)`. | MAJ | [V] |  |
| MONEY-60 | `api/messages/create.ts:103` and several fire-and-forget sites | Notification failures swallowed with a bare `.catch(() => {})`; `api/vendor/orders/$orderId.ts:229` is a floating promise with no rejection handler at all. | Log failures; keep them off the response path. | MIN | [V] |  |
| MONEY-61 | `api/admin/payouts/process.ts:62-83` | Payout is created with `status: 'COMPLETED'` — **no review state, no transfer evidence.** `Payout.reference` (`prisma/shop.prisma:71`) is never populated, and no shop-status check means a suspended vendor can still be paid. | Create as `PENDING`; require a reference; block non-`ACTIVE` shops. | MAJ | [V] |  |
| MONEY-62 | `api/admin/returns/review.ts:32-35, 121` | No state machine (`VALID_STATUSES` checks only the destination — contrast `api/vendor/returns/review.ts:45-48, 61-66`, which correctly restricts to `PENDING`). No stock restoration, so the two refund paths diverge on inventory. `:121` **overwrites** any prior `refundReason` with the return's free-text `details`. | Restrict transitions; restock consistently; append rather than overwrite the reason. | MAJ | [V] |  |
| MONEY-63 | `api/returns/create.ts:33, 169` | `resolution` is stored unvalidated → an invalid value yields an opaque 500 from `:174-178`. | Zod enum. | MIN | [V] |  |
| MONEY-64 | `schemas/product-api-schema.ts:33-35` | `price: z.number().min(0.01)`, `discountPrice: z.number().min(0)` with **no `.refine()`** tying them together. A direct API call can set `discountPrice > price`, producing negative-margin lines that flow into checkout and payout splits. | `.refine(d => d === undefined || d < price)`. | MAJ | [V] |  |
| MONEY-65 | `schemas/shop-schema.ts:7, 9, 11-13` | `phone`, `website`, `addressLine1`, `addressLine2`, `city`, `state`, `country`, `postalCode` are all `z.string().optional()` with no format validation. | Validate BD phone, URL, postcode. | MIN | [V] |  |
| MONEY-66 | `api/vendor/shipping/create.ts:35+`, `edit.ts:30+` | No district-membership check, no duplicate-district-across-zones check, negative `perItem` / `freeAbove` accepted. `edit` validates even more weakly. | Validate districts against `lib/bd-districts.ts`; reject overlaps and negatives; enforce `shop.status === 'ACTIVE'`. | MAJ | [V] |  |
| MONEY-67 | `api/messages/create.ts:31-36` | Rejects image-only messages (`conversationId and content are required`) even though the composer allows attaching an image alone. | Align validation with the UI. | MAJ | [V] |  |

---

## Phase 2 — Vendor lifecycle

Three hard dead ends here mean a rejected applicant or a paid vendor can be stranded with no path forward. Fix before onboarding real vendors.

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| LIFE-01 | `lib/slug.ts:6` + `api/shop/apply.ts:67-73` | **Bangla shop names 400.** `.replace(/[^\w-]/g, '')` strips all non-ASCII, so `আল-আমিন স্টোর` produces an empty slug. For a Bangladesh marketplace this blocks the single most common input. | Transliterate or fall back to a shop-id-based slug when the result is empty. | CRIT | [V] |  |
| LIFE-02 | `api/shop/apply.ts:25-34` | Returns 409 on **any** existing shop, unconditionally. A rejected vendor can never re-apply. | Allow re-application when the existing shop is `REJECTED`; update in place. | CRIT | [V] |  |
| LIFE-03 | `dashboard/become-vendor/apply.tsx:32-42` | Only `PENDING` and `ACTIVE` are guarded. `REJECTED` falls straight through to `<ShopForm mode='create' />`, so a rejected applicant never sees the rejection reason at `pending.tsx:42-64` — the one screen that would explain what to fix. **The rejection-reason screen is unreachable exactly for the people who need it.** | Add a `REJECTED` branch that surfaces `rejectionReason` and offers a correct re-apply path. | CRIT | [V] |  |
| LIFE-04 | `dashboard/become-vendor/pending.tsx:55-60` | The "Apply Again" button is a **dead end** — combined with LIFE-02 it 409s. | Point at a working re-apply route. | CRIT | [V] |  |
| LIFE-05 | `lib/email-templates.ts:297, 314` | The shop-approval email CTA is `ctaButton('Go to Dashboard', …)` pointing at **`/vendor/dashboard`, which does not exist.** Every approved vendor's first email leads to a 404. | Point at `/dashboard/vendor`. | CRIT | [V] |  |
| LIFE-06 | `dashboard/become-vendor/pending.tsx:37-40` | An `ACTIVE` vendor is redirected to `/dashboard` — the **customer** home page — with no explanation of the new state. | Redirect to `/dashboard/vendor`; `pending.tsx` has no `APPROVED` branch at all (`:66-84`). | MAJ | [V] |  |
| LIFE-07 | `components/forms/shop-form.tsx:121-134` | `onSubmit` is `if (!isEdit) { … }` with **no `else` branch**, and `:30` imports only `useApplyShopMutation`. Edit-mode save is a **silent no-op**: vendors fill in the form and nothing happens, with no error. | Add an update branch and `useUpdateShopMutation`. | CRIT | [V] |  |
| LIFE-08 | `dashboard/vendor/shop/branding.tsx:71-94` + `api/shop/update.ts:136-155` | Branding sends only `name`, `email` and the logo/banner flags; the server consumes them as a **full replace** (`parsed.data.X \|\| null`). Every branding save **nulls** `description`, `phone`, `website`, `addressLine1`, `addressLine2`, `city`, `state`, `country`, `postalCode`. | Partial update semantics (`.omit` the absent keys) or send the full object. | CRIT | [V] |  |
| LIFE-09 | `prisma/shop.prisma` (`ShopStatus`) | `SUSPENDED` is declared and **nothing anywhere writes it** — `lib/audit-log.ts:9` is a type literal only, and `api/shop/admin-list.ts:21` omits it. There is no suspend action, and the admin vendors list has no Suspended tab (`admin/vendors/index.tsx:35-40`, with `:42-53` falling back to the raw status string). | Implement suspend/unsuspend in the API and UI, and make MONEY-21 depend on it. | MAJ | [V] |  |
| LIFE-10 | `api/shop/approve.ts:57-61` | Approval jumps `PENDING → ACTIVE`, skipping `APPROVED` — so the `APPROVED` status is unreachable and `public-single.ts:20`'s `['APPROVED','ACTIVE']` filter is half-dead. | Pick one transition and make every consumer agree. | MIN | [V] |  |
| LIFE-11 | `schemas/shop-schema.ts:45-51` vs `api/shop/apply.ts:105, 120-126` | The schema's own message promises **2 MB**; the server rejects at **500 KB**. The user picks a 1 MB banner, the form accepts it, and they get an error **after** the logo has already been uploaded to Cloudinary at `:105` with no rollback → **orphaned asset**. | Make the limits agree; validate size before uploading; clean up on failure. | MAJ | [V] |  |
| LIFE-12b | `prisma/shop.prisma:31-33` | `bankName`, `bankAccountName`, `bankAccountNumber` exist but are **never written or read by any code**. There is no bKash/Nagad collection in the vendor flow either. **Payout destinations are never collected — vendors cannot be paid through the product.** | Add a payout-details form, encrypt at rest, mask in the UI. | CRIT | [V] |  |
| LIFE-13 | `prisma/shop.prisma:34-35` | `commissionRate` and `shippingCost` are read (incl. `pending.ts:19,47`) but have **no writer anywhere**. Whether the vendor or the admin sets commission is undefined in code — a fraud risk if a vendor can. | Decide the owner explicitly; enforce it server-side. | MAJ | [V] |  |
| LIFE-14 | `dashboard/vendor/route.tsx:5-10` + `api/vendor/shipping/create.ts:27-33` | The vendor guard checks **role only** (`user.role === 'VENDOR'`), never shop status. Vendor APIs check shop *existence* (`if (!shop)`), not status — so a suspended vendor can still create shipping zones, read analytics and message customers. | Validate `shop.status === 'ACTIVE'` in every vendor API. | MAJ | [V] |  |
| LIFE-15 | `dashboard/vendor/` | **No `index.tsx`** — `route.tsx` is a bare `<Outlet />`, so `/dashboard/vendor` renders a blank page. Same for `become-vendor` and `admin/staff`. | Add index routes, or redirect to a real destination. | MAJ | [V] |  |
| LIFE-16 | `components/pages/shop/shop-card.tsx:50-53` | The "Verified" badge is **unconditional** — no flag guards it, so any shop renders as verified. | Gate on `status === 'ACTIVE'` plus an explicit `isVerified` field. | MAJ | [V] |  |
| LIFE-17 | `api/vendor/shop/policies.ts:57-70` | Shop policies are **write-only** — saved but never selected by `api/shop/public-single.ts`, so customers never see them. The PUT replaces the whole JSON blob with three keys, has no length limit, and does not require `shop.status === 'ACTIVE'`. | Select and render them; partial update; length limit. | MAJ | [V] |  |
| LIFE-18 | `admin/vendors/index.tsx:55-64` vs `api/shop/approve.ts:16` / `reject.ts:16` | The UI allows ADMIN **and** MANAGER to approve/reject; the endpoints require `requireAdmin`. A manager clicks approve and gets a 403. | Align the UI gate with the API, or relax the API deliberately. | MAJ | [V] |  |
| LIFE-19 | `api/shop/approve.ts:54-85` | Role promotion **is** correctly inside the transaction (`:68`) — the one correct part of this flow. But only `SHOP_APPROVED` is logged; `USER_ROLE_CHANGED` is declared at `lib/audit-log.ts:12` and never emitted. | Log the role change. | MIN | [V] |  |
| LIFE-20 | `admin/vendors/index.tsx` | No document/NID/trade-licence review UI. The `Shop` model carries fields for them; they are never uploaded or displayed, so "approve" is a decision made with no evidence. | Add a document upload + review step, or remove the fields. | MAJ | [I] |  |
| LIFE-21 | `become-vendor/pending.tsx:17-22` | Polls every 30s to detect approval. No realtime, and it runs indefinitely with no terminal state. | Keep the poll but stop on terminal states; consider SSE. | MIN | [V] |  |
| LIFE-22 | `dashboard/become-vendor/apply.tsx:33, 38` + `pending.tsx:33, 38` | `navigate()` called **during render** — a state update in the component body. Causes React warnings and unreliable redirects. | `<Navigate to=… />` or an effect. | MAJ | [V] |  |
| LIFE-23 | — | No onboarding checklist or wizard. Everything a new vendor must configure (shop details, shipping zones, payout details, first product) must be discovered manually. | Add a setup-progress checklist on the vendor dashboard. | MIN | [I] |  |

---

## Phase 3 — Authorisation & role model

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| AUTH-01 | `dashboard/admin/route.tsx` | **No layout-level guard** — a bare `<Outlet />` with no `beforeLoad`, unlike `dashboard/vendor/route.tsx:4-9`. Six children have no own guard either: `vendors/payouts`, `content/index`, `staff/route`, `staff/audit-logs`, `settings/index`, `messages/{index,$id}`. APIs enforce roles correctly, so this is UI exposure rather than an API bypass — but admin data shapes render for non-admins. | Add `beforeLoad` to the layout; remove the now-redundant child guards. | MAJ | [V] |  |
| AUTH-02 | `lib/auth.ts:194-201` | better-auth's `admin` plugin is live with `adminRoles: ['ADMIN']`. It exposes built-in endpoints for user creation, password set, role set, ban and **impersonation** — `Session.impersonatedBy` (`prisma/user.prisma:54`) confirms impersonation is active. **None of it routes through `createAuditLog`.** The app now has two competing role/ban systems, and the more powerful one is unaudited. | Disable the plugin's admin routes, or wrap them with audit logging. | MAJ | [V] |  |
| AUTH-03 | `lib/audit-log.ts:43` + `prisma/audit.prisma:14` | `@@unique([actorId, action, entity, entityId])` combined with `createAuditLog` using `.create` (not `upsert`) means the **second** time an actor performs the same action on the same entity, the insert throws. In `admin/customers/$id.ts:102` it is awaited inside the request → throws → caught → 500 → **the ban is never applied**, but the audit row exists. Elsewhere it is fire-and-forget with `.catch()`, so the entry is silently lost. **The audit trail cannot function as history.** | Drop the unique constraint, or make the key include a timestamp/sequence. Fix the ordering in `customers/$id.ts` (see AUTH-04). | CRIT | [V] |  |
| AUTH-04 | `api/admin/customers/$id.ts:101-123` | Audit entries are written **before** the mutation at `:125`, outside a transaction, so a failed update leaves a false audit record. Also returns **401** instead of 403 for an authenticated non-admin (`:82`), and bypasses the `requireAdminOrManager` helper every sibling route uses. | Mutate first, then log, in one transaction. Use the shared helper and correct status codes. | MAJ | [V] |  |
| AUTH-05 | `api/vendor/orders/$orderId.ts:8-17` | The transition map is correct (blocks `PENDING → DELIVERED`), but the response returns customer **email, phone and full address for unpaid orders**, and the list returns `customerPhone`. Vendors can harvest buyer contact data for orders that were never paid. | Gate PII on `paymentStatus === 'PAID'`. | MAJ | [V] |  |
| AUTH-06 | `api/vendor/orders/$orderId.ts` | Response includes parent-order `subtotal` / `total`, exposing the **full multi-vendor basket** instead of only the vendor's share. Compounding it, there is no parent order status/payment check on transitions, so a vendor can walk items through `PROCESSING → SHIPPED → DELIVERED` on an already-`CANCELLED` or `REFUNDED` order — which then makes them **payout-eligible** (see MONEY-10). | Scope amounts to the vendor's items; validate the parent order state before transitions. | MAJ | [V] |  |
| AUTH-07 | `lib/auth.ts:128` | `minPasswordLength: 6` applies to admins and vendors who hold customer PII and trigger payouts. | Raise to 10+ and add a compromised-password check. | MAJ | [V] |  |
| AUTH-08 | — | **No 2FA anywhere** — `twoFactor|totp|2fa` has zero matches across `src/`. For a surface with ban, role-change and payout authority, combined with AUTH-07, this is a material gap. | Enable better-auth's 2FA plugin; require it for ADMIN. | MAJ | [V] |  |
| AUTH-09 | `api/admin/*` (29 endpoints) | **No rate limiting on any admin endpoint.** | Apply a per-actor limiter. | MAJ | [V] |  |
| AUTH-10 | `lib/roles.ts` vs `lib/auth.ts:195` | `MANAGER` and `CUSTOMER_SERVICE` are shown throughout the nav but are not better-auth admin roles, and `CUSTOMER_SERVICE` has no route tree at all (see NAV-01). | Either implement them or remove them from the role model. | MAJ | [V] |  |
| AUTH-11 | `api/vendor/returns/review.ts:68-76` | Vendor return decisions are never communicated to the customer — no email, and **no `createAuditLog`** despite this being a commercial decision. | Notify + audit. | MIN | [V] |  |
| AUTH-12 | `api/shop/approve.ts` / `reject.ts` | Correctly combine `requireAdmin` + CSRF + a `status === 'PENDING'` guard + a self-approval block. **No change needed** — this is the pattern the other admin routes should copy. | — | — | [V] |  |

---

## Phase 4 — Customer flow correctness

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| CUST-01 | `dashboard/orders/$orderId.tsx:477-485` + `api/returns/create.ts:74, 142-147` | **Multi-vendor orders cannot be returned.** The FormData omits `itemIds`, so `create.ts:74` loads *all* items, then `:142-147` rejects anything spanning more than one shop. There is no per-item selection UI, so any delivered multi-shop order is unreturnable. | Add per-item selection; allow a return to span shops (one `ReturnRequest` per shop). | MAJ | [V] |  |
| CUST-02 | `routes/returns.tsx:27, 37` vs `api/returns/create.ts:102-108` | The public policy promises **7 days**; the API enforces **30 days**. Customers are denied returns they were explicitly promised. Conversely `product.$slug.tsx:249, 557, 563` says "30-day" to the same customer. | Pick one number and drive the page from config. | MAJ | [V] |  |
| CUST-03 | `api/returns/create.ts:114` | The duplicate-return check is **skipped whenever `itemIds` is empty** — which is the UI's only path (see CUST-01). Duplicate returns are possible. | Validate against the order's items regardless of input shape. | MAJ | [V] |  |
| CUST-04 | `checkout.tsx:141-145, 232-236` vs `api/checkout/create.ts` | Client subtotal ignores variant price (MONEY-29) and **omits tax entirely**; shipping is a flat per-shop figure (MONEY-30). The displayed total and the confirmation total differ from what is persisted. | Return the authoritative breakdown from `create.ts` and render the order from the response. | MAJ | [V] |  |
| CUST-05 | `checkout.tsx` (whole flow) | **No delivery estimate is ever shown to the customer**, despite a fully-modelled `ShippingZone` / `ShippingZoneDistrict` system. | Surface the zone's ETA at district selection. | MAJ | [V] |  |
| CUST-06 | `api/checkout/create.ts:50` | `WALLET` is accepted as a payment method with no top-up path (MONEY-16) and the insufficient-balance message is swallowed (MONEY-27). | Hide the option when unusable, or complete the wallet flow. | MAJ | [V] |  |
| CUST-07 | — | No guest checkout — login is required and, per the audit, not clearly communicated before the user invests effort filling the form. | Either support guest checkout or state the requirement up front. | MIN | [I] |  |
| CUST-08 | `api/checkout/create.ts` | No double-submit protection on Place Order on the client; no idempotency key on the server. A double-click creates two orders. | Disable on `isPending` (partially done) and add an idempotency key. | MAJ | [I] |  |
| CUST-09 | `checkout/confirmation.tsx` + `api/orders/$orderId.ts` | Verify the order is scoped to the session user; the audit found ownership filters present, but this path deserves an explicit regression test. | Add a test. | MIN | [I] |  |
| CUST-10 | `dashboard/orders/` | No customer-initiated **cancel** endpoint — only `admin-cancel.ts` exists. And no retry-payment path for a `FAILED` order (see LIFE-13). | Add customer cancel within a state window; add retry for failed bKash. | MAJ | [V] |  |
| CUST-11 | `dashboard/wishlist.tsx:104-120` | Price display mixes levels: `variant?.discountPrice ?? product.discountPrice ?? variant?.price ?? product.price`, so a variant without a discount shows the **parent's** discount as a strike-through against the **variant's** price. | Resolve one price basis. | MAJ | [V] |  |
| CUST-12 | `dashboard/wishlist.tsx` + `api/wishlist/*.ts` | No move-to-cart, no out-of-stock handling, no price-change warning, no pagination; `api/shop/follow/list.ts` is unpaginated. | Add the missing affordances. | MIN | [V] |  |
| CUST-13 | `dashboard/wallet.tsx` | Balance only — **no transaction history** endpoint exists, so there is nothing to show even after MONEY-16 is fixed. | Add `api/wallet/transactions`. | MAJ | [V] |  |
| CUST-14 | `dashboard/messages/*` | `unreadCount` is computed by the API but **ignored by the UI** (`header/user-menu.tsx` has it commented out). A customer's own message leaves `isRead = false`, so a conversation shows permanently unread. No pagination, no polling, no block/report. | Wire the badge; fix the read semantics; paginate. | MAJ | [V] |  |
| CUST-15 | `dashboard/my-account.tsx:160-171` | Only name and avatar are editable; **email is hard-disabled**. No password change, no 2FA, no account deletion, no data export, no notification preferences — grep found none anywhere. | Implement the account surface. | MAJ | [V] |  |
| CUST-16 | `shop.recently-viewed.tsx:19, 47-69` | localStorage-only: device-bound, stores **stale price snapshots**, no stock check. The static `/shop/recently-viewed` route also **shadows any real shop using that slug**. | Move server-side; rename the route. | MAJ | [V] |  |
| CUST-17 | `api/cart/*` + `services/cart.ts:94-136` | All three cart mutations are **invalidate-only** — no optimistic update, no rollback. Rapid clicks race, and the stepper (`cart.tsx:137-147`) has no max clamp or out-of-stock disabled state. | Optimistic updates with rollback; clamp the stepper to `available`. | MAJ | [V] |  |
| CUST-18 | `dashboard/addresses.tsx:86, 242` | The submit UI has **no `<form>`** — `<Button onClick={handleSubmit}>`, so Enter never submits. Silent `return` on missing fields with no user feedback. | Wrap in `<form onSubmit={handleSubmit}>`; surface validation. | MAJ | [V] |  |
| CUST-19 | `dashboard/orders/index.tsx:126-128` and 3 siblings | The status-tab filter builds `to: \`/dashboard/orders/${qs ? \`?${qs}\` : ''}\`` — **TanStack Router does not parse `?` inside `to`**; the query must go in `search`. All four are cast `as never`/`as any`, and each page reads `window.location.search` with no `validateSearch`. The filter mechanism is broken end to end. | Use `validateSearch` + typed `search`; remove the casts. | MAJ | [V] |  |
| CUST-20 | `api/reviews/my/$id.ts` + `dashboard/reviews/index.tsx` | A customer's reviews are not linked to orders, so there is no **verified-buyer** concept, even though `Review.verified` exists. | Set `verified` from order history. | MIN | [I] |  |
| CUST-21 | `ReviewHelpfulVote` | `helpfulCount` is rendered but **there is no create-vote endpoint at all**, and `review-card.tsx:109-115`'s Helpful button has no handler. Visible, permanently dead control. | Add the endpoint and wire the button. | MAJ | [V] |  |

---

## Phase 5 — Frontend / React logic

### 5.1 Crashes and data loss

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| FE-01 | `components/pages/product/share-product.tsx:20` | `window.location.origin` is read **in the component body**, and `product-info.tsx` renders it unconditionally → **SSR `ReferenceError` takes down every product page.** | Read inside an effect / `useState` initialiser guarded by `typeof window`. | CRIT | [RTC] |  |
| FE-02 | `dashboard/vendor/products/edit.tsx:18` | `new URLSearchParams(window.location.search)` at the top of `RouteComponent` → SSR crash, no `validateSearch`, and no reactivity to `productId` changes. | Use router search params. | CRIT | [RTC] |  |
| FE-03 | `components/forms/product/product-form-provider.tsx:69-73` + `dashboard/vendor/products/edit.tsx:46-80` | `useEffect(… methods.reset(defaultValues), [defaultValues, methods])` depends on a prop that `edit.tsx` builds as an **inline object literal** → a new identity every render → `reset()` fires on every render. With `defaultPreloadStaleTime: 0` (`router.tsx:9`) and React Query's default `refetchOnWindowFocus`, simply tabbing away and back **discards the vendor's unsaved edits**. | Memoise `defaultValues` (or key the effect on a stable primitive like `productId`). | CRIT | [RTC] |  |
| FE-04 | `checkout.tsx:203-206` | `navigate({ to: '/cart' })` called during render when the cart is empty. | `<Navigate>` or an effect. | MAJ | [V] |  |
| FE-05 | `routes/__root.tsx:65-71` + `router.tsx` | `QueryClient` is created in `useState` inside the root component with only `QueryClientProvider`. There is **no `HydrationBoundary` / `dehydrate`**, so server-fetched data is thrown away and every page re-fetches after hydration — double requests and a loading flash on every navigation. | Use `@tanstack/react-router-ssr-query` (already a dependency and unused) to wire dehydration. | MAJ | [V] |  |
| FE-06 | `routes/shop.$slug.tsx:84-94` | `accumulatedRef.current` is mutated **in the render body** and only reset when `productPage === 1`. Navigating from shop A on page 3 to shop B keeps A's products. Ref mutation during render also breaks under StrictMode. | Reset on shop slug change; accumulate in an effect. | MAJ | [V] |  |
| FE-07 | `services/product.ts:457, 481-490, 507-519, 536-548` | Mutations invalidate only `[QUERY_KEYS.PRODUCTS]`. Public keys are `[PUBLIC_PRODUCTS, 'single', slug]` (`:392`) and `[PUBLIC_PRODUCTS, 'list', params]` (`:252`). **A vendor edit leaves the public PDP and product list stale until a hard reload.** | Invalidate the public key families too. | MAJ | [V] |  |
| FE-08 | `deals.tsx:34-40` | `TARGET = new Date(); TARGET.setHours(+47)` is computed at **module scope** and passed to a `useState` initialiser → the server HTML and client render disagree → **hydration mismatch**. Semantically the "47 hours" restarts on every page load and is bound to no campaign. | Source the deadline from a real campaign record; pass an ISO string from the loader. | MAJ | [V] |  |
| FE-09 | `routes/products.tsx:89-91, 386-399` | `activeCategory` is seeded from search params into local state and **never re-synced**; `handleClearAll` navigates to `/products` without resetting it. Pagination renders `Array.from({ length: Math.min(totalPages, 5) })`, so page 6+ shows **no active page number**. | Derive from the URL; render a proper page window. | MAJ | [V] |  |
| FE-10 | `routes/shops/index.tsx:46-51` | Search is **undebounced** (a request per keystroke) and changing `search` while on page 3 leaves `page = 3`, returning an empty grid. | Debounce; reset the page on query change. | MAJ | [V] |  |

### 5.2 Product detail page

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| FE-11 | `product-variant-picker.tsx:78, 257-304` + `product.$slug.tsx:123, 344-364, 409` | **Two independent quantity states render simultaneously** — a stepper in the picker and one on the page. Add-to-cart reads the parent's value, so **the picker's control is a no-op.** | One source of truth; pass the value down. | CRIT | [V] |  |
| FE-12 | `product-variant-picker.tsx:122-134` | `setSelected(prev => { onVariantChange?.(variant); return … })` — the state updater is not pure and calls out during render/StrictMode. | Call `onVariantChange` in an effect. | MAJ | [V] |  |
| FE-13 | `product-gallery.tsx:40-47` | `activeImage` index is not reset when the image array changes. Switching to a variant with fewer images leaves it `undefined` → permanent placeholder. | Clamp or reset the index when `images` changes. | MAJ | [V] |  |
| FE-14 | `product-gallery.tsx:41, 181-260` | `setLightboxOpen(false)` exists; **`setLightboxOpen(true)` never does.** The lightbox is unreachable — a whole dead feature. | Wire the trigger. | MAJ | [V] |  |
| FE-15 | `components/pages/product/review.tsx`, `product-questions.tsx` | "Load More" bumps `page` and renders **only the current page**, so previously loaded items vanish. | Append. | MAJ | [V] |  |
| FE-16 | `components/pages/shop/product-card.tsx:62-71` | The wishlist heart only calls `preventDefault`/`stopPropagation` — **no behaviour**. Same for `review-card.tsx:109-115` (Helpful). | Wire both (see CUST-21). | MAJ | [V] |  |
| FE-17 | `components/pages/shop/product-card.tsx` | `Link` **wraps** the heart and Add-to-Cart buttons → nested interactive elements, invalid HTML, broken keyboard semantics. | Restructure so only the title/image is a link. | MAJ | [V] |  |
| FE-18 | `components/pages/home/hero.tsx:23` | A new Embla `Autoplay` plugin is constructed **every render**, re-initialising and resetting the autoplay timer. | `useMemo`/stable instance. | MAJ | [V] |  |
| FE-19 | `product-vendor-card.tsx` | Clickable `motion.div` with no `role`, `tabIndex` or key handler → not keyboard reachable. | Use a button/link. | MAJ | [V] |  |
| FE-20 | `product.$slug.tsx:241-250, 519-521, 557, 563` | The per-product `trustItems` array is **hardcoded** (free-shipping threshold, return window, processing times) and **contradicts the policy pages three different ways** — see CONTENT-08. | Derive from `SiteSetting` / shop policy. | MAJ | [V] |  |
| FE-21 | `color-swatch.tsx:13-19` | `isLightColor` returns `NaN` for a non-hex value (e.g. `color="Red"`), silently taking the dark branch. No `aria-pressed`. | Guard the parse; add `aria-pressed`. | MIN | [V] |  |

### 5.3 Query / state handling

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| FE-22 | 20 files (see Appendix A) | **Systemic:** no `isError` / `isFailure` handling in `products.tsx`, `compare.tsx`, `deals.tsx`, `shops/index.tsx`, `dashboard/index.tsx`, `dashboard/wishlist.tsx`, `dashboard/orders/{index,returns/index}.tsx`, `dashboard/vendor/{orders,products,payouts}/index.tsx`, `dashboard/admin/{orders,vendors,banner/list,customers,global-attributes}/index.tsx`, `home/category-carousel.tsx`, `product-questions.tsx`, `product-related.tsx`, `product-card.tsx`. **A failed query renders as an empty state**, indistinguishable from "no data". | Add error branches everywhere; `products/category.$slug.tsx:53` already does it correctly — copy that. | MAJ | [V] |  |
| FE-23 | `services/product.ts:482, 509, 538` + `product-form-provider.tsx:138-164` | The service comments *"Toast handled by form-layer … to avoid duplicates"* and dedupes `onSuccess`, but every `onError` still fires `toast.error` while the provider wraps the same mutation in `toast.promise` with an `error:` formatter → **two toasts per failed save.** | Pick one layer to own toasts. | MAJ | [V] |  |
| FE-24 | `lib/api-client.ts:9` | The `auth:unauthorized` event is dispatched but **nothing listens for it**. A 401 never clears the session or redirects to sign-in; the user just sees a per-mutation toast. | Register a listener. | MAJ | [V] |  |
| FE-25 | `product-variant-picker.tsx:78, 257-304` | Variant availability is derived from parent stock, not variant stock. | Use variant-level stock in the picker. | MAJ | [V] |  |
| FE-26 | `compare.tsx:404-409, 411, 118` | Compare sends `variantId: undefined`; `api/cart/add.ts:57-59` rejects any `hasVariants` product without one, and `disabled={product.stock === 0}` plus the Stock row use **parent** stock. **Variant products can never be added from compare.** | Resolve a default variant, or disable with an explanation. | MAJ | [V] |  |
| FE-27 | `components/error-boundary.tsx:9-11, 22` | Renders the **raw error message** to users (leaking internals) and has no branch for TanStack's `{ isNotFound: true }`. "Try Again" does a full `window.location.reload()` instead of `refetch()`. Same reload pattern at `products/category.$slug.tsx:67`, `followed-shops.tsx:78`, `checkout.tsx:872`. | Generic message + not-found branch; `refetch()`. | MAJ | [V] |  |
| FE-28 | `product-form-provider.tsx:142-148` | **No navigation after a successful product create** — the form resets in place and the vendor has no route to the new product. | Navigate to the product or the list. | MAJ | [V] |  |
| FE-29 | `services/product.ts:523-549` | `useAdminUpdateProduct` is **byte-for-byte equivalent** to `useUpdateProduct`, and `isAdmin` is never passed by `product-page.tsx:19-39` — dead code. | Delete, or implement the admin difference. | MIN | [V] |  |

### 5.4 Forms

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| FE-30 | `components/forms/product/basic-information.tsx:34` + `product-page.tsx:73` | `<BasicInformationCard />` is rendered with **no props**, so `checkSlugUnique` receives `productId: undefined`; `actions/check-slug.ts:19` then omits `NOT: { id: productId }` and **the product's own slug reports as "already taken"** on the edit page. | Pass `productId` through. | MAJ | [V] |  |
| FE-31 | `components/forms/product/basic-information.tsx:79-84` | A `useEffect` re-slugifies `productName` **unconditionally**, clobbering a manually edited slug and silently rewriting a stored slug that differs from `slugify(name)`. | Only auto-slug until the user edits the field. | MAJ | [V] |  |
| FE-32 | `components/forms/product/product-dimension.tsx:47, 104, 116, 128` + `product-form-type.ts:209-219` | `weight` and `dimensions.*` use `valueAsNumber: true`; clearing an input yields `NaN`, not `undefined`, so `z.number()` rejects it — **an optional field cannot be blanked.** | Use a `setValueAs` that maps `''` → `undefined`. | MAJ | [V] |  |
| FE-33 | `product-form-type.ts:31-57` + `dashboard/vendor/products/edit.tsx:68-73` | `DimensionsSchema`'s `.refine()` surfaces at the `dimensions` object level, but the component reads only `errors.dimensions.{length,width,height}` → *"All dimension fields must be provided together"* never renders. And `edit.tsx` always passes `unit` while `?? undefined` for the lengths, so the refine counts `unit` — **any product with no dimensions fails validation on save.** | Map the object-level error; make `unit` optional in the refine. | MAJ | [V] |  |
| FE-34 | `components/forms/product/product-image.tsx:25, 105, 174` | `formErrors.images?.message` for a `z.array().min(1)` lands at `errors.images.root` → *"At least one product image is required"* never renders. `:105` also registers `images` on a hidden input, giving the field two competing sources of truth. The remove button is `opacity-0 group-hover:opacity-100` with **no `focus-visible` variant** → invisible on keyboard focus. | Read `errors.images.root?.message`; single source of truth; add `focus-visible:opacity-100`. | MAJ | [V] |  |
| FE-35 | `product-page.tsx:49-57` | The back `<Button>` and "Discard" `<Button>` are `type='button'` with **no `onClick` and no `asChild`** — neither does anything. | Wire or remove. | MAJ | [V] |  |
| FE-36 | `product-image.tsx:51`, `review-form.tsx:60-67` | `URL.createObjectURL` is never revoked on remove/unmount; `FileReader` is not aborted, so `onload` can fire after the dialog closes. | Revoke/abort in cleanup. | MIN | [V] |  |
| FE-37 | `product-image.tsx:31-56` | Early returns skip `event.target.value = ''`, so re-selecting the same rejected file fires no change event. | Reset in a `finally`. | MIN | [V] |  |
| FE-38 | `product-image.tsx:15` vs `api/product/edit.ts:232-243` | Client limit 500KB with `accept='image/*'`; server allows 2MB and only jpeg/png/webp. Mismatched constraints on the same field. | Share one constant. | MIN | [V] |  |
| FE-39 | `components/forms/banner-form.tsx:85, 96` | `useForm<FormData>` where `FormData` is a **local type aliasing the DOM name**; the resolver switches between create/edit schemas at runtime and is cast `never`, so mismatches are silent. | Name the type distinctly; type the resolver honestly. | MIN | [V] |  |
| FE-40 | `dashboard/orders/$orderId.tsx:471, 556`, `dashboard/vendor/shipping/index.tsx:95, 311`, `product-questions.tsx:32, 74`, `review-form.tsx:76, 246` | Five submit UIs have **no `<form>` element** — `<Button onClick={handleSubmit}>`, so Enter-key submission never works and browser autofill semantics are lost. | Wrap in `<form onSubmit={handleSubmit}>`. | MAJ | [V] |  |
| FE-41 | `components/forms/product/product-variant.tsx:161, 179-183, 215-220, 297, 314` | SKU collision detection uses a **stale `Set`** — the existing-SKU snapshot is never updated as variants are generated, and abbreviated attribute codes can collide. Duplicates hit the `ProductVariant.sku` unique constraint → 500 on save. | Add generated SKUs to the set as they are produced; dedupe on the server too. | MAJ | [V] |  |
| FE-42 | `api/product/create.ts:265+` / `edit.ts:300+` | The variant matrix shows attribute `priceModifier` in the UI, but **the persist layer never writes it.** Silent data loss. | Persist it. | MAJ | [V] |  |
| FE-43 | `components/forms/product/variant-list.tsx:38-52` | One image slot per variant, but the model is `VariantImage[]` — the API returns `variantImages` that the form cannot edit. | Multi-image support or drop the model. | MIN | [V] |  |
| FE-44 | `components/forms/product/product-condition.tsx:114` | SKU is read-only, so vendors cannot supply their own. `use-sku-check.ts` / `api/product/check-sku.ts:30-38` only check `Product.sku`, never variant SKUs. | Make editable; validate uniqueness across variants. | MIN | [V] |  |
| FE-45 | `components/forms/product/product-attribute.tsx` | Admin **global attributes are not integrated** — the vendor form uses free text only, despite the full `GlobalAttribute` + mapping API and admin UI. Catalog data cannot be aggregated or filtered consistently. | Wire the mapping UI (see ADASH-06). | MAJ | [V] |  |

---

## Phase 6 — Data correctness in analytics

Shop aggregates are never written, and the revenue figures are computed on inconsistent populations.

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| DATA-01 | `prisma/shop.prisma:39-42` | **`Shop.totalSales`, `totalOrders`, `totalReviews` are read in at least 8 places and written nowhere.** No code path anywhere increments them. Every shop permanently displays 0 sales / 0 reviews, and `vendor/analytics/overview.ts:133` returns `products: shop.totalSales` — a never-written field — under the label "Products Sold" (`vendor/sales/index.tsx:66, 149`). | Either maintain the counters transactionally, or drop the columns and compute on read. | MAJ | [V] |  |
| DATA-02 | `api/vendor/analytics/overview.ts:44-50` | Revenue aggregates `vendorAmount` with `fulfillmentStatus: { not: 'CANCELLED' }` and **no `paymentStatus` filter**, and does not exclude `REFUNDED`. Vendor "Total Revenue" is **permanently overstated and never decreases after a refund** — surfaced to the vendor as "Net vendor earnings" (`sales/index.tsx:144`). | Filter to `paymentStatus: 'PAID'` and subtract refunded items. | CRIT | [V] |  |
| DATA-03 | `api/vendor/analytics/overview.ts:51-55, 121` | `totalOrders` has no status filter while revenue excludes cancellations — the two headline numbers **disagree by construction.** | Use the same population for both. | MIN | [V] |  |
| DATA-04 | `api/vendor/analytics/overview.ts:6-12, 105, 109` | Monthly buckets use **server-local time**, not Asia/Dhaka. On a UTC host a 01:00 BST sale on the 2nd is booked to the previous month. Also inconsistent with the admin endpoint, which uses UTC (DATA-06) — **the two dashboards can never agree.** | Fix a single timezone helper (Asia/Dhaka) and use it everywhere. | MAJ | [V] |  |
| DATA-05 | `api/vendor/analytics/overview.ts:62-73` | Unbounded `findMany` over 12 months of order items with no `take` — a busy vendor loads the whole set into memory on every dashboard load. | Aggregate in the database. | MAJ | [V] |  |
| DATA-06 | `api/admin/dashboard/stats.ts:64-74` | Chart is **off by one day and mixes timezones**: `d.setDate(d.getDate() + i + 1)` for `i = 0..29` runs through **tomorrow**, `daysAgo` sets a *local* midnight boundary (`:8`) but keys are derived with `toISOString()` (**UTC**). For UTC+6 every bucket is shifted a day and the last bucket is a future date. | `d.setDate(d.getDate() + i)`; format keys in Asia/Dhaka. | MAJ | [V] |  |
| DATA-07 | `api/admin/dashboard/stats.ts:35-39` | `revenue` filters `paymentStatus: 'PAID'` but `orders` is `prisma.order.count()` with **no filter** — revenue and order count are shown side by side on **different populations.** Partially-refunded orders also contribute their full `total` (`Order.refundAmount` ignored). | Use one population; subtract `refundAmount`. | MAJ | [V] |  |
| DATA-08 | `api/admin/dashboard/stats.ts:45-53` | `groupBy: ['createdAt']` returns one row per distinct timestamp instead of a daily bucket (needs `date_trunc`). Revenue is also attributed to order-creation time rather than `paidAt` (`order.prisma:33`), so a delayed bKash payment lands on the wrong day. | `date_trunc('day', "paidAt")`. | MAJ | [V] |  |
| DATA-09 | `api/vendor/analytics/overview.ts:88-97` | `topProducts` groups by the **denormalised `productName` string** — renaming a product splits its history into separate rows. | Group by `productId`. | MIN | [V] |  |
| DATA-10 | `api/vendor/payouts/pending.ts:26-38`, `schedule.ts:26-43`, `api/admin/payouts/pending.ts:26-37` | Eligibility filters only `fulfillmentStatus: 'DELIVERED'` and **never the order's `paymentStatus`** — unpaid or partially-refunded items count as payable. | Require `paymentStatus: 'PAID'`; exclude refunded items. | MAJ | [V] |  |
| DATA-11 | `lib/bd-districts.ts:1-65` | **62 of 64 districts.** `Jhalakati` is misspelled `Jhalokati`; Chapai Nawabganj is missing. Affects shipping zones, addresses and checkout validation. | Use the official 64; add a test. | MAJ | [V] |  |
| DATA-12 | `src/services/*.ts` | `savedPrice: number \| null` (`services/cart.ts:35`) types a Prisma `Decimal`. `Response.json` serialises `Decimal` as a **string**, so `toLocaleString()` at `cart.tsx:116, 152, 175` degrades to an unformatted raw string. | Coerce on the server, or format defensively. | MAJ | [V] |  |
| DATA-13 | `dashboard/vendor/products/index.tsx:26-38` | Status badge keys on `ACTIVE`, but `ProductStatus` (`prisma/enums.prisma:82-88`) has `PUBLISHED` — published products render the **raw fallback label**. | Align the enum. | MIN | [V] |  |
| DATA-14 | `dashboard/vendor/orders/index.tsx:12-21` | The `CONFIRMED` tab is **permanently empty**: it is a valid `OrderStatus` (`enums.prisma:25`) but the API filters `OrderItem.fulfillmentStatus`, whose enum (`enums.prisma:34-41`) has no such value. | Map order status to the item statuses that satisfy it. | MAJ | [V] |  |
| DATA-15 | `dashboard/admin/vendors/index.tsx:107-110` | Admin `Returns` points at `?status=RETURNED`, which is **not a valid `OrderStatus`.** | Use a real status. | MIN | [V] |  |

---

## Phase 7 — Navigation & stub pages

**Decisions recorded:** delete the dead sidebar entries rather than build them; build the commerce stubs; remove `/careers` and `/size-guide` from the footer.

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| NAV-01 | `components/layout/dashboard/nav-main.tsx` | **48 of ~56 sidebar destinations do not exist.** The entire `CUSTOMER_SERVICE` branch (11 links, `:383-464`) is unreachable. Admin has 19 dead (`sales` `:224`, `inventory` `:225`, `financial` `:228`, `products` `:235`, `products/bulk` `:244`, `tickets` `:274`, `vendors/{approvals,verified,suspended,performance,commissions}` `:284-296`, `moderation{,/products,/reviews}` `:321-331`, `seo` `:314`, `staff/roles` `:346`, `settings/{payments,tax,emails}` `:358-362`). Vendor has 6 (`inventory` `:125`, `earnings` `:126`, `products/reviews` `:137`, `promotions{,/coupons,/discounts}` `:180-186`). User has 5 (`/shop` `:65` and `:70` — the real route is `/shops`; `/dashboard/payment-methods`, `/dashboard/vouchers`, `/dashboard/notifications`, `/support`). | **Delete the dead entries.** Note that `vendors/approvals|verified|suspended` are dead *even though* approve/reject work server-side. Full table in Appendix B. | MAJ | [V] |  |
| NAV-02 | `nav-main.tsx` | Four **real, implemented** pages are missing from the nav entirely: `/dashboard/wallet`, `/dashboard/reviews`, `/dashboard/followed-shops`, `/dashboard/admin/global-attributes`. Wallet is currently reachable only by typing the URL. | Add them. | MAJ | [V] |  |
| NAV-03 | `nav-main.tsx:572-576` | Sub-items use raw `<a href={subItem.url}>` → full page reloads, bypassing the router entirely. | Use `Link`. | MAJ | [V] |  |
| NAV-04 | `header/desktop-nav.tsx:14` | `{ label: 'Sale', href: '/sale' }` — **no `/sale` route exists** (the real page is `/deals`), and the mobile menu points `Sale` at `/deals`. Compiled only because of the `as never` casts at `:113-114`. | Point at `/deals`; remove the casts. | MAJ | [V] |  |
| NAV-05 | `header/mobile-menu.tsx:355-357` | "Sign Out" is a plain `<NavLink to='/' icon={LogOut}>` — **it does not sign out.** A mobile user tapping it is navigated home and stays authenticated. A real `SignOut` component exists in `header/user-menu.tsx`; it was not used here. | Use `SignOut`. | MAJ | [V] |  |
| NAV-06 | `layout/dashboard/team-switcher.tsx:17-36` | The `<DropdownMenu>` contains only a `DropdownMenuTrigger` — **no `DropdownMenuContent`**, so clicking does nothing. | Add content or remove the component. | MAJ | [V] |  |
| NAV-07 | `layout/dashboard/nav-user-dropdown.tsx:83-107` | Six `DropdownMenuItem`s with **no `onClick` and no `to`** — Edit Account, Payment Methods, Vouchers, Orders, Wishlist and Log out are all inert. | Wire them. | MAJ | [V] |  |
| NAV-08 | `header/mobile-menu.tsx:231-302` | Category slugs are **hardcoded** (`clothing`, `accessories`, `footwear`, `jewelry`, `watches`) instead of using `usePublicCategories` (used correctly by `products.tsx:103` and `category-carousel.tsx`). Ten fabricated "Collections"/"Categories" entries (Summer, Winter, Spring, Fall, Festival, Men, Women, Kids, Unisex, Plus Size) all point at `/products` with **no filter applied** — purely cosmetic. | Drive from the API, or remove the fabricated sections. | MAJ | [V] |  |
| NAV-09 | `layout/footer/index.tsx:39-63` | Three hardcoded nav arrays (17 entries) with 6 pointing at the stub routes below. | Point at real routes; drive from config. | MAJ | [V] |  |
| NAV-10 | `layout/footer/index.tsx:129-144` | The newsletter "Subscribe" is **dead UI**: the `Input` and `type='submit'` `Button` sit inside a plain `<div className='flex gap-2 …'>` with **no `<form>` and no `onSubmit`.** The `Subscriber` model is only written by `lib/auth.ts:107` on signup; there is no public subscribe endpoint. | Add the endpoint and wrap in a form. | MAJ | [V] |  |
| STUB-01 | `routes/tracking.tsx:8` | `return <div>Hello "/tracking"!</div>;` — while `README.md:3` claims *"track orders in real time."* Linked from the footer and `mobile-menu.tsx:308`. | **Build it** reusing `/api/orders/*`. Per-order tracking already works at `dashboard/orders/$orderId`. | CRIT | [V] |  |
| STUB-02 | `routes/bestsellers.tsx:8` | `Hello "/bestsellers"!` — linked from `footer:44`. | **Build it** from a real top-sellers query. | MAJ | [V] |  |
| STUB-03 | `routes/categories.tsx:8` | `Hello "/categories"!` — linked from `footer:41`. | **Build it** from `usePublicCategories`. | MAJ | [V] |  |
| STUB-04 | `routes/help.tsx:8` | `Hello "/help"!` — linked from `footer:58` and `mobile-menu.tsx:308`. | **Build it** as a FAQ-driven help centre. | MAJ | [V] |  |
| STUB-05 | `routes/careers.tsx:8` | `Hello "/careers"!` — linked from `footer:52`. | **Remove from the footer** until you want it, then build. | MIN | [V] |  |
| STUB-06 | `routes/size-guide.tsx:8` | `Hello "/size-guide"!` — linked from `footer:62`. | **Remove from the footer** until you want it, then build. | MIN | [V] |  |
| STUB-07 | `routes/new-arrivals.tsx:87-101` | A **hardcoded fake empty state** — *"Refreshing our stock / We're currently updating our catalog"*, citing a DESIGN.md section. No service import exists in the file, even though `sort: 'newest'` is available in `ProductSortOption`. Linked from `mobile-menu.tsx:207` and `footer:43`. | **Build it** from a real `sort: 'newest'` query. | MAJ | [V] |  |
| STUB-08 | `dashboard/vendor/shipping/labels.tsx:14`, `tracking.tsx:14` | Both 18-line stubs: *"will be available soon."* | Build, or remove from the nav. | MIN | [V] |  |
| STUB-09 | `routes/index.tsx:12-17` | The **homepage is only** `Header` + `HeroSection` + `CategoryCarousel` + `Footer` (541 bytes). No featured products, deals, new arrivals, trust badges, testimonials, vendor showcase or newsletter for a marketplace landing page. | Build out the homepage per `DESIGN.md` §6 component patterns. | MAJ | [V] |  |
| STUB-10 | `dashboard/index.tsx:93, 166` | `const pendingReturns = 0;` — a hardcoded zero rendered as a live dashboard stat, while `useMyReturns` is available and already used at `orders/returns/index.tsx:9, 43`. | Wire the real query. | MAJ | [V] |  |
| STUB-11 | `dashboard/become-vendor/route.tsx`, `dashboard/admin/staff/route.tsx`, `dashboard/vendor/` | Layout routes that are a bare `<Outlet />` with **no `index.tsx`** → blank pages at `/dashboard/become-vendor`, `/dashboard/admin/staff`, `/dashboard/vendor`. | Add index routes or redirect. | MAJ | [V] |  |

---

## Phase 8 — Content & unverifiable claims

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| CONTENT-01 | `layout/footer/index.tsx:247, 265, 285` | Social links point at **`facebook/instagram/twitter.com/mookkly`** — a different brand's handles, left over from a template. | Point at the real accounts, or remove. | MAJ | [V] |  |
| CONTENT-02 | `api/contact.ts:26-32` | Returns a **fabricated success** — `{ message: 'Contact message received successfully', data: {...} }` — while persisting and emailing **nothing**. There is no `ContactMessage` Prisma model. Every customer inquiry from `routes/contact.tsx:66` is silently discarded while the UI shows success. | Add a model + insert, or route to the support inbox. | CRIT | [V] |  |
| CONTENT-03 | `routes/contact.tsx:40-49` | Hardcoded placeholder business identity: `123 Business Rd, Dhaka`, `+880 1700-000000`, `support@oylkka.com`, `Mon-Fri: 9AM - 6PM`. Not sourced from `SiteSetting` even though that model exists and is admin-editable. | Read from `SiteSetting`. | MAJ | [V] |  |
| CONTENT-04 | `routes/about.tsx:28-33` | Hardcoded marketplace metrics: `10K+ Happy Customers`, `500+ Verified Vendors`, `50K+ Products`. | Query real counts. | MAJ | [V] |  |
| CONTENT-05 | `routes/about.tsx:46` | *"Support is available 24/7"* — directly contradicts `contact.tsx:48` `Mon-Fri: 9AM - 6PM`. | One source of truth. | MAJ | [V] |  |
| CONTENT-06 | `header/desktop-nav.tsx:136-140`, `header/mobile-menu.tsx:214-218` | Hardcoded `20%` / `20% OFF` badge on the Sale link, bound to no campaign. | Drive from an active campaign. | MAJ | [V] |  |
| CONTENT-07 | `routes/deals.tsx:125, 128` | `Flash Sale — Up to 60% off` and `Verify vendors only · Deals refresh every hour` — the list is a plain `hasDiscount: true` query (`:62`). No refresh mechanism exists and neither claim is backed. | Compute the real maximum discount; remove or implement the refresh claim. | MAJ | [V] |  |
| CONTENT-08 | `product.$slug.tsx:242, 249, 557, 563` vs `shipping.tsx:35` vs `returns.tsx:26` vs `footer:35` | **The return policy contradicts itself three ways** (30-day on the PDP, 7 days on the returns page, 7-day in the footer) and free shipping contradicts itself two ways (৳500 on the PDP, ৳2,000 on the shipping page). Delivery timelines also disagree (PDP 5-7 days vs shipping 3-5 metro / 7-10 rural / processed within 24h). | Drive all of it from `SiteSetting` / shop policy. | MAJ | [V] |  |
| CONTENT-09 | `layout/footer/index.tsx:34, 340-346` | `Verified Vendors / 100% vetted sellers` and a hardcoded trust strip (`Secure Checkout`, `7-Day Returns`, `Nationwide Delivery`). | Gate on real data. | MAJ | [V] |  |
| CONTENT-10 | `routes/blog.tsx:40-113` + `blog.$slug.tsx:7, 30` | `export const posts: BlogPost[] = [ … ]` — **6 complete fabricated articles** with hardcoded 2026 dates, and `blog.$slug.tsx` imports that array and serves bodies from it. No CMS, no API. | Move to the `ContentBlock` CMS (see CONTENT-12). | MAJ | [V] |  |
| CONTENT-11 | `routes/faq.tsx:31-133`, `shipping.tsx:23-68`, `returns.tsx:23-77`, `privacy.tsx:23-83`, `terms.tsx:23-91` | Large hardcoded content blocks: 19 FAQ pairs, shipping zones and rates that **contradict the real DB-driven `ShippingZone` models**, returns policy, privacy and terms. | Move to `ContentBlock` so they are editable without a deploy. | MAJ | [V] |  |
| CONTENT-12 | `api/content/get.ts` + `services/admin-content.ts:56` | **The CMS is write-only.** `ContentBlock` is admin-managed via `/api/admin/content/*`, and the public reader exists, but `useContentBlock` has **zero consumers** — so no public page renders CMS content. This is *why* everything in CONTENT-10/11 is hardcoded. | Wire `useContentBlock` into the content pages. | MAJ | [V] |  |
| CONTENT-13 | `dashboard/admin/settings/index.tsx:96-132` | **Settings are write-only.** An admin can set `min_order_amount`, `default_commission`, `max_shipping` — but **no product, checkout, cart or commission code ever reads `SiteSetting`.** Setting "Min Order Amount" has no effect. | Read the settings where they belong, or remove the fields. | MAJ | [V] |  |
| CONTENT-14 | `api/orders/admin-fulfill.ts` / `create.ts` | `min_order_amount` and `max_shipping` are configurable but enforced nowhere. | Enforce or remove. | MAJ | [V] |  |
| CONTENT-15 | `components/checkout/payment-selector.tsx:36-50, 105` | Inline static payment config with `NAGAD` and `ROCKET` permanently `available: false, comingSoon: true`, rendered as `{option.available ? option.description : 'Coming soon'}`. Payment config is not admin-driven despite `SiteSetting`. | Move to settings or implement. | MIN | [V] |  |
| CONTENT-16 | `vendor/products/index.tsx:239, 242`, `vendor/shop/index.tsx:377, 618` vs `admin/coupons/index.tsx:246`, `admin/vendors/payouts.tsx:109, 165` | Currency is inconsistently rendered: **`$`** on two vendor pages, `BDT` on six others, `৳` everywhere else. `DESIGN.md` §3 says never mix. | One formatter everywhere. | MIN | [V] |  |
| CONTENT-17 | `auth/signin.tsx:115`, `auth/signup.tsx:157` | `handleSocialLogin(provider: 'google' \| 'facebook')` — Facebook is in the type but no button renders it, and `lib/auth.ts:30-36` configures only Google. | Remove the dead branch or add the provider. | MIN | [V] |  |
| CONTENT-18 | `products/category.$slug.tsx:16-21, 40` | The heading is built with `formatSlug(slug)` instead of the category name the API already returns — "t-shirts" instead of "T-Shirts". | Use the returned name. | MIN | [V] |  |
| CONTENT-19 | `__root.tsx:54` | Hardcoded absolute canonical `https://oylkka.com` — breaks on any non-prod deploy. | Derive from the request. | MIN | [V] |  |
| CONTENT-20 | `__root.tsx:33, 39, 48`, `blog.tsx:46`, `lib/email-templates.ts:477` | *"Shop thousands of products from verified vendors"* repeated in meta tags and **every transactional email footer** — unverifiable and false while CONTENT-04 stands. | Make dynamic or soften. | MIN | [V] |  |
| CONTENT-21 | `forms/shop-form.tsx:306, 289, 321`, `forms/banner-form.tsx:520, 571`, `orders/order-items-table.tsx:251, 262`, `forms/product/product-condition.tsx:112` | Non-BD placeholders in a BD-only marketplace: `+1 (555) 123-4567`, `shop@example.com`, `SKU-12345`, `e.g. STEAMER123456789`. Input hints only, not stored data. | Localise. | MIN | [V] |  |
| CONTENT-22 | `header/desktop-nav.tsx:7, 25, 34-35`, `nav-user-dropdown.tsx:33, 37` | Scaffold comments left in place: `// We'll map this to the 'to' prop`, `// 1. Swap usePathname for useLocation`, `// Optionally, render a placeholder or nothing if there is no user.` | Remove. | MIN | [V] |  |

---

## Phase 9 — Accessibility, images, type-safety escapes

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| A11Y-01 | `auth/signin.tsx:205`, `auth/signup.tsx:255, 295`, `reset-password.tsx:179, 216` | `tabIndex={-1}` on the **show/hide-password buttons** — removed from keyboard order. | Remove. | MAJ | [V] |  |
| A11Y-02 | `dashboard/orders/index.tsx:216`, `vendor/orders/index.tsx:176`, `admin/orders/index.tsx:238`, `dashboard/wishlist.tsx:60`, `product-vendor-card.tsx` | Clickable rows/cards with `onClick` on a `div` — no `role`, no `tabIndex`, no key handler (three sites even need `biome-ignore … noStaticElementInteractions`). | Use `Link`/button semantics. | MAJ | [V] |  |
| A11Y-03 | `share-product.tsx`, `review-form.tsx`, `product-gallery.tsx`, `product-variant-picker.tsx` | `<DialogContent>` without `<DialogDescription>` — Radix emits a dev warning and the dialog has no accessible description. `ui/dialog.tsx:49-84` does not default one. | Add descriptions per usage. | MAJ | [V] |  |
| A11Y-04 | `dashboard/wishlist.tsx:79-91` | Unlabeled icon-only trash button. | `aria-label`. | MIN | [V] |  |
| A11Y-05 | `compare.tsx:365, 423` | First table column uses bare `<th>`/`<td>` instead of `<th scope="row">`. | Add `scope`. | MIN | [V] |  |
| A11Y-06 | `product-image.tsx:174`, `basic-information.tsx:210, 259`, `product-dimension.tsx:55, 99, 111, 123` | Remove button is `opacity-0 group-hover:opacity-100` with no `focus-visible`; `<FieldLabel>` without `htmlFor`/`id` pairing. | Add focus-visible states and label associations. | MAJ | [V] |  |
| IMG-01 | ~35 raw `<img>` (see Appendix A) | No `width`/`height` (CLS) and no `loading="lazy"` — including `cart.tsx:90`, `checkout.tsx:403`, `compare.tsx:245, 386`, `product-card.tsx:38`, `shop-header.tsx:57`, `category-carousel.tsx:107`, `order-items-table.tsx:102`, `variant-list.tsx:487`, plus many dashboard images. | Add dimensions; lazy-load below the fold. | MIN | [V] |  |
| IMG-02 | `hero.tsx`, `product-gallery.tsx`, `review-card.tsx` | `@unpic/react` v1: the `layout` prop is a **source option, not a component prop** — it is forwarded to the DOM and provides no sizing. | Remove; use the component's real props. | MIN | [V] |  |
| IMG-03 | `home/hero.tsx:51` | Falls back to `/placeholder.svg` — this one is fine (the file exists). Recorded so it isn't re-audited. | — | — | [V] |  |
| TS-01 | ~20 sites (Appendix F.2) | `params={{} as never}` / `search={{} as never}` / `to={… as any}` disable TanStack Router's path type-checking. This is **why `NAV-04`'s `/sale` compiles**. | Use real params/search types. | MAJ | [V] |  |
| TS-02 | `components/ui/carousel.tsx:3` | `// biome-ignore assist/source/organizeImports: this is fine` has no effect — the only lint warning in the project. | Remove. | MIN | [V] |  |
| TS-03 | 454 files | `biome format` fails on CRLF/LF drift (content is fine). Add a `.gitattributes` with `* text=auto eol=lf` and run `biome check --write` once. | Normalise line endings. | MIN | [V] |  |
| TS-04 | `tsconfig.json` `include: ["**/*.ts", "**/*.tsx"]` | No `exclude`, so `src/generated/prisma/**` is typechecked. It is `.gitignore`d, so a fresh clone cannot typecheck until `prisma generate` runs. `build` does run `prisma generate` first — but a bare `tsc` does not. | Document, or add a `typecheck` script that generates first. | MIN | [V] |  |

---

## Phase 10 — Dead code & documentation drift

| ID | Location | Diagnosis | Fix direction | Sev | Conf | Status |
|---|---|---|---|---|---|---|
| DEAD-01 | 5 endpoints | Unreferenced API routes: `api/messages/contact-vendor.ts` (duplicate of `/api/conversations/create`, which is what `product.$slug.tsx:698` uses, and has its own `sendEmail` at `:76`); `api/product/answer-question.ts` (**vendors can never answer Q&A** — the ask/list side is wired via `product-questions.tsx:25-26`); `api/shop/pending-list.ts` (superseded by `my-shop`); `api/vendor/orders/cancel.ts` (fully implemented with reason validation, stock restore, email and an `ORDER_CANCELLED` audit at `:130`, but no UI); `api/vendor/shipping/public-list.ts` (needed for MONEY-30). | Wire or delete. `bkash-ipn.ts` is **not** dead — external webhook. | MAJ | [V] |  |
| DEAD-02 | 19 exports | Unused service hooks: `admin-audit-logs:16`, `admin-content:17,29,56`, `admin-global-attributes:228,242,284`, `admin-reports:17`, `admin-reviews:74`, `admin-settings:7,19`, `conversations:237,261`, `extra:50`, `returns:101,113,140,153`, `voucher:45,80`. Each maps to a missing page. | Wire or delete. Full table in Appendix C. | MAJ | [V] |  |
| DEAD-03 | `dashboard/admin/global-attributes/$id.tsx:282-303` | Explicit unimplemented UI: *"Product mapping UI will be added as a section in the product edit form."* The prop is even destructured as unused: `{ attributeId: _attributeId }`. | Build the mapping UI (see FE-45). | MAJ | [V] |  |
| DEAD-04 | `api/admin/reports/list.ts` | Lists `ProductReport` (which has `status`, `reviewedBy`, `reviewedAt`) but **no API exists to update a report's status** and no nav route reaches the list. Reported abuse can be read but never actioned — the table can only ever be empty. The `status` param (`:15, 22`) is passed unvalidated against a `String` column. | Add the moderation action and a page. | MAJ | [V] |  |
| DEAD-05 | `api/admin/returns/{list,review}.ts` + `api/vendor/returns/{list,review}.ts` | **Vendor and admin returns queues have no UI at all.** Customers can request a refund (CUST-01/02) that **no vendor can ever action**, and admins have no queue — though `admin/returns/review.ts:140` already sends the customer email, so the mail path is built and the page is not. | Build both queues. | MAJ | [V] |  |
| DEAD-06 | `routes/compare.tsx` + `api/product/public-compare.ts` | Compare is **fully built and completely unreachable** — no inbound link anywhere, and no "Add to compare" control on the PDP or in `product-card.tsx`. | Add the entry points. | MAJ | [V] |  |
| DEAD-07 | `api/vouchers/{collect,product-vouchers,auto-apply}.ts` | `useCollectVoucher` and `useProductVouchers` have zero callers; `product.$slug.tsx` never references a voucher. A customer can be issued vouchers they can never claim or see. | Wire the claim UI, or remove. | MAJ | [V] |  |
| DEAD-08 | `package.json:45-46` | `i18next` and `i18next-browser-languagedetector` are dependencies but **never imported** — no `i18n.ts` exists, `<html lang='en'>`. Meanwhile `README.md:78` advertises *"Bengali language support (partial)"*. For a BD-first marketplace this is arguably the most strategically damaging line in the README. | Either implement i18n or delete the deps and the claim. | MAJ | [V] |  |
| DEAD-09 | `package.json` devDependencies | `vitest` ^4.1.5 is installed but the project uses `bun test` (42 test files, `bunfig.toml` preload). Two test runners declared, one used. | Remove `vitest`, or migrate. | MIN | [V] |  |
| DEAD-10 | `package.json` `pnpm.onlyBuiltDependencies` | Vestigial pnpm config in a Bun-managed project. | Remove. | MIN | [V] |  |
| DEAD-11 | 4 pages | Pages bypass their own service layer with raw `apiClient`: `admin/content/index.tsx:51,65`, `admin/settings/index.tsx:35,44`, `admin/staff/audit-logs.tsx:43`, `dashboard/my-account.tsx:112` (`fetch('/api/upload/avatar')`). Duplicate data-access paths, untested. | Use the service hooks. | MIN | [V] |  |
| DOC-01 | `docs/DESIGN.md:3` | Still describes the codebase as *"Next.js / shadcn-ui"*. The project is TanStack Start. | Update. | MIN | [V] |  |
| DOC-02 | `docs/STRUCTURE.md:162, 315` | Documents `src/routes/reset-password.$token.tsx` — **does not exist**. The real file is `reset-password.tsx` (URL `/reset-password`) using `validateSearch` at `:24-28`. | Update. | MIN | [V] |  |
| DOC-03 | `docs/STRUCTURE.md:141, 58` | Documents `src/routes/router.tsx` and `src/cloudinary/` — **neither exists** (the router is `src/router.tsx`; Cloudinary helpers live in `src/lib/`). | Update. | MIN | [V] |  |
| DOC-04 | `docs/STRUCTURE.md:143-169` | Lists `bestsellers` / `careers` / `categories` / `help` / `size-guide` / `tracking` as real routes. **All six are `Hello "/x"!` stubs.** | Update after Phase 7. | MIN | [V] |  |
| DOC-05 | `docs/STRUCTURE.md:216` | Claims `admin/staff/ # Staff management`. There is only an empty layout plus audit logs — no member list, no role assignment, no invites. | Correct the claim or build it. | MAJ | [V] |  |
| DOC-06 | `docs/STRUCTURE.md:195-217`, `README.md:57-61` | Omit `admin/global-attributes/`, `admin/staff/audit-logs`, `vendor/sales`, `vendor/payouts/schedule`; the README tree shows `routes/vendor/` and `routes/dashboard/` (Admin) when the real paths are `routes/dashboard/vendor/` and `routes/dashboard/admin/`. | Update. | MIN | [V] |  |
| DOC-07 | `README.md:3, 73, 78` | Three false claims: *"track orders in real time"* (STUB-01), *"pay via bKash, COD, or wallet"* (MONEY-16), *"Bengali language support (partial)"* (DEAD-08). | Correct. | MIN | [V] |  |
| DOC-08 | `.env.example` | Omits `TAX_RATE`, which `api/checkout/create.ts:354` reads (MONEY-29b). | Add. | MIN | [V] |  |
| DOC-09 | `components.json` | `tailwind.config: "tailwind.config.js"` — that file does not exist (Tailwind v4 is CSS-first). | Fix so `shadcn add` works. | MIN | [V] |  |

---

## Appendix A — Route classification

**Stub (9):** `bestsellers.tsx` · `careers.tsx` · `categories.tsx` · `help.tsx` · `size-guide.tsx` · `tracking.tsx` · `new-arrivals.tsx` · `dashboard/vendor/shipping/labels.tsx` · `dashboard/vendor/shipping/tracking.tsx`

**Partial (12):** `/` (index.tsx — hero + carousel only) · `/blog`, `/blog/$slug` (hardcoded `posts`) · `/dashboard` (`pendingReturns = 0`) · `/dashboard/my-account` (name + avatar only) · `/dashboard/wallet` (no top-up, no history) · `/dashboard/admin/settings` (write-only) · `/dashboard/admin/content` (write-only) · `/dashboard/admin/global-attributes/$id` (mapping is a placeholder) · `/dashboard/become-vendor` (no index → blank) · `/dashboard/admin/staff` (no index → blank) · `/products/category/$slug` (`formatSlug` not the real name) · `/dashboard/become-vendor/apply` (`navigate()` during render)

**Fully implemented (81):** all other page routes — `__root` · `about` · `auth/{error,forgot-password,signin,signup,verify}` · `cart` · `checkout` · `checkout/confirmation` · `compare` (complete but unreachable — DEAD-06) · `contact` · `deals` · `faq` · `privacy` · `product/$slug` · `products` · `reset-password` · `returns` · `shipping` · `shop/$slug` · `shop/recently-viewed` · `shops/index` · `terms` · `dashboard/{route,addresses,followed-shops,messages/*,orders/*,reviews/*,wishlist}` · `dashboard/become-vendor/{route,apply,pending}` · `dashboard/vendor/{route,orders/*,products/*,sales,payouts/*,shipping/*,shop/*}` · `dashboard/admin/{index,orders/*,vendors/*,customers/*,coupons/*,reviews,banner/*,category/*,global-attributes/*,messages/*,settings/index,staff/audit-logs}`

**Files rendering query failures as empty states (FE-22):**
`routes/products.tsx` · `routes/compare.tsx` · `routes/deals.tsx` · `routes/shops/index.tsx` · `routes/dashboard/index.tsx` · `routes/dashboard/wishlist.tsx` · `routes/dashboard/orders/index.tsx` · `routes/dashboard/orders/returns/index.tsx` · `routes/dashboard/vendor/orders/index.tsx` · `routes/dashboard/vendor/products/index.tsx` · `routes/dashboard/vendor/payouts/index.tsx` · `routes/dashboard/admin/orders/index.tsx` · `routes/dashboard/admin/vendors/index.tsx` · `routes/dashboard/admin/banner/list.tsx` · `routes/dashboard/admin/customers/index.tsx` · `routes/dashboard/admin/global-attributes/index.tsx` · `components/pages/home/category-carousel.tsx` · `components/pages/product/product-questions.tsx` · `components/pages/product/product-related.tsx` · `components/pages/shop/product-card.tsx`

**Images missing `width`/`height` and `loading="lazy"` (IMG-01):**
`routes/cart.tsx:90` · `routes/checkout.tsx:403` · `routes/compare.tsx:245, 386` · `routes/dashboard/wishlist.tsx:69` · `routes/dashboard/followed-shops.tsx:104` · `routes/dashboard/my-account.tsx:73` · `routes/shop.recently-viewed.tsx:192` · `components/pages/shop/product-card.tsx:38` · `components/pages/shop/shop-header.tsx:57` · `components/pages/home/category-carousel.tsx:107` · `components/orders/order-items-table.tsx:102` · `components/forms/product/variant-list.tsx:487` · plus most images under `dashboard/vendor/**` and `dashboard/admin/**`

---

## Appendix B — Dead navigation paths (NAV-01)

All in `src/components/layout/dashboard/nav-main.tsx` unless noted.

| Line(s) | Path | Section |
|---|---|---|
| 65, 70 | `/shop` *(real route is `/shops`)* | User |
| 82 | `/dashboard/sell` | User |
| 103 | `/dashboard/payment-methods` | User |
| 104 | `/dashboard/vouchers` | User |
| 105 | `/dashboard/notifications` | User |
| 107 | `/support` | User |
| 125 | `/dashboard/vendor/inventory` | Vendor |
| 126 | `/dashboard/vendor/earnings` | Vendor |
| 137 | `/dashboard/vendor/products/reviews` | Vendor |
| 180 | `/dashboard/vendor/promotions` | Vendor |
| 184 | `/dashboard/vendor/promotions/coupons` | Vendor |
| 185 | `/dashboard/vendor/promotions/discounts` | Vendor |
| 224 | `/dashboard/admin/sales` | Admin |
| 225 | `/dashboard/admin/inventory` | Admin |
| 228 | `/dashboard/admin/financial` | Admin |
| 235 | `/dashboard/admin/products` | Admin |
| 244 | `/dashboard/admin/products/bulk` | Admin |
| 274 | `/dashboard/admin/tickets` | Admin |
| 284 | `/dashboard/admin/vendors/approvals` | Admin |
| 285 | `/dashboard/admin/vendors/suspended` | Admin |
| 286 | `/dashboard/admin/vendors/verified` | Admin |
| 287 | `/dashboard/admin/vendors/performance` | Admin |
| 295 | `/dashboard/admin/vendors/commissions` | Admin |
| 314 | `/dashboard/admin/seo` | Admin |
| 321 | `/dashboard/admin/moderation` | Admin |
| 327 | `/dashboard/admin/moderation/products` | Admin |
| 331 | `/dashboard/admin/moderation/reviews` | Admin |
| 346 | `/dashboard/admin/staff/roles` | Admin |
| 359 | `/dashboard/admin/settings/payments` | Admin |
| 361 | `/dashboard/admin/settings/tax` | Admin |
| 362 | `/dashboard/admin/settings/emails` | Admin |
| 383, 389, 394, 400, 404, 408, 412, 418, 425, 429, 433, 439, 451, 457, 459, 462, 464 | `/dashboard/customer-service` + 16 sub-paths *(metrics, tickets, tickets/create, orders, orders/returns, orders/refunds, orders/modify, customers, kb, kb/products, kb/policies, kb/issues, kb/faq)* | Customer service — **entire section dead** |
| `header/desktop-nav.tsx:14` | `/sale` *(real page is `/deals`)* | Public header |

**Also:** `admin/orders/index.tsx:94-96`, `admin/vendors/index.tsx:107-110` and `orders/index.tsx:126-128` build query strings inside `to` (CUST-19) — the link resolves, but the filter does not.

---

## Appendix C — Dead code inventory

**Unreferenced API endpoints (5)** — see DEAD-01.

**Unused service exports (19):**

| Service | Line | Export |
|---|---|---|
| `admin-audit-logs.ts` | 16 | `useAdminAuditLogs` |
| `admin-content.ts` | 17, 29, 56 | `useAdminContentBlocks`, `useSaveContentBlockMutation`, `useContentBlock` |
| `admin-global-attributes.ts` | 228, 242, 284 | `useProductGlobalAttributeMappings`, `useMapProductAttributeMutation`, `useUnmapProductAttributeMutation` |
| `admin-reports.ts` | 17 | `useAdminReports` |
| `admin-reviews.ts` | 74 | `useAdminReview` |
| `admin-settings.ts` | 7, 19 | `useAdminSettings`, `useUpdateSettingsMutation` |
| `conversations.ts` | 237, 261 | `useAdminCloseConversationMutation`, `useUploadMessageImageMutation` |
| `extra.ts` | 50 | `useReportProductMutation` |
| `returns.ts` | 101, 113, 140, 153 | `useVendorReturns`, `useReviewReturnMutation`, `useAdminReturns`, `useAdminReviewReturnMutation` |
| `voucher.ts` | 45, 80 | `useCollectVoucher`, `useProductVouchers` |

**Endpoints the UI calls that do not exist (2):**
`POST /api/product/create-review` (MONEY-15) · `POST /api/wallet/top-up` (MONEY-16)

**Endpoints the backend needs but that do not exist (3):**
review helpful-vote create (CUST-21) · product-report status update (DEAD-04) · wallet transaction history (CUST-13)

**Dead dependencies:** `i18next`, `i18next-browser-languagedetector` (DEAD-08) · `vitest` (DEAD-09) · `pnpm.onlyBuiltDependencies` (DEAD-10)

---

## Appendix D — Prisma models/columns never written

| Model : field | Read at | Impact |
|---|---|---|
| `Shop.totalSales` | `shop/public-single.ts:37-39`, `public-list.ts:34-36`, `product/public-single.ts:88-90`, `shop-card.tsx:92`, `shop-header.tsx:36`, `vendor/analytics/overview.ts:133` | Every shop shows 0 sales forever (DATA-01) |
| `Shop.totalOrders` | same | 0 forever |
| `Shop.totalReviews` | same | 0 forever |
| `Shop.rating` | same | 0 forever (has a non-null `Float @default(0)`, so `.toFixed(1)` is safe) |
| `Shop.bankName` / `bankAccountName` / `bankAccountNumber` | nowhere | Payout destinations never collected (LIFE-12b) |
| `Shop.commissionRate` | `pending.ts:19,47`, checkout `create.ts:106` | No writer — ownership undefined (LIFE-13) |
| `Shop.shippingCost` | `create.ts:107` | No writer; defaults to `0` → free shipping (MONEY-31) |
| `Shop.policies` | — | Write-only (LIFE-17) |
| `SiteSetting.*` | **nothing outside the admin list/update endpoints** | Entire settings system is inert (CONTENT-13) |
| `ContentBlock` | nothing public | CMS is write-only (CONTENT-12) |
| `Cart.expiresAt` | `lib/cart-cleanup.ts` | Never written — cleanup is dead code (MONEY-43) |
| `Payout.reference` | — | Never populated (MONEY-61) |
| `PayoutItem` reversal field | — | Does not exist — no clawback possible (MONEY-10) |

---

## Appendix E — Audit-log coverage

**Declared actions** (`lib/audit-log.ts`): `SHOP_APPROVED`, `SHOP_REJECTED`, `SUSPENDED` *(never emitted — LIFE-09)*, `USER_ROLE_CHANGED` *(never emitted — LIFE-19)*, `PAYOUT_PROCESSED` *(never emitted — MONEY-61)*, `ORDER_CANCELLED`.

**Actions with no audit entry at all:** refund issuance (`admin-refund.ts:212` is fire-and-forget with `.catch()`, so the entry is silently lost when AUTH-03 fires), settings changes (`admin/settings/update.ts`), content block changes, coupon create/update/delete, review moderation (`admin/reviews/$id.ts`), vendor return decisions (AUTH-11), admin close-conversation (`useAdminCloseConversationMutation`, unused), and **all better-auth `admin` plugin actions including impersonation** (AUTH-02).

**Design flaw:** `@@unique([actorId, action, entity, entityId])` + `.create` makes the audit table incapable of holding repeat history (AUTH-03). Until that is fixed, `AuditLog` cannot be used as evidence of anything.

---

## Appendix F — Systemic type-safety holes

### F.1 Prisma `select` shapes are unchecked

`SelectSubset<T, U>` (`src/generated/prisma/internal/prismaNamespace.ts:163-165`) is a mapped type over `keyof T`, where `T` is the caller's literal:

```ts
export type SelectSubset<T, U> = {
  [key in keyof T]: key extends keyof U ? T[key] : never
} & …
```

An unknown key resolves to `never` rather than erroring, and `never` is assignable to `boolean`. So an invalid `select` compiles. `tsc` reported **0 errors** across the project while `api/product/public-reviews.ts:38` selects `user.image` against a `User` model that has `imageUrl`.

**Implication:** every renamed or typo'd column in any Prisma query across the codebase is a latent runtime 500 that no static check will catch. This is not a one-off — MONEY-14 should be treated as a symptom, and the codebase swept for other invalid selects.

### F.2 Router paths are unchecked at ~20 sites

`params={{} as never}`, `search={{} as never}` and `to={… as any}` appear in: `layout/dashboard/breadcrumb.tsx:49-50` · `layout/footer/index.tsx:71-72` · `header/desktop-nav.tsx:113-114` · `header/mobile-menu.tsx:59-60, 85` · `home/hero.tsx:105-106, 122-123` · `dashboard/index.tsx:255-256` · `dashboard/wishlist.tsx:64` · `dashboard/orders/index.tsx:132` · `dashboard/vendor/orders/index.tsx:100` · `dashboard/admin/orders/index.tsx:100` · `dashboard/vendor/products/index.tsx:91, 272` · `dashboard/admin/vendors/index.tsx:110, 293` · `dashboard/admin/vendors/detail.tsx:78`

**Implication:** dead links and wrong params fail silently — this is the direct cause of NAV-04 (`/sale`) compiling.

---

## Appendix G — Verification commands

```bash
# typecheck — currently 0 errors but NOT meaningful, see Appendix F.1
npx tsc --noEmit -p tsconfig.json

# lint — 1 warning
npx biome lint .

# format — 454 files fail on CRLF/LF only
npx biome check . --write

# tests — 42 files; requires bun on PATH
bun test --preload=./src/test/jsdom-setup.ts
bun run test:components

# generate the Prisma client (required before a bare tsc, since it is gitignored)
npx prisma generate

# dev
bun run dev
```

---

## Appendix H — Verified-correct controls

Recorded so they are not re-audited or "fixed" by mistake.

- **`api/shop/approve.ts` / `reject.ts`** — correctly combine `requireAdmin` + CSRF + a `status === 'PENDING'` guard + a self-approval block. The pattern other admin routes should copy (AUTH-12).
- **Wallet debit at checkout** — `create.ts:478-491` uses a conditional `updateMany({ where: { balance: { gte: total } } })`, which is race-safe.
- **Voucher ownership** — `create.ts:319-341` filters by `userId` and `usedAt: null`, so cross-shop voucher abuse is blocked.
- **Commission/vendor split** — frozen at order time on `OrderItem`, so later commission changes do not rewrite history.
- **Shipping address** — snapshotted onto the order, so deleting an address cannot corrupt an order.
- **Cross-tenant product isolation** — correctly denied at `product/edit.ts:115`, `delete.ts:46`, `get-single.ts:43`, `answer-question.ts:52`, `vendor/conversations/$conversationId.ts:49, 93`.
- **Product status filtering** — properly applied in all five public product endpoints (`public-list.ts:104`, `public-single.ts:20`, `public-by-category.ts:34`, `public-compare.ts:17`, `shop/public-products.ts:35`); `DRAFT`/`ARCHIVED`/`REJECTED` do not leak.
- **All 29 `/api/admin/*` endpoints** — enforce roles via `requireAdmin` / `requireAdminOrManager` / `requireStaff`.
- **Payout double-spend** — blocked at the DB level by `PayoutItem.orderItemId @unique` (`prisma/shop.prisma:92`).
- **Vendor return decisions** — `api/vendor/returns/review.ts:45-48, 61-66` correctly restricts transitions to `PENDING` and cannot reach `REFUNDED`; vendors cannot self-approve refunds. The admin equivalent's guard is the defective one (MONEY-62).
- **`bKash` IPN** — verifies payment status with the gateway before executing.
- **Rate limiting** — applied to auth, checkout, messages, returns, coupons, uploads and questions (though see AUTH-09 and MONEY-19).
- **No raw SQL** — no `$queryRawUnsafe` / `$executeRawUnsafe` anywhere in `src`. No SQL injection surface.
- **`biome` import ordering** — all `tsconfig` paths resolve; the `#/*` and `@/*` dual alias convention is consistent throughout.
- **Encoding** — all files are valid UTF-8 with correct `৳` (U+09F3) and `—` (U+2014). Apparent mojibake is a PowerShell `Get-Content` artifact, not a file problem.

---

## Suggested sequencing

Phase 0 is genuinely blocking — money leaves the platform, orders can be voided unauthenticated, and checkout charges the wrong amount. Phases 1–3 protect the data those bugs corrupt. Phase 2 matters commercially: three of its findings strand a vendor with no path forward, and the approval email 404s for everyone. Phases 4–5 are user-visible correctness. Phase 6 means the dashboards currently show numbers that are wrong in ways the vendor will notice. Phases 7–10 are hygiene and can proceed in parallel once 0–3 are closed.

Two items are worth pulling forward regardless of phase, because they are cheap and they change what every later phase can catch:

1. **MONEY-14** — one-word fix (`image` → `imageUrl`), and it should be followed by a sweep for other invalid Prisma selects, since Appendix F.1 means there is no safety net.
2. **AUTH-03** — drop the `AuditLog` unique constraint. Until then the audit trail records nothing useful, so any fix you make in Phases 0–2 will be unverifiable afterwards.
