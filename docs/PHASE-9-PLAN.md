# Phase 9 — Accessibility, images, type-safety escapes: implementation plan

**Scope:** `A11Y-01 … A11Y-06`, `IMG-01 … IMG-03`, `TS-01 … TS-04` from `docs/AUDIT.md` (13 findings).
**Goal:** every interactive control is reachable and labelled; every image reserves its
layout; router links are type-checked; the lint/format/typecheck gates tell the truth.

## Decisions (recommended — made unless flagged open)

| Decision | Choice |
|---|---|
| Clickable rows/cards (`A11Y-02`) | Replace `onClick` divs with a real navigation target. Use an absolutely-positioned `<Link>` overlay on the row container; nested action buttons get `relative z-10`. |
| Dialog descriptions (`A11Y-03`) | Add a `<DialogDescription>` to each `<DialogContent>` that lacks one; `sr-only` where the visible copy already says it. Do **not** default one in `ui/dialog.tsx` (that hides future omissions). |
| Raw images (`IMG-01`) | Mechanical sweep: add explicit `width`/`height` and `loading`/`decoding` to each raw `<img>`. No new wrapper component. Eager-load only above-the-fold images. |
| `@unpic` `layout` (`IMG-02`) | **Runtime-verify first** ([RTC]). Evidence (below) shows the props leak only for non-CDN URLs. Remove the `layout` prop and rely on explicit `width`/`height` + existing CSS. |
| Router casts (`TS-01`) | Replace `as never`/`as any` with real `to`/`params`/`search`. Type the nav config arrays against TanStack Router's link types. |
| `zodResolver(...) as never` | Fix as part of `TS-01` (same escape class) if the typed resolver removes the cast cleanly; otherwise leave documented. |
| Prisma `select` sweep (Appendix F.1) | **Batch F** (beyond the 13 findings) — DMMF + TS-AST checker script. **Included in Phase 9.** |

## Baseline measured on the current tree

| Check | State |
|---|---|
| `biome format .` | **Clean** (513 files, no fixes) — the audit's 454 CRLF failures are gone on a Linux checkout. |
| `biome lint .` | **1 warning** — `src/components/ui/carousel.tsx:3` (this is `TS-02`). |
| `.gitattributes` | **Missing.** |
| CRLF files (excl. `node_modules`) | **0.** `TS-03` is prevention-only now. |
| `tsc --noEmit` | 14 pre-existing errors (see Phase 8 verification). |
| `bun test` | 417 pass / 1 pre-existing failure. |
| `product-vendor-card.tsx` | **Already** uses a `Link` overlay with `aria-label` — `A11Y-02` partially done. |
| `product-image.tsx` remove button | **Already** has `focus-visible:opacity-100` — that half of `A11Y-06` is done. |
| `@unpic/react` | v1.0.2 (`@unpic/core` v1.0.3). |

---

## Batch A — Interactive semantics (`A11Y-01`, `A11Y-02`, `A11Y-04`)

### A11Y-01 — keyboard-removed auth controls
`tabIndex={-1}` removes the show/hide-password buttons (and, in sign-in, the
"Forgot password?" link) from the tab order.

| File | Lines |
|---|---|
| `src/routes/auth/signin.tsx` | 192 (forgot-password link), 214 (show/hide) |
| `src/routes/auth/signup.tsx` | 255, 295 (show/hide ×2) |
| `src/routes/reset-password.tsx` | 179, 216 (show/hide ×2) |

**Fix:** delete every `tabIndex={-1}` in these three files. The buttons already carry
`<span className='sr-only'>Show/Hide password</span>`, so only the tab order needs restoring.

### A11Y-02 — clickable `div`s with no role/key handler
Three order lists and the wishlist render the whole row/card as a clickable `div`
(each also carries a `biome-ignore … noStaticElementInteractions`).

| File | Current anchor | Target route |
|---|---|---|
| `src/routes/dashboard/orders/index.tsx` | `:216` | `/dashboard/orders/$orderId` |
| `src/routes/dashboard/vendor/orders/index.tsx` | `:176` | `/dashboard/vendor/orders/$orderId` |
| `src/routes/dashboard/admin/orders/index.tsx` | `:242` | `/dashboard/admin/orders/$orderId` |
| `src/routes/dashboard/wishlist.tsx` | `:123` (Card) | `/product/$slug` |

**Fix (per row/card):**
1. Keep the outer element as a `relative` container; drop `onClick`, `onKeyDown` and the
   `biome-ignore` comment.
