# Oylkka — Design System

A reference document for the visual language, layout conventions, and component patterns used across the Oylkka multi-vendor e-commerce TanStack Start / shadcn-ui codebase.

---

## 1. Design Philosophy

| Principle                     | Description                                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Commerce-first clarity**    | Product and price information takes visual priority over decoration; every pixel earns its place by aiding discovery or conversion            |
| **Trust through consistency** | Verified vendor badges, rating displays, and trust strips appear in exactly the same form everywhere — users rely on pattern recognition      |
| **Motion with purpose**       | Sections animate in via `useInView`; product cards respond to hover; nothing animates purely for aesthetics                                   |
| **Grid discipline**           | `max-w-7xl` container, consistent `px-4 sm:px-6 lg:px-8` gutters; product grids are always CSS grid, never flex-wrap                          |
| **Token-only color**          | All color consumed via shadcn CSS variables — never hard-coded hex; primary is green; commerce accents come from semantic roles defined below |

---

## 2. Color Tokens

All colors consumed via Tailwind / shadcn CSS variables. Your existing `globals.css` is the source of truth. Never hard-code values.

```
bg-background              — page background
bg-card                    — product cards, vendor cards, modals
text-foreground            — primary text
text-muted-foreground      — secondary text, meta info, labels
bg-primary / text-primary  — brand green (CTAs, verified badges, in-stock labels)
bg-primary/10              — tinted icon backgrounds, tag fills
bg-primary/15              — hover tint on cards
text-primary-foreground    — text on green backgrounds
border-border              — all dividers, card borders, table lines
border-primary/30          — hover border on cards
bg-secondary               — pill backgrounds, filter chips
bg-destructive             — sale/discount badges, out-of-stock
text-destructive           — sale price, error states
bg-muted                   — skeleton loaders, empty state fills
```

### Commerce-specific semantic layer

Layer these on top of shadcn tokens using Tailwind utility composition — do not introduce new CSS variables.

| Role                 | Token composition                                                      | Usage                    |
| -------------------- | ---------------------------------------------------------------------- | ------------------------ |
| **Sale badge**       | `bg-destructive/10 text-destructive`                                   | Discount percentage pill |
| **New badge**        | `bg-primary/10 text-primary`                                           | New arrival label        |
| **Hot badge**        | `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400` | Trending product         |
| **Verified vendor**  | `bg-primary/10 text-primary`                                           | Vendor trust mark        |
| **In stock**         | `text-primary`                                                         | Availability label       |
| **Low stock**        | `text-amber-600 dark:text-amber-400`                                   | Urgency label            |
| **Out of stock**     | `text-muted-foreground`                                                | Unavailability label     |
| **Rating star**      | `text-amber-400`                                                       | Star icons               |
| **Price main**       | `text-foreground font-bold`                                            | Current price            |
| **Price old**        | `text-muted-foreground line-through`                                   | Original price           |
| **Flash sale strip** | `bg-primary text-primary-foreground`                                   | Timed promotion banner   |

---

## 3. Typography

Font stack inherits from your `globals.css` (`--font-sans`).

### Scale

| Role                            | Classes                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| Hero H1                         | `text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight` |
| Section H2                      | `text-2xl md:text-3xl font-bold leading-tight tracking-tight`              |
| Section H2 italic contrast word | `italic font-bold text-primary`                                            |
| Card product title              | `text-sm font-semibold leading-snug`                                       |
| Card vendor name                | `text-xs font-medium text-primary`                                         |
| Price — current                 | `text-lg font-bold tabular-nums`                                           |
| Price — original                | `text-sm font-normal text-muted-foreground line-through tabular-nums`      |
| Body / description              | `text-sm leading-relaxed text-muted-foreground`                            |
| Eyebrow label                   | `text-xs font-semibold tracking-[0.18em] uppercase text-primary`           |
| Badge / tag                     | `text-[10px] font-semibold tracking-[0.12em] uppercase`                    |
| Rating count                    | `text-xs text-muted-foreground`                                            |
| Stat number                     | `text-3xl md:text-4xl font-bold tabular-nums text-primary`                 |

### Italic contrast pattern

Section headings use `italic font-bold text-primary` for one contrast word. Apply to H1 heroes and H2 section headings.

```jsx
<h2>
  Top <span className="italic font-bold text-primary">Vendors</span>
  <span className="text-primary">.</span>
</h2>
```

