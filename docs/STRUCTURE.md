# Oylkka — Project Structure

A reference document for understanding the codebase layout, conventions, and patterns used across the Oylkka multi-vendor e-commerce platform.

---

## 1. Tech Stack

| Layer        | Technology                                         |
| ------------ | -------------------------------------------------- |
| Runtime      | Bun                                                |
| Framework    | TanStack Start (React 19, SSR, file-based routing) |
| Routing      | `@tanstack/react-router` (file-based)              |
| Styling      | Tailwind CSS v4 + `@tailwindcss/vite`              |
| UI Library   | shadcn/ui (~35 Radix primitives)                   |
| Animation    | `motion` v12                                       |
| Server State | TanStack React Query                               |
| Forms        | React Hook Form + Zod resolvers                    |
| Database ORM | Prisma 7 + PostgreSQL (Neon)                       |
| Auth         | better-auth                                        |
| Images       | Cloudinary                                         |
| Linting      | Biome                                              |
| Icons        | lucide-react                                       |
| Toasts       | sonner                                             |

---

## 2. Directory Map

```
oylkka/
├── prisma/
│   ├── schema.prisma           # Main schema (concatenates all)
│   ├── enums.prisma            # All enums
│   ├── user.prisma             # User model
│   ├── shop.prisma             # Shop model
│   ├── product.prisma          # Product, ProductVariant, Category
│   ├── order.prisma            # Order, OrderItem
│   ├── cart.prisma             # Cart, CartItem
│   ├── review.prisma           # Review, ReviewVote
│   ├── banner.prisma           # Banner
│   ├── content.prisma          # ContentBlock
│   ├── conversation.prisma     # Conversation, Message
│   ├── return.prisma           # ReturnRequest
│   ├── shipping.prisma         # ShippingZone, ShippingRate
│   ├── email.prisma            # EmailLog
│   ├── audit.prisma            # AuditLog
│   ├── extra.prisma            # ExtraPage, Coupon, Wishlist, FollowedShop, etc.
│   └── migrations/             # Prisma migrations
│
├── public/                     # Static assets (favicon, logos, manifest, placeholder)
│
├── src/
│   ├── actions/                # Server actions
│   │   ├── check-slug.ts
│   │   └── send-order-email.ts
│   │
│   ├── cloudinary/             # Cloudinary helpers
│   │   ├── cloudinary.ts       # Client config
│   │   ├── upload-image.ts
│   │   ├── delete-image.ts
│   │   └── index.ts
│   │
│   ├── components/
│   │   ├── ui/                 # ~35 shadcn/ui primitives
│   │   │   ├── button.tsx, card.tsx, badge.tsx, input.tsx
│   │   │   ├── dialog.tsx, alert-dialog.tsx, sheet.tsx
│   │   │   ├── sidebar.tsx, dropdown-menu.tsx, popover.tsx
│   │   │   ├── select.tsx, checkbox.tsx, switch.tsx, tabs.tsx
│   │   │   ├── table.tsx, command.tsx, carousel.tsx, chart.tsx
│   │   │   ├── skeleton.tsx, avatar.tsx, tooltip.tsx, separator.tsx
│   │   │   ├── field.tsx, label.tsx, textarea.tsx, accordion.tsx
│   │   │   ├── datetime-picker.tsx, searchable-select.tsx
│   │   │   ├── tags-input.tsx, input-group.tsx, breadcrumb.tsx
│   │   │   ├── collapsible.tsx, scroll-area.tsx, sonner.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── header/              # Desktop nav, mobile menu, searchbar, user menu, cart, theme switcher
│   │   │   ├── footer/              # Single index.tsx
│   │   │   └── dashboard/           # App sidebar, nav-main, nav-user, team-switcher, breadcrumb
│   │   │
│   │   ├── pages/
│   │   │   ├── home/                # Hero, category carousel
│   │   │   ├── product/             # Gallery, info, variant picker, rating, reviews, related, questions, etc. (15 files)
│   │   │   └── shop/                # Product card, shop card, shop header
│   │   │
│   │   ├── forms/
│   │   │   ├── shop-form.tsx
│   │   │   ├── category-form.tsx
│   │   │   ├── banner-form.tsx
│   │   │   └── product/             # Multi-step: basic info, pricing, variants, dimensions, images, SEO, status (15 files)
│   │   │
│   │   ├── checkout/
│   │   │   └── payment-selector.tsx
│   │   │
│   │   └── orders/
│   │       ├── order-items-table.tsx
│   │       └── status-badge.tsx
│   │
│   ├── context/
│   │   └── theme-provider.tsx
│   │
│   ├── generated/prisma/       # Auto-generated Prisma types
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   ├── use-product-image.ts
│   │   └── use-sku-check.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts       # Axios instance with 401 interceptor
│   │   ├── auth.ts             # better-auth server instance
│   │   ├── auth-client.ts      # better-auth client instance
│   │   ├── auth-middleware.ts  # Route auth guards
│   │   ├── auth.functions.ts   # getSession, requireAuth helpers
│   │   ├── constants.ts        # React Query keys (~35 keys)
│   │   ├── csrf.ts             # CSRF protection
│   │   ├── db.ts               # Prisma client
│   │   ├── roles.ts            # Role-checking utilities
│   │   ├── slug.ts             # Slugify utility
│   │   ├── utils.ts            # cn() helper (clsx + tailwind-merge)
│   │   ├── rate-limit.ts       # Rate limit config
│   │   ├── rate-limit-guard.ts # Rate limit middleware
│   │   ├── logger.ts           # Structured logging
│   │   ├── stock.ts            # Stock calculation helpers
│   │   ├── bd-districts.ts     # Bangladesh district data
│   │   ├── bkash.ts            # bKash payment integration
│   │   ├── email-queue.ts      # Email queue processing
│   │   ├── email-templates.ts  # Email template builders
│   │   ├── invoice-pdf.ts      # PDF invoice generation
│   │   ├── invoice-queue.ts    # Invoice queue processing
│   │   ├── nodemailer.ts       # Nodemailer transport config
│   │   ├── send-email.ts       # Email sending utility
│   │   ├── audit-log.ts        # Audit log creation
│   │   └── cart-cleanup.ts     # Stale cart cleanup
│   │
│   ├── router.tsx              # Router factory (createRouter + routeTree)
│   │
│   ├── routes/                 # All application routes (file-based)
│   │   ├── __root.tsx          # Root layout — QueryClient, ThemeProvider, Toaster, devtools
│   │   ├── routeTree.gen.ts    # Auto-generated route tree
│   │   │
│   │   ├── index.tsx           # /
│   │   ├── about.tsx           # /about
│   │   ├── bestsellers.tsx     # /bestsellers (built)
│   │   ├── cart.tsx            # /cart
│   │   ├── categories.tsx      # /categories (built)
│   │   ├── checkout.tsx        # /checkout
│   │   ├── checkout/confirmation.tsx  # /checkout/confirmation
│   │   ├── compare.tsx         # /compare
│   │   ├── contact.tsx         # /contact
│   │   ├── deals.tsx           # /deals
│   │   ├── faq.tsx             # /faq
│   │   ├── help.tsx            # /help (built)
│   │   ├── new-arrivals.tsx    # /new-arrivals (built)
│   │   ├── privacy.tsx         # /privacy
│   │   ├── product.$slug.tsx   # /product/:slug
│   │   ├── products.tsx        # /products
│   │   ├── recently-viewed.tsx # /recently-viewed
│   │   ├── reset-password.tsx  # /reset-password (validateSearch token+email)
│   │   ├── returns.tsx         # /returns
│   │   ├── shipping.tsx        # /shipping
│   │   ├── shop.$slug.tsx      # /shop/:slug
│   │   ├── terms.tsx           # /terms
│   │   ├── tracking.tsx        # /tracking (built)
│   │   │
│   │   ├── auth/               # Auth pages
│   │   │   ├── signin.tsx
│   │   │   ├── signup.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   ├── verify.tsx
│   │   │   └── error.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── route.tsx       # Dashboard layout — auth guard + sidebar + header + <Outlet />
│   │   │   ├── index.tsx       # /dashboard — "Welcome, {user.name}!"
│   │   │   ├── addresses.tsx
│   │   │   ├── followed-shops.tsx
│   │   │   ├── my-account.tsx
│   │   │   ├── wallet.tsx
│   │   │   ├── wishlist.tsx
│   │   │   ├── vouchers/      # My vouchers
│   │   │   ├── orders/         # Customer order history (+ returns)
│   │   │   ├── reviews/        # My reviews
│   │   │   ├── messages/       # Customer conversations
│   │   │   │
│   │   │   ├── become-vendor/
│   │   │   │   ├── route.tsx   # Layout — <Outlet />
│   │   │   │   ├── apply.tsx   # Shop application form
│   │   │   │   └── pending.tsx # Application status
│   │   │   │
│   │   │   ├── vendor/
│   │   │   │   ├── route.tsx   # Vendor layout — role guard (<Outlet />)
│   │   │   │   ├── products/   # Index (list), add, edit
│   │   │   │   ├── orders/     # Vendor orders (includes cancel)
│   │   │   │   ├── sales/      # Sales dashboard
│   │   │   │   ├── payouts/    # Payout history + schedule
│   │   │   │   ├── questions/  # Customer questions on products
│   │   │   │   ├── returns/    # Vendor returns queue
│   │   │   │   ├── shipping/   # Shipping zones
│   │   │   │   └── shop/       # Profile, branding, policies
│   │   │   │
│   │   │   └── admin/
│   │   │       ├── route.tsx   # Admin layout — <Outlet />
│   │   │       ├── index.tsx   # Dashboard overview
│   │   │       ├── banner/     # List, add, edit
│   │   │       ├── category/   # List, add, edit
│   │   │       ├── content/    # Content blocks
│   │   │       ├── coupons/    # Coupon management
│   │   │       ├── customers/  # Customer list
│   │   │       ├── global-attributes/  # Global attribute taxonomy + product mappings
│   │   │       ├── messages/   # Admin conversations
│   │   │       ├── orders/     # All orders
│   │   │       ├── returns/    # Returns queue
│   │   │       ├── reviews/    # All reviews
│   │   │       ├── settings/   # Admin settings
│   │   │       ├── staff/      # Audit logs only (index redirects to audit-logs)
│   │   │       └── vendors/    # Vendor list, approve/reject
│   │   │
│   │   └── api/                # Server-side API routes
│   │       ├── contact.ts
│   │       ├── addresses/      # CRUD
│   │       ├── admin/          # Dashboard metrics
│   │       ├── auth/$          # better-auth API handler
│   │       ├── banners/        # CRUD
│   │       ├── cart/           # Add, remove, update
│   │       ├── categories/     # CRUD
│   │       ├── checkout/       # Place order, validate
│   │       ├── content/        # Content blocks
│   │       ├── conversations/  # Messaging
│   │       ├── messages/       # Messages within conversations
│   │       ├── orders/         # Order CRUD
│   │       ├── product/        # CRUD
│   │       ├── returns/        # Return requests
│   │       ├── reviews/        # CRUD
│   │       ├── shop/           # Apply, update, approve, reject, my-shop, detail
│   │       ├── upload/         # File upload
│   │       ├── vendor/         # Vendor operations
│   │       ├── vouchers/       # Voucher CRUD
│   │       ├── wallet/         # Wallet operations
│   │       └── wishlist/       # CRUD
│   │
│   ├── schemas/                # Zod validation schemas
│   │   ├── shop-schema.ts
│   │   ├── banner-schema.ts
│   │   ├── category-schema.ts
│   │   └── product-api-schema.ts
│   │
│   ├── services/               # React Query hooks (one file per domain)
│   │   ├── address.ts
│   │   ├── admin-audit-logs.ts
│   │   ├── admin-content.ts
│   │   ├── admin-coupons.ts
│   │   ├── admin-customers.ts
│   │   ├── admin-dashboard.ts
│   │   ├── admin-global-attributes.ts
│   │   ├── admin-orders.ts
│   │   ├── admin-reviews.ts
│   │   ├── admin-settings.ts
│   │   ├── banner.ts
│   │   ├── cart.ts
│   │   ├── category.ts
│   │   ├── checkout/           # Coupon validator, discount calculator, voucher processor
│   │   ├── conversations.ts
│   │   ├── extra.ts
│   │   ├── order.ts
│   │   ├── payouts.ts
│   │   ├── product.ts
│   │   ├── returns.ts
│   │   ├── shop.ts
│   │   ├── sku-service.ts
│   │   ├── user-reviews.ts
│   │   ├── user.ts
│   │   ├── vendor-analytics.ts
│   │   ├── vendor-orders.ts
│   │   ├── vendor-policies.ts
│   │   ├── vendor-questions.ts
│   │   ├── vendor-shipping.ts
│   │   ├── voucher.ts
│   │   ├── wallet.ts
│   │   └── wishlist.ts
│   │
│   ├── styles.css              # Tailwind entry + shadcn CSS variables + fonts
│   ├── types/                  # TS declarations (orders.ts, color-namer.d.ts, pdfmake.d.ts)
│   └── test/                   # Test setup
│       ├── jsdom-setup.ts
│       ├── setup.ts
│       └── smoke.test.ts
│
├── docs/
│   ├── DESIGN.md               # Design system reference
│   └── STRUCTURE.md            # This file
│
├── .env
├── biome.json                  # Biome (linter/formatter) config
├── components.json             # shadcn/ui config
├── package.json
├── tsconfig.json
├── vite.config.ts              # Vite + Tailwind v4 + TanStack Start
└── prisma.config.ts
```