2. Add `<Link to='…' params={{ … }} aria-label='…' className='absolute inset-0 rounded-… focus-visible:ring-2 focus-visible:ring-primary' />`
   as the last child (the pattern already used in `product-vendor-card.tsx`).
3. The nested action `Button`s (view/cancel/trash) get `relative z-10` so they stay above
   the overlay; the wishlist trash button already calls `e.stopPropagation()` (now a no-op,
   can stay).
4. `A11Y-04`: give the wishlist trash button an explicit `aria-label='Remove from wishlist'`
   (it is icon-only: `<Trash2/>`).

`product-vendor-card.tsx` already follows this pattern — verify only, no change.

### A11Y-04
Covered above (wishlist trash `aria-label`).

---

## Batch B — Dialogs & form labels (`A11Y-03`, `A11Y-05`, `A11Y-06`)

### A11Y-03 — `<DialogContent>` without `<DialogDescription>`
A repo-wide sweep found **7** files (the audit named 4):

| File |
|---|
| `src/components/pages/product/share-product.tsx` |
| `src/components/pages/product/review-form.tsx` |
| `src/components/pages/product/product-variant-picker.tsx` |
| `src/routes/dashboard/addresses.tsx` |
| `src/routes/dashboard/admin/content/index.tsx` |
| `src/routes/dashboard/orders/$orderId.tsx` |
| `src/routes/dashboard/vendor/shipping/index.tsx` |

**Fix:** add `<DialogDescription>` inside each `<DialogHeader>`. Where the body already
states the purpose, use `<DialogDescription className='sr-only'>…</DialogDescription>` to
avoid visual duplication. (`ui/dialog.tsx` stays unchanged.)

### A11Y-05 — compare table row header
`src/routes/compare.tsx:463` — the first cell of each spec row is a `<td>`; it is the row's
label. **Fix:** change it to `<th scope='row' className='…'>`. (The empty top-left `<th>`
at `:379` can stay or become `scope='col'` for clarity.)

### A11Y-06 — label/control association
The remove-button half is already done; the remaining work is pairing `<FieldLabel>` with
its control.

| File | Sites | Fix |
|---|---|---|
| `src/components/forms/product/basic-information.tsx` | `:222` Category, `:272` Tags | Add `htmlFor='product-category'` + `id` on the `SelectTrigger`; give `TagsInput` an `id` (or `aria-label`) and point the label at it. The `:272` text is a prompt duplicating the `FieldDescription` below — either associate it or drop it in favour of the description. |
| `src/components/forms/product/product-dimension.tsx` | `:66` weight unit, `:90` dimension unit (unlabelled `SelectTrigger`), `:110` Length, `:128` Width, `:145` Height | Add `id` to each control and `htmlFor` on the label; give the unlabelled dimension-unit `SelectTrigger` an `aria-label='Dimension unit'`. |

---

## Batch C — Images (`IMG-01`, `IMG-02`, `IMG-03`)

### IMG-01 — raw `<img>` without dimensions/lazy loading
**48 tags across 36 files.** Full inventory with counts:

| Count | Files |
|---|---|
| 3 | `dashboard/vendor/shop/messages/$id.tsx`, `dashboard/vendor/shop/index.tsx`, `dashboard/messages/$id.tsx` |
| 2 | `dashboard/vendor/shop/branding.tsx`, `dashboard/orders/returns/$returnId.tsx`, `dashboard/admin/messages/index.tsx`, `dashboard/admin/messages/$id.tsx`, `compare.tsx`, `forms/shop-form.tsx` |
| 1 | `recently-viewed.tsx`, `dashboard/wishlist.tsx`, `dashboard/vendor/shop/messages/index.tsx`, `dashboard/vendor/products/index.tsx`, `dashboard/vendor/orders/index.tsx`, `dashboard/vendor/orders/$orderId.tsx`, `dashboard/reviews/index.tsx`, `dashboard/orders/$orderId.tsx`, `dashboard/my-account.tsx`, `dashboard/messages/index.tsx`, `dashboard/followed-shops.tsx`, `dashboard/admin/reviews/index.tsx`, `dashboard/admin/customers/index.tsx`, `dashboard/admin/customers/$id.tsx`, `dashboard/admin/category/all.tsx`, `dashboard/admin/banner/list.tsx`, `checkout.tsx`, `categories.tsx`, `cart.tsx`, `components/pages/shop/shop-header.tsx`, `components/pages/shop/product-card.tsx`, `components/pages/home/category-carousel.tsx`, `components/orders/order-items-table.tsx`, `components/forms/product/variant-list.tsx`, `components/forms/product/product-image.tsx`, `components/forms/category-form.tsx`, `components/forms/banner-form.tsx` |

