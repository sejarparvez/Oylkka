import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ChevronDown,
  Globe,
  Mail,
  MapPin,
  PackageX,
  Phone,
  Star,
  Store,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { ProductCard } from '@/components/pages/shop/product-card';
import { ShopHeader } from '@/components/pages/shop/shop-header';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CategoryProduct } from '@/services/product';
import { usePublicShop, usePublicShopProducts } from '@/services/shop';

export const Route = createFileRoute('/shop/$slug')({
  component: RouteComponent,
});

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

function RouteComponent() {
  const { slug } = Route.useParams();
  const { data: shop, isLoading, isError } = usePublicShop(slug);
  const [productPage, setProductPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: moreProducts, isLoading: loadingMore } = usePublicShopProducts(
    slug,
    productPage,
  );

  const initialProducts: CategoryProduct[] = (shop?.products ?? []).map(
    (p) => ({
      ...p,
      shop: {
        id: shop?.id ?? '',
        name: shop?.name ?? '',
        slug: shop?.slug ?? '',
      },
    }),
  );

  const fetchedProducts: CategoryProduct[] = (moreProducts?.products ?? []).map(
    (p) => ({
      ...p,
      shop: {
        id: shop?.id ?? '',
        name: shop?.name ?? '',
        slug: shop?.slug ?? '',
      },
    }),
  );

  const accumulatedRef = useRef<CategoryProduct[]>([]);
  if (productPage === 1) {
    accumulatedRef.current = initialProducts;
  } else if (fetchedProducts.length > 0) {
    const seen = new Set(accumulatedRef.current.map((p) => p.id));
    accumulatedRef.current = [
      ...accumulatedRef.current,
      ...fetchedProducts.filter((p) => !seen.has(p.id)),
    ];
  }
  const allProducts = accumulatedRef.current;

  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    for (const p of allProducts) {
      if (!cats.has(p.category.slug)) {
        cats.set(p.category.slug, p.category.name);
      }
    }
    return Array.from(cats.entries()).map(([slug, name]) => ({ slug, name }));
  }, [allProducts]);

  if (isLoading) return <ShopDetailSkeleton />;
  if (isError || !shop) return <ShopNotFound />;

  const filteredProducts = activeCategory
    ? allProducts.filter((p) => p.category.slug === activeCategory)
    : allProducts;

  const totalProducts = moreProducts?.total ?? shop._count.products;
  const hasMoreProducts = allProducts.length < totalProducts;

  const hasAddress =
    shop.addressLine1 || shop.city || shop.state || shop.country;

  const contactItems = [
    ...(shop.email ? [{ icon: Mail, label: 'Email', value: shop.email }] : []),
    ...(shop.phone ? [{ icon: Phone, label: 'Phone', value: shop.phone }] : []),
    ...(shop.website
      ? [
          {
            icon: Globe,
            label: 'Website',
            value: shop.website,
            href: shop.website.startsWith('http')
              ? shop.website
              : `https://${shop.website}`,
          },
        ]
      : []),
    ...(hasAddress
      ? [
          {
            icon: MapPin,
            label: 'Address',
            value: [
              shop.addressLine1,
              shop.addressLine2,
              shop.city,
              shop.state,
              shop.country,
            ]
              .filter(Boolean)
              .join(', '),
          },
        ]
      : []),
  ] as const;

  const policySections = [
    {
      key: 'shippingPolicy',
      label: 'Shipping Policy',
      text: shop.policies?.shippingPolicy,
    },
    {
      key: 'returnPolicy',
      label: 'Return & Refund Policy',
      text: shop.policies?.returnPolicy,
    },
    {
      key: 'termsAndConditions',
      label: 'Terms & Conditions',
      text: shop.policies?.termsAndConditions,
    },
  ].filter((s) => s.text?.trim());

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='w-full border-b border-border bg-card/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
          <Breadcrumb>
            <BreadcrumbList className='text-xs'>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to='/' className='hover:text-primary transition-colors'>
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to='/shops'
                    className='hover:text-primary transition-colors'
                  >
                    Shops
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className='truncate max-w-40 font-medium text-foreground'>
                  {shop.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-20'>
        <motion.div
          initial='hidden'
          animate='show'
          variants={fadeUp}
          custom={0}
        >
          <ShopHeader shop={shop} />
        </motion.div>

        {shop.description && (
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={0}
          >
            <div className='flex items-center gap-3 mb-6'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                About
              </span>
            </div>
            <div className='grid md:grid-cols-5 gap-8'>
              <div className='md:col-span-3'>
                <div className='rounded-2xl border border-border bg-card p-6 md:p-8'>
                  <p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-line'>
                    {shop.description}
                  </p>
                </div>
              </div>
              {contactItems.length > 0 && (
                <div className='md:col-span-2'>
                  <div className='rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5'>
                    <p className='text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground'>
                      Contact Info
                    </p>
                    <div className='space-y-4'>
                      {contactItems.map((item) => (
                        <ContactRow key={item.label} {...item} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {policySections.length > 0 && (
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={0}
          >
            <div className='flex items-center gap-3 mb-6'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Shop Policies
              </span>
            </div>
            <div className='grid md:grid-cols-3 gap-4'>
              {policySections.map((section) => (
                <div
                  key={section.key}
                  className='rounded-2xl border border-border bg-card p-6'
                >
                  <p className='text-xs font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-3'>
                    {section.label}
                  </p>
                  <p className='text-sm text-muted-foreground leading-relaxed whitespace-pre-line'>
                    {section.text}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          custom={0}
        >
          <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
            <div>
              <div className='flex items-center gap-3 mb-3'>
                <div className='h-px w-8 bg-primary' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                  Products
                </span>
              </div>
              <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
                All{' '}
                <span className='italic font-bold text-primary'>Products</span>
                <span className='text-primary'>.</span>
              </h2>
            </div>
          </div>

          {categories.length > 1 && (
            <div className='flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap mb-6'>
              <button
                type='button'
                onClick={() => setActiveCategory(null)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200',
                  activeCategory === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary',
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  type='button'
                  onClick={() => setActiveCategory(cat.slug)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200',
                    activeCategory === cat.slug
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <>
              <motion.div
                initial='hidden'
                animate='show'
                variants={gridVariants}
                key={activeCategory ?? 'all'}
                className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
              >
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </motion.div>
              {hasMoreProducts && !activeCategory && (
                <div className='flex justify-center mt-10'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-2'
                    onClick={() => setProductPage((p) => p + 1)}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      'Loading…'
                    ) : (
                      <>
                        <ChevronDown className='w-4 h-4' />
                        Load More Products
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
              <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
                <PackageX className='w-7 h-7 text-muted-foreground' />
              </div>
              <div>
                <p className='text-sm font-semibold'>No products yet</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                  This shop hasn't listed any products yet. Check back soon!
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {shop.recentReviews.length > 0 && (
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeUp}
            custom={0}
          >
            <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
              <div>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='h-px w-8 bg-primary' />
                  <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                    Reviews
                  </span>
                </div>
                <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
                  Recent{' '}
                  <span className='italic font-bold text-primary'>Reviews</span>
                  <span className='text-primary'>.</span>
                </h2>
              </div>
            </div>

            <div className='grid md:grid-cols-3 gap-8 mb-8'>
              <div className='rounded-2xl border border-border bg-card p-6 text-center'>
                <p className='text-5xl font-bold tabular-nums'>
                  {shop.rating.toFixed(1)}
                </p>
                <div className='flex items-center justify-center gap-0.5 mt-2'>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(shop.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <p className='text-xs text-muted-foreground mt-1.5'>
                  {shop.totalReviews.toLocaleString()} reviews
                </p>
              </div>

              <div className='md:col-span-2 rounded-2xl border border-border bg-card p-6'>
                <div className='flex flex-col gap-2'>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const total = Object.values(shop.ratingBreakdown).reduce(
                      (a, b) => a + b,
                      0,
                    );
                    const count = shop.ratingBreakdown[star] ?? 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} className='flex items-center gap-2'>
                        <span className='text-xs text-muted-foreground w-3 shrink-0'>
                          {star}
                        </span>
                        <Star className='w-3 h-3 text-amber-400 fill-amber-400 shrink-0' />
                        <div className='flex-1 h-2 rounded-full bg-muted overflow-hidden'>
                          <div
                            className='h-full bg-amber-400 rounded-full transition-all duration-500'
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className='text-xs text-muted-foreground w-8 text-right tabular-nums'>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className='grid md:grid-cols-2 gap-4'>
              {shop.recentReviews.map((review) => (
                <div
                  key={review.id}
                  className='rounded-2xl border border-border bg-card p-5 hover:border-primary/20 transition-colors duration-300'
                >
                  <div className='flex items-start gap-3 mb-3'>
                    <div className='w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 ring-2 ring-border flex items-center justify-center bg-primary/10'>
                      <span className='text-xs font-bold text-primary'>
                        {review.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='text-sm font-semibold'>
                          {review.user.name}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 mt-0.5'>
                        <div className='flex items-center gap-0.5'>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s <= review.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className='text-xs text-muted-foreground'>
                          on{' '}
                          <Link
                            to='/product/$slug'
                            params={{ slug: review.product.slug }}
                            className='font-medium hover:text-primary transition-colors'
                          >
                            {review.product.productName}
                          </Link>
                        </span>
                      </div>
                    </div>
                  </div>
                  {review.title && (
                    <h4 className='text-sm font-semibold mb-1'>
                      {review.title}
                    </h4>
                  )}
                  <p className='text-sm text-muted-foreground leading-relaxed line-clamp-3'>
                    {review.content}
                  </p>
                  <p className='text-xs text-muted-foreground mt-2'>
                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeUp}
          custom={0}
          className='pb-8'
        >
          <div className='rounded-2xl border border-border bg-linear-to-br from-primary/5 to-transparent p-8 md:p-12 text-center'>
            <div className='max-w-md mx-auto space-y-4'>
              <div className='w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto'>
                <Store className='w-7 h-7 text-primary' />
              </div>
              <h3 className='text-xl font-bold tracking-tight'>
                Visit{' '}
                <span className='italic font-bold text-primary'>
                  {shop.name}
                </span>
                <span className='text-primary'>.</span>
              </h3>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                Browse all products from this seller and find more great deals
                across our marketplace.
              </p>
              <div className='flex items-center justify-center gap-3 pt-2'>
                <Button variant='outline' size='sm' asChild>
                  <Link to='/shops'>
                    <Store className='w-4 h-4' />
                    All Shops
                  </Link>
                </Button>
                <Button size='sm' asChild>
                  <Link to='/'>Browse Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className='flex items-center gap-3 group'>
      <div className='w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors'>
        <Icon className='w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors' />
      </div>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='text-sm font-medium truncate'>{value}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='block hover:text-primary transition-colors'
      >
        {content}
      </a>
    );
  }

  return content;
}

function ShopDetailSkeleton() {
  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='w-full border-b border-border bg-card/50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
          <Skeleton className='h-3 w-64' />
        </div>
      </div>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-20'>
        <Skeleton className='h-52 md:h-72 w-full rounded-2xl' />
        <div className='flex items-end gap-5 px-5 -mt-14 md:-mt-20 mb-8'>
          <Skeleton className='w-20 h-20 md:w-28 md:h-28 rounded-2xl ring-4 ring-background' />
          <div className='space-y-2 pb-1'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-4 w-36' />
          </div>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden'>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-28 bg-card rounded-none' />
          ))}
        </div>
        <Skeleton className='h-40 w-full rounded-2xl' />
        <div className='space-y-6'>
          <Skeleton className='h-8 w-48' />
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: this is fine
              <Skeleton key={i} className='aspect-square w-full rounded-2xl' />
            ))}
          </div>
        </div>
        <Skeleton className='h-64 w-full rounded-2xl' />
        <Skeleton className='h-32 w-full rounded-2xl' />
      </div>
      <Footer />
    </div>
  );
}

function ShopNotFound() {
  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24'>
        <div className='flex flex-col items-center justify-center py-20 gap-5 text-center'>
          <div className='w-20 h-20 rounded-2xl bg-muted flex items-center justify-center'>
            <Store className='w-9 h-9 text-muted-foreground' />
          </div>
          <div className='max-w-sm'>
            <p className='text-lg font-semibold'>Shop not found</p>
            <p className='text-sm text-muted-foreground mt-1.5'>
              The shop you're looking for doesn't exist or is not active yet.
            </p>
          </div>
          <div className='flex gap-3 mt-2'>
            <Button asChild className='rounded-xl'>
              <Link to='/shops'>Browse Shops</Link>
            </Button>
            <Button variant='outline' asChild className='rounded-xl'>
              <Link to='/'>Browse Home</Link>
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