---

## 3. Routing Conventions

TanStack Router file-based routing maps `src/routes/` paths directly to URL paths.

### File → URL mapping

| File path                                        | URL                                |
| ------------------------------------------------ | ---------------------------------- |
| `src/routes/index.tsx`                           | `/`                                |
| `src/routes/__root.tsx`                          | Root layout (wraps all routes)     |
| `src/routes/product.$slug.tsx`                   | `/product/:slug`                   |
| `src/routes/shop.$slug.tsx`                      | `/shop/:slug`                      |
| `src/routes/reset-password.tsx`                  | `/reset-password` (token+email via `validateSearch`) |
| `src/routes/checkout/confirmation.tsx`           | `/checkout/confirmation`           |
| `src/routes/dashboard/vendor/products/index.tsx` | `/dashboard/vendor/products/`      |
| `src/routes/api/shop/apply.ts`                   | `/api/shop/apply` (server handler) |

### Route anatomy

Every route file exports:

```ts
export const Route = createFileRoute("/path/to/route")({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== "VENDOR") {
      throw redirect({ to: "/dashboard" });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});
```

### Route types

- **Layout route** — `route.tsx` with `<Outlet />` for child routes
- **Index route** — `index.tsx` renders at the parent path
- **Page route** — `add.tsx`, `edit.tsx`, `detail.tsx`, etc.
- **API route** — uses `server.handlers` object with HTTP method keys