**Policy:**
- All dashboard/table/list thumbnails and form previews: add `loading='lazy' decoding='async'`
  plus `width`/`height` matching the CSS box (e.g. `w-14 h-14` → `56`, `w-16` → `64`,
  `aspect-square` → the rendered edge).
- Above-the-fold / LCP images: `components/pages/shop/product-card.tsx`,
  `components/pages/shop/shop-header.tsx`, `components/pages/home/category-carousel.tsx`,
  `routes/product.$slug` gallery (already `@unpic`): `loading='eager'` (or omit lazy) and
  `decoding='async'`. `cart.tsx`/`checkout.tsx` line-item thumbnails stay lazy.
- Keep existing `object-cover w-full h-full` classes; attributes only add intrinsic size.

### IMG-02 — `@unpic/react` `layout` prop
**Evidence gathered:**
- `layout` **is** a first-class prop in the installed types
  (`@unpic/core/dist/base.d.ts:123-128`, `FixedLayout | ConstrainedLayout | FullWidthLayout`)
  and is consumed by `transformSharedProps` (it drives `style`/`srcset`).
- However `@unpic/react` calls the **auto** transformer
  (`@unpic/core/dist/auto.mjs:19`), which returns props unchanged when the URL host is not a
  recognised CDN. In that path `layout` (and `operations`, `options`) **leak to the DOM** and
  do no sizing — matching the audit.
- Oylkka images are Cloudinary (a recognised CDN), so the leak may not currently trigger.
- 10 usages: `home/hero.tsx:53` (`fullWidth`), `product/product-gallery.tsx:102,155,222`,
  `product/product-vendor-card.tsx:54`, `product/review-card.tsx:31,93`,
  `product/review-form.tsx:234`, `shop/shop-card.tsx:36`, `shop/shop-header.tsx:78`.

**Fix:** [RTC] render with a non-CDN URL and confirm the `layout` attribute reaches the DOM.
Then remove the `layout` props and rely on explicit `width`/`height` plus the existing CSS
(which already sizes every one of these containers). This is the audit's "use the component's
real props" direction and removes the CDN-detection dependency. Re-verify responsive `srcset`
is still sane after removal. If the runtime check shows no leak, record `IMG-02` as
verified-closed with evidence instead of churning.

### IMG-03
`home/hero.tsx:51` falls back to `/placeholder.svg`, which exists. **No action** — recorded so
it is not re-audited.

---

## Batch D — Type-safety escapes (`TS-01`, `TS-02`)

### TS-01 — router path casts
Every `as never` / `as any` on a router target defeats TanStack Router's path checking.

**A. `Link` with empty params/search** — delete the cast; omit the prop entirely when the
route takes none:

| File | Lines |
|---|---|
| `layout/dashboard/breadcrumb.tsx` | 49–50 |
| `layout/footer/index.tsx` | 81–82 |
| `layout/header/mobile-menu.tsx` | 57–58, 83 |
| `pages/home/hero.tsx` | 108–109, 125–126 |
| `dashboard/index.tsx` | 288–289 |

**B. `navigate(\`/…/${id}\`)` template strings** — convert to typed routes:

| File | Line | Target |
|---|---|---|
| `dashboard/orders/index.tsx` | 125 | `navigate({ to: '/dashboard/orders/$orderId', params: { orderId } })` |
| `dashboard/vendor/orders/index.tsx` | 93 | `… '/dashboard/vendor/orders/$orderId'` |
| `dashboard/admin/orders/index.tsx` | 96 | `… '/dashboard/admin/orders/$orderId'` |
| `dashboard/wishlist.tsx` | 126 | `navigate({ to: '/product/$slug', params: { slug } })` |
| `dashboard/vendor/products/index.tsx` | 96 | warn/verify target route |
| `dashboard/admin/vendors/detail.tsx` | 102 | target route |

**C. Data-driven nav** — `layout/dashboard/nav-main.tsx:424-425` casts a config array's
`to`/`search`. Type the config so each entry's `to` is `LinkProps['to']` and `params`/`search`
are optional and typed; the `as never` disappears. Check whether the audit's
`desktop-nav.tsx:113-114` sites still exist (current grep shows none — likely already fixed).