### Punctuation accent

Terminal period always in `text-primary` on section headings.

### Taka symbol

Use `৳` (Bengali Taka sign, U+09F3) or the string `"BDT"` — never mix. Wrap in a `<span className="font-normal">` inside a price to reduce its visual weight against the bold number.

---

## 4. Spacing & Layout

```
Container:        max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
Page section gap: py-16 md:py-24
Card gap:         gap-4 (product grids) / gap-5 (vendor/feature grids)
Card pad:         p-4 (product cards) / p-5 (vendor/feature cards)
```

### Product grid breakpoints

```
grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5   — dense (default)
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4   — comfortable
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3                  — featured / editorial
```

### Section anatomy

Every content section follows this structure:

1. **Eyebrow row** — `h-px w-8 bg-primary` rule + small-caps label + optional live badge
2. **Heading** — bold + italic contrast word + primary period
3. **Sub-action row** — secondary CTA aligned right (`flex justify-between items-end`)
4. **Content grid / carousel**
5. `border-b border-border` bottom separator (omit on last section)

---

## 5. Animation System

Core easing defined as a shared constant — all motion durations and delays are referenced from here.

```
EASE = [0.22, 1, 0.36, 1]
```

### Core variants

Defined in a shared file (e.g. `lib/animations.ts`). Three reusable Framer Motion variant objects:

| Variant        | Purpose                       | Key behavior                                                        |
| -------------- | ----------------------------- | ------------------------------------------------------------------- |
| `fadeUp`       | Text blocks, individual items | `opacity: 0→1`, `y: 20→0`, `duration: 0.45`, accepts `custom` delay |
| `gridVariants` | Product / vendor grids        | `staggerChildren: 0.06` on parent                                   |
| `cardVariants` | Individual grid cards         | Entry from `y: 16`, `duration: 0.38`                                |

### Scroll trigger pattern

```tsx
const ref = useRef<HTMLDivElement>(null);
const inView = useInView(ref, { once: true, margin: "-80px" });
// Attach ref to section header wrapper, pass inView to animate parent
```

### Stagger delay convention

```
Eyebrow row   → custom={0}
Heading       → custom={0.08}
Sub-action    → custom={0.12}
First para    → custom={0.14}
CTA button    → custom={0.2}
```

### Card hover interactions

- **Product card** — subtle lift (`whileHover={{ y: -3, scale: 1.01 }}`, spring `320/24`)
- **Image zoom** — inner image wrapper `scale-105` on group hover (`duration: 0.5`)
- **Animated rule** — `w-4 → w-6` on group hover (`duration: 300`)

### Countdown timer

Flash sale and limited-offer banners render a live `HH:MM:SS` countdown using a `useInterval` hook updating every second. Timer blocks use `tabular-nums` to prevent layout shift.

---

## 6. Component Patterns

### 6.1 Eyebrow row

```
[ h-px w-8 bg-primary ]   SMALL-CAPS LABEL   [optional Live badge]
```

Container: `flex items-center gap-3`. Rule is `h-px w-8 bg-primary`. Label is `text-xs font-semibold tracking-[0.18em] uppercase text-primary`.

### 6.2 Section header row

```
[Eyebrow]                       [View all →]
        Heading with Italic Contrast.
        Subtitle / description
```

Container: `flex justify-between items-end`. Left side stacks eyebrow + heading + optional description. Right side is a ghost `Button` with trailing `ArrowRight`.

### 6.3 Product card

Two variants: **grid** (default) and **horizontal** (list view). Key conventions:

- Container: `group rounded-2xl border border-border bg-card overflow-hidden` with `hover:border-primary/30 hover:shadow-lg hover:shadow-black/5`
- Image: `relative aspect-square bg-muted overflow-hidden`, inner `Image` gets `group-hover:scale-105 transition-transform duration-500`
- Badges: `absolute top-2 left-2` as a flex-col stack (`bg-destructive/90` for sale, `bg-primary/90` for new)
- Wishlist button: `absolute top-2 right-2`, `opacity-0 group-hover:opacity-100`, circular with `bg-background/80 backdrop-blur-sm`
- Body: `p-4 flex flex-col gap-2`. Vendor dot (`w-1.5 h-1.5 rounded-full bg-primary`), title (`line-clamp-2`), rating row with Star icons, price row (`tabular-nums`), full-width "Add to Cart" button (`h-8 text-xs`)
- Stock warning: shown when `stock <= 5` — `text-amber-600 dark:text-amber-400`. Out of stock: `text-muted-foreground`