### API route pattern

```ts
export const Route = createFileRoute("/api/shop/apply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });
        // handle request, return Response.json(...)
      },
    },
  },
});
```

---

## 4. Page Component Pattern

Every page follows the same state handling pattern:

```tsx
function RouteComponent() {
  const { data, isLoading, isError } = useSomeQuery();

  if (isLoading) return <Skeleton />; // Loading skeleton
  if (isError || !data) return <EmptyState />; // Empty/error state
  return <div>{/* Data rendered here */}</div>; // Content
}
```

### Loading state

Use `<Skeleton>` components matching real content dimensions to prevent layout shift.

### Empty state

```
w-16 h-16 rounded-2xl bg-muted flex items-center justify-center
  → icon (w-7 h-7 text-muted-foreground)
  → title (text-sm font-semibold)
  → description (text-sm text-muted-foreground mt-1 max-w-xs)
  → optional CTA button (mt-2)
```

### Error state

Same as empty state but with error message and optional "Back" or "Retry" button.

---

## 5. Data Flow

```
User Action → Component → React Query Mutation → API Route (server handler)
                                                       ↓
                                              Prisma (database)
                                                  ↓  Cloudinary
                                              Response.json()
                                                       ↓
                                              Query invalidation
                                                       ↓
                                              UI re-render
```