**D. Non-router escapes found in the same sweep** (optional, same class):
`forms/category-form.tsx:102` and `forms/shop-form.tsx:96` — `zodResolver(schema) as never`.
Fix by typing `useForm<z.infer<typeof schema>>`; if the resolver overload still forces a cast,
leave it with a comment. (The API-layer `metadata as any` and `status as never` casts are
Prisma-Json/union friction and out of this batch's scope.)

**Acceptance:** `grep -rn "as never\|as any}}" src --include=*.tsx` returns no router sites.

### TS-02 — dead suppression
`src/components/ui/carousel.tsx:3` — `// biome-ignore assist/source/organizeImports: this is fine`
suppresses nothing. **Fix:** delete the line (and fix the import order if biome then
complains). This should drive `biome lint .` to **0 findings**.

---

## Batch E — Tooling (`TS-03`, `TS-04`)

### TS-03 — line endings
The working tree is already LF-only and `biome format` passes. **Fix:** add `.gitattributes`:

```
* text=auto eol=lf
```

Optionally run `git add --renormalize .` to normalise index entries. No content changes.

### TS-04 — generated Prisma client vs. bare `tsc`
`tsconfig.json` includes `**/*.ts` with no `exclude`, and `src/generated/prisma` is gitignored,
so a fresh clone cannot typecheck until `prisma generate` runs.

**Fix:**
- Add `"typecheck": "prisma generate && tsc --noEmit"` to `package.json` scripts.
- Add `"exclude": ["node_modules", "src/generated"]` to `tsconfig.json` so checks skip generated
  code (imports still resolve).
- Note the requirement in the README/dev docs.

---

## Batch F (included) — Prisma `select`/`include` sweep

Appendix F.1: unknown Prisma `select` keys resolve to `never` and compile, so renamed
columns are latent 500s (`MONEY-14` was the symptom).

**Fix:** add `scripts/audit-prisma-selects.ts` that:
1. reads `prismaSchemaFolder`/DMMF model field names,
2. walks `src/**` with the TypeScript compiler API for object literals passed to
   `select:`/`include:`,
3. reports keys absent from the target model.

Run it, fix any hits, and keep it as a `bun run audit:selects` script.

---

## Finding → batch map

| Finding | Batch |
|---|---|
| A11Y-01 | A |
| A11Y-02 | A |
| A11Y-03 | B |
| A11Y-04 | A |
| A11Y-05 | B |
| A11Y-06 | B |
| IMG-01 | C |
| IMG-02 | C |
| IMG-03 | (no-op) |
| TS-01 | D |
| TS-02 | D |
| TS-03 | E |
| TS-04 | E |
| *(F.1 sweep)* | F (included) |

## Order

`A → B → C → D → E → F`. A and B are the substance; C is mechanical; D and E should make
the gates honest before F measures anything.

## Verification

1. `bunx biome lint .` → **0** findings (was 1; `TS-02`).
2. `bunx biome format .` → clean; `git diff` shows only `.gitattributes` for `TS-03`.
3. `bunx tsc --noEmit` → still only the 14 pre-existing errors.
4. `bun test` → 417 pass / 1 pre-existing failure, plus new tests where cheap:
   - a render test asserting the wishlist trash button exposes an accessible name and the
     order row exposes a link role;
   - a test asserting no `<DialogContent>` renders without an accessible description
     (render each of the 7 dialogs and query `getByRole('dialog')` + description).
5. `grep` acceptance: no router `as never`/`as any` remain.
6. Manual keyboard pass: Tab through `/auth/signin`, `/auth/signup`, `/reset-password`;
   reached the show/hide toggles. Keyboard-navigate a dashboard order row, the admin/vendor
   rows and a wishlist card (Enter opens). Open each `A11Y-03` dialog and confirm a
   screen-reader description is announced.
7. Image check: DevTools network shows below-the-fold images lazy; no CLS on list pages;
   `IMG-02` [RTC] confirms whether a `layout` attribute appears on non-CDN images.

## Decisions locked

1. **IMG-01** — mechanical `width`/`height` + `loading`/`decoding` attributes on each raw
   `<img>`; no new wrapper component.
2. **Batch F** — the Prisma `select`/`include` sweep is included in Phase 9.
3. **A11Y-03** — `sr-only` `DialogDescription` where the dialog body already states the
   purpose; visible copy only where it adds value.