### 6.4 Vendor card

Container: `group rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors`, flex row with `gap-4`.

- Logo: `w-14 h-14 rounded-xl`, `ring-2 ring-border group-hover:ring-primary/30`
- Info: vendor name + `BadgeCheck` icon if verified, product count below
- Animated rule (`w-4→w-6`) + rating row at bottom
- Trailing `ArrowRight` that translates on hover

### 6.5 Flash sale banner

Full-width stripe above product grids. `bg-primary text-primary-foreground`, `rounded-2xl px-6 py-4`. Flex row on `sm:` with `Zap` icon, title + subtitle, and a live `HH:MM:SS` countdown with `tabular-nums`.

### 6.6 Category pill strip

Horizontally scrollable filter row. `flex gap-2 overflow-x-auto scrollbar-none`. Each pill: `rounded-full px-4 py-2 border`, active = `bg-primary text-primary-foreground border-primary`, inactive = `bg-background text-foreground border-border hover:border-primary/50 hover:text-primary`.

### 6.7 Search bar

Global site search. Container: `rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30`. Three sections:

1. Category `<select>` (left, with `border-r`)
2. Text input with `Search` icon
3. Submit `Button` (right, `rounded-r-xl`)

### 6.8 Trust badge strip

4-column grid (`grid-cols-2 md:grid-cols-4`), `divide-x divide-y md:divide-y-0 divide-border`. Each cell: icon in `w-9 h-9 rounded-xl bg-primary/10` container + label + subtitle.

Always present on checkout pages and below the hero on the homepage.

### 6.9 Product image gallery (PDP)

Grid layout: `grid-cols-1 md:grid-cols-[96px_1fr] gap-3`. Vertical thumbnail strip on `md+` (horizontal scroll on mobile). Active thumbnail gets `border-primary`. Main image is `aspect-square rounded-2xl` with optional sale badge overlay.

### 6.10 Vendor verification badge (inline)

```jsx
<div
  className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold
  tracking-wide px-2 py-0.5 rounded-full"
>
  <BadgeCheck className="w-3 h-3" />
  Verified
</div>
```

Used alongside any vendor name where trust signal is needed.

### 6.11 Review / rating summary

Two-column layout inside `rounded-2xl border border-border bg-card p-5`:

- **Left:** Big rating number (`text-4xl font-bold tabular-nums`), 5-star row, review count
- **Right:** Vertical bar chart (5→1 stars), each bar is `h-1.5 rounded-full bg-muted` with an `bg-amber-400` fill div

### 6.12 Cart item row

Flex row with `gap-4 py-4 border-b border-border`. Thumbnail (`w-16 h-16 rounded-xl`), info (name, vendor, variant), remove button, quantity stepper (`border border-border rounded-lg` with `Minus`/`Plus` buttons), and line total.

### 6.13 Stats strip (homepage / vendor profile)

`grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border`. Each cell: `py-8 px-6 text-center`, stat value (`text-3xl md:text-4xl font-bold tabular-nums text-primary`) + label with trailing icon.

### 6.14 Animated rule (micro-detail)

Expanding rule inside cards. Container: `flex items-center gap-2`. Rule: `h-px w-4 bg-primary/40 group-hover:w-6 transition-all duration-300`. Label: `text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/60`.

---

## 7. Button Conventions

| Intent                               | `variant` | `size`               | Icon placement                       |
| ------------------------------------ | --------- | -------------------- | ------------------------------------ |
| Primary CTA (Add to Cart, Subscribe) | (default) | `h-10 px-6`          | Leading, `w-4 h-4`                   |
| Secondary                            | `outline` | `h-10 px-6`          | —                                    |
| Ghost / text link                    | `ghost`   | `h-auto px-0`        | Trailing `ArrowRight`, `w-3.5 h-3.5` |
| Icon only (wishlist, share)          | `outline` | `w-9 h-9 rounded-xl` | Centered, `w-4 h-4`                  |
| Destructive (remove)                 | `ghost`   | `w-8 h-8`            | Centered, `w-4 h-4`                  |