### Queries (useQuery)

```ts
export function useMyShop() {
  return useQuery<ShopResponse | null>({
    queryKey: [QUERY_KEYS.SHOPS, "my-shop"],
    queryFn: async () => {
      const response = await axios.get("/api/shop/my-shop");
      return response.data;
    },
  });
}
```

### Mutations (useMutation)

```ts
export function useUpdateShopMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      /* FormData, axios.patch */
    },
    onMutate: () => toast.loading("Updating...", { id: "shop-update" }),
    onSuccess: () => {
      toast.success("Shop updated", { id: "shop-update" });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SHOPS] });
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.error ?? error.message)
        : "Something went wrong";
      toast.error(`Error: ${message}`, { id: "shop-update" });
    },
  });
}
```

### FormData mutations (file uploads)

- Create `FormData`, append text fields + `File` objects
- Set `Content-Type: multipart/form-data` header
- Server reads via `request.formData()`, parses text fields with Zod, uploads files to Cloudinary

---

## 6. Database Models (Prisma)

| Model                                            | File                  | Purpose                                                            |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------------ |
| **User**                                         | `user.prisma`         | better-auth user (name, email, role)                               |
| **Session / Account / Verification**             | `user.prisma`         | better-auth support tables                                         |
| **Shop**                                         | `shop.prisma`         | Vendor shop profile (name, slug, status, commission, stats, owner) |
| **Product**                                      | `product.prisma`      | Product listing (name, price, stock, images JSON, category)        |
| **ProductVariant**                               | `product.prisma`      | SKU-level variants (name, price, stock)                            |
| **Category**                                     | `product.prisma`      | Product categories (name, slug, parent)                            |
| **Order**                                        | `order.prisma`        | Customer order (orderNumber, subtotal, total, status)              |
| **OrderItem**                                    | `order.prisma`        | Per-shop order line (unitPrice, qty, fulfillmentStatus)            |
| **Cart / CartItem**                              | `cart.prisma`         | Guest/user cart                                                    |
| **Review / ReviewVote**                          | `review.prisma`       | Product reviews (rating, comment)                                  |
| **Banner**                                       | `banner.prisma`       | Homepage banners (title, imageUrl, linkUrl, active)                |
| **ContentBlock**                                 | `content.prisma`      | CMS content blocks (key, title, body)                              |
| **Conversation / Message**                       | `conversation.prisma` | Messaging between users                                            |
| **ReturnRequest**                                | `return.prisma`       | Return/refund requests                                             |
| **ShippingZone / ShippingRate**                  | `shipping.prisma`     | Shipping configuration                                             |
| **EmailLog**                                     | `email.prisma`        | Email delivery tracking                                            |
| **AuditLog**                                     | `audit.prisma`        | Admin action audit trail                                           |
| **Payout / PayoutItem**                          | `shop.prisma`         | Vendor payout records                                              |
| **Wishlist / FollowedShop / Coupon / ExtraPage** | `extra.prisma`        | Miscellaneous domain models                                        |

### Shop statuses

`PENDING → ACTIVE` (or `REJECTED`, `SUSPENDED`) — there is no `APPROVED`; an application becomes `ACTIVE` on approval.

### Order statuses

`PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED` (or `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`)

### Product statuses

`DRAFT → PUBLISHED → ARCHIVED` (or `REJECTED`, `OUT_OF_STOCK`)

---

## 7. Services Layer (React Query)

Query keys are centralized in `src/lib/constants.ts` (~35 keys). Each domain has its own service file under `src/services/`.

| Service file          | Key hooks                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `shop.ts`             | `useMyShop`, `useAdminShops`, `useShopDetail`, `useApplyShopMutation`, `useUpdateShopMutation` |
| `product.ts`          | `useVendorProducts`, `useProduct`, `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct`  |
| `banner.ts`           | `useHeroBanner`, `useAdminBanners`, `useCreateBanner`, `useUpdateBanner`                       |
| `category.ts`         | `useCategories`, `useCreateCategory`, `useUpdateCategory`                                      |
| `cart.ts`             | `useCart`, `useAddToCart`, `useRemoveFromCart`, `useUpdateCartItem`                            |
| `order.ts`            | `useOrder`, `useMyOrders`, `useCreateOrder`                                                    |
| `wishlist.ts`         | `useWishlist`, `useAddToWishlist`, `useRemoveFromWishlist`                                     |
| `address.ts`          | `useAddresses`, `useCreateAddress`, `useUpdateAddress`                                         |
| `conversations.ts`    | `useConversations`, `useCreateConversation`                                                    |
| `wallet.ts`           | `useWallet`, `useTopUp`                                                                        |
| `voucher.ts`          | `useMyVouchers`, `useCollectVoucher`, `useAutoApplyVouchers`, `useProductVouchers` |
| `returns.ts`          | `useMyReturns`, `useCreateReturnMutation`, `useVendorReturns`, `useAdminReturns`  |
| `user-reviews.ts`     | `useMyReviews`, `useCreateReview`                                                              |
| `vendor-orders.ts`    | `useVendorOrders`, `useUpdateFulfillment`                                                      |
| `vendor-analytics.ts` | `useVendorAnalytics`                                                                           |
| `vendor-shipping.ts`  | `useShippingZones`, `useCreateShippingZone`                                                    |
| `vendor-policies.ts`  | `useShopPolicies`, `useUpdatePolicy`                                                           |
| `vendor-questions.ts` | `useVendorQuestions`, `useAnswerQuestionMutation`                                              |
| `user.ts`             | `useUploadAvatarMutation`                                                                      |
| `admin-dashboard.ts`  | `useAdminDashboardMetrics`                                                                     |
| `admin-orders.ts`     | `useAdminOrders`, `useUpdateOrderStatus`                                                       |
| `admin-customers.ts`  | `useAdminCustomers`                                                                            |
| `admin-reviews.ts`    | `useAdminReviews`, `useModerateReviewMutation`                                                 |
| `admin-coupons.ts`    | `useAdminCoupons`, `useCreateCoupon`                                                           |
| `admin-content.ts`    | `useAdminContentBlocks`, `useSaveContentBlockMutation`, `useContentBlock`                      |
| `admin-settings.ts`   | `useAdminSettings`, `useUpdateSettingsMutation`                                                |
| `admin-global-attributes.ts` | `useAdminGlobalAttributes`, `useProductGlobalAttributeMappings`, `useGlobalAttributeProducts`, `useMapProductAttributeMutation`, `useUnmapProductAttributeMutation` |
| `admin-audit-logs.ts` | `useAdminAuditLogs`                                                                            |
| `sku-service.ts`      | SKU generation/validation utilities                                                            |
| `payouts.ts`          | `usePayouts`, `useRequestPayout`                                                               |
| `extra.ts`            | Followed shops, static pages                                                                   |
| `checkout/`           | `coupon-validator.ts`, `discount-calculator.ts`, `voucher-processor.ts`                        |