Side-by-side layout preferred over stacked (use `flex gap-3`).

---

## 8. Image Overlay Gradients

| Context                        | Gradient                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| Hero (left-heavy)              | `bg-gradient-to-r from-background/95 via-background/70 to-transparent` |
| Product card hover (bottom-up) | `bg-gradient-to-t from-black/60 via-black/20 to-transparent`           |
| Vendor banner (bottom-up)      | `bg-gradient-to-t from-black/80 via-black/30 to-transparent`           |
| Category card overlay          | `bg-gradient-to-b from-transparent via-black/20 to-black/70`           |

Always use `from-background/…` (not `from-black/…`) in contexts where text sits on the left, so dark mode renders correctly.

---

## 9. Eyebrow Rule Width Convention

| Context                                  | Width                |
| ---------------------------------------- | -------------------- |
| Full page section header                 | `w-8`                |
| Column header inside footer              | `w-4`                |
| Compact strip (newsletter, flash banner) | `w-6`                |
| Inside image overlay caption             | `w-4 bg-white/60`    |
| Animated card rule (hover expand)        | `w-4 → w-6 on hover` |

---

## 10. Page Layouts

### 10.1 Navbar

```
<nav>
  <div max-w-7xl h-14 flex items-center gap-4>
    <Logo />
    <SearchBar className="flex-1 max-w-xl hidden md:flex" />
    <NavActions />   <!-- wishlist count, cart count, user menu -->
  </div>
  <CategoryBar />   <!-- border-b, horizontally scrollable category pills — desktop only -->
</nav>
```

**Cart badge:** `absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold`. Shows `99+` when count > 99.

### 10.2 Footer

```
<footer>
  <NewsletterStrip />        ← border-b
  <TrustBadgeStrip />        ← border-b
  <div py-12 max-w-7xl>
    grid lg:grid-cols-5
      Brand column (col-span-2)   → Logo, tagline, contact list, social icons
      Nav column 1                → eyebrow-header + links
      Nav column 2                → eyebrow-header + links
      Nav column 3                → eyebrow-header + links
    <BottomBar />                ← border-t pt-8
  </div>
</footer>
```

- **Brand column** — `space-y-5`, contains logo icon + wordmark (§10.4), tagline (`max-w-xs`), contact links, and social icon row (§10.3)
- **Nav columns** — each has eyebrow rule (`h-px w-4 bg-primary`) + header + `space-y-2.5` link list
- **Bottom bar** — `flex flex-col sm:flex-row items-center justify-between gap-4`. Copyright left, trust badges right separated by `w-1 h-1 rounded-full bg-primary/50` dots

### 10.3 Social icon button

```jsx
<a
  className="w-8 h-8 rounded-xl border border-border flex items-center justify-center
  text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5
  transition-all duration-200"
>
  <Icon className="w-4 h-4" />
</a>
```

### 10.4 Logo / Brand mark

```jsx
<div className="flex items-center gap-2.5">
  <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
    <ShoppingBag className="w-4.5 h-4.5 text-primary-foreground" />
  </div>
  <span className="font-bold text-lg tracking-tight">Oylkka</span>
</div>
```

### 10.5 Newsletter strip

Rendered above the footer, separated by `border-b`. Two-column grid on `md:`:

- **Left:** Eyebrow row (`h-px w-8 bg-primary` + "Newsletter"), heading with italic contrast + primary period, description
- **Right:** Email input + Submit button in `flex-col sm:flex-row gap-3`

---

## 11. Skeleton / Loading States

All loading states use shadcn's `<Skeleton>` component. Skeleton dimensions must match the real card/block exactly to prevent layout shift.

**Product card skeleton:**

```
border border-border rounded-2xl overflow-hidden
  └─ Skeleton aspect-square w-full
  └─ p-4 space-y-2
       └─ Skeleton h-3 w-20
       └─ Skeleton h-4 w-full
       └─ Skeleton h-4 w-3/4
       └─ Skeleton h-4 w-16
       └─ Skeleton h-8 w-full mt-2
```

---

## 12. Empty States

```jsx
<div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
    <Icon className="w-7 h-7 text-muted-foreground" />
  </div>
  <div>
    <p className="text-sm font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
  </div>
  {cta && (
    <Button size="sm" className="mt-2">
      {cta.label}
    </Button>
  )}
</div>
```