---

## 8. Component Patterns

### Card styling

```tsx
<Card className="rounded-2xl border-border shadow-none">
```

### Info row with icon

```tsx
<div className="flex items-start gap-3">
  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
  </div>
  <div className="min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium truncate">{value}</p>
  </div>
</div>
```

### Delete confirmation

```tsx
<AlertDialog open={!!deleteId} onOpenChange={...}>
  <AlertDialogContent size="sm">
    <AlertDialogHeader>
      <AlertDialogTitle>Delete item?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive" onClick={...}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 9. Form Patterns

All forms use React Hook Form + Zod:

```tsx
const schema = z.object({
  /* ... */
});
const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: {
    /* ... */
  },
});

<form onSubmit={handleSubmit(onSubmit)}>
  <Field data-invalid={!!errors.name}>
    <FieldLabel htmlFor="name">Field Name</FieldLabel>
    <Input id="name" {...register("name")} />
    {errors.name && <FieldError>{errors.name.message}</FieldError>}
  </Field>
  <Button type="submit">Submit</Button>
</form>;
```

File upload inputs use hidden `<Input type="file">` with `onChange` handler creating `URL.createObjectURL` previews and storing the `File` in form state.

---

## 10. Auth System

- **Library**: better-auth with Prisma adapter + PostgreSQL
- **Session**: Server-side via `auth.api.getSession({ headers })`
- **Route guard**: `beforeLoad` in route definition checks `context.user`
- **Role-based access**: `context.user.role` — `USER`, `VENDOR`, `ADMIN`, `MANAGER`, `CUSTOMER_SERVICE`
- **Vendor layout**: Guards `role !== 'VENDOR'`, redirects to `/dashboard`

---

## 11. Image Handling (Cloudinary)

```ts
import { UploadImage } from "@/cloudinary";
const result = await UploadImage(file, "shops"); // folder name
// Returns: { secure_url, public_id }

import { DeleteImage } from "@/cloudinary/delete-image";
await DeleteImage(publicId);
```

Used for shop logos/banners, product images, banner images. Validation: JPEG/PNG/WebP only, max 500KB.

---

## 12. Key Conventions Summary

| Convention                   | Rule                                                     |
| ---------------------------- | -------------------------------------------------------- |
| Imports                      | `@/` maps to `src/`                                      |
| CSS                          | shadcn CSS variables only — never hard-coded hex         |
| Icons                        | lucide-react                                             |
| Toast                        | sonner (`toast.loading`, `toast.success`, `toast.error`) |
| cn()                         | `clsx` + `tailwind-merge` via `src/lib/utils.ts`         |
| Loading                      | `<Skeleton>` matching real dimensions                    |
| Empty state                  | Icon + title + description + optional CTA                |
| Forms                        | React Hook Form + Zod + `<Field>` wrapper                |
| File upload                  | FormData + Cloudinary server handler                     |
| Roles                        | USER, VENDOR, ADMIN, MANAGER, CUSTOMER_SERVICE           |
| Navigation                   | `useNavigate()` with literal `to` strings                |
| API validation               | Zod schema on server before processing                   |
| Animations                   | `motion/react` — see `docs/DESIGN.md` §5                 |
| Button conventions           | See `docs/DESIGN.md` §7                                  |
| Eyebrow row / section header | See `docs/DESIGN.md` §6.1–6.2                            |
