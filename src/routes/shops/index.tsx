import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2, Search, Store, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { ShopCard, ShopCardSkeleton } from '@/components/pages/shop/shop-card';
import { QueryErrorState } from '@/components/query-state';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { usePublicShops } from '@/services/shop';

export const Route = createFileRoute('/shops/')({
  component: RouteComponent,
});

// ── Animation constants ──

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

const viewportOpts = { once: true, margin: '-80px' } as const;

// ── Component ──

function RouteComponent() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = usePublicShops({
    page,
    search: debouncedSearch || undefined,
  });

  const shops = data?.shops ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const hasMore = page < totalPages;
  const hasActiveSearch = !!debouncedSearch;

  const isInitialLoading = isLoading && page === 1;
  const isLoadingMore = isLoading && page > 1;

  const itemsPerPage = data?.limit ?? 8;
  const from = total > 0 ? (page - 1) * itemsPerPage + 1 : 0;
  const to = Math.min(page * itemsPerPage, total);

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      {/* ════════════════════════════════════════
          Breadcrumb
         ════════════════════════════════════════ */}
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
                <BreadcrumbPage className='font-medium text-foreground'>
                  Shops
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* ════════════════════════════════════════
          Hero header + content
         ════════════════════════════════════════ */}
      <div className='relative overflow-hidden'>
        {/* Subtle gradient anchor — barely visible premium touch */}
        <div className='absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none' />

        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          {/* ── 1. Eyebrow row ── */}
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={viewportOpts}
            variants={fadeUp}
            custom={0}
            className='flex items-center gap-3 mb-3'
          >
            <div className='h-px w-8 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              Marketplace
            </span>
            <span className='text-xs text-muted-foreground tabular-nums'>
              {isInitialLoading ? (
                <span className='animate-pulse'>Loading…</span>
              ) : (
                `${total.toLocaleString()} shop${total !== 1 ? 's' : ''}`
              )}
            </span>
          </motion.div>

          {/* ── 2. Heading ── */}
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={viewportOpts}
            variants={fadeUp}
            custom={0.08}
          >
            <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
              {hasActiveSearch ? (
                <>
                  Shops matching{' '}
                  <span className='italic font-bold text-primary'>
                    &ldquo;{debouncedSearch}&rdquo;
                  </span>
                  <span className='text-primary'>.</span>
                </>
              ) : (
                <>
                  Explore{' '}
                  <span className='italic font-bold text-primary'>Shops</span>
                  <span className='text-primary'>.</span>
                </>
              )}
            </h2>
          </motion.div>

          {/* ── 3. Search bar ── */}
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={viewportOpts}
            variants={fadeUp}
            custom={0.12}
            className='mt-6'
          >
            <div className='flex items-center gap-0 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all duration-200 overflow-hidden max-w-md'>
              <div className='flex items-center gap-2 px-3 flex-1'>
                <Search className='w-4 h-4 text-muted-foreground shrink-0' />
                <input
                  type='search'
                  placeholder='Search shops…'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className='flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                />
              </div>
              {search && (
                <button
                  type='button'
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                  className='pr-3 text-muted-foreground hover:text-foreground transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              )}
            </div>
          </motion.div>

          {/* ── 4. Grid / Empty state ── */}
          {isInitialLoading ? (
            <motion.div
              initial='hidden'
              whileInView='show'
              viewport={viewportOpts}
              variants={gridVariants}
              className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10'
            >
              {Array.from({ length: 8 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <ShopCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : isError ? (
            <QueryErrorState
              title='Failed to load shops'
              onRetry={() => refetch()}
            />
          ) : shops.length > 0 ? (
            <>
              <motion.div
                initial='hidden'
                whileInView='show'
                viewport={viewportOpts}
                variants={gridVariants}
                className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-10'
              >
                {shops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </motion.div>

              {/* ── 5. Bottom bar ── */}
              <motion.div
                initial='hidden'
                whileInView='show'
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp}
                custom={0.2}
                className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-12'
              >
                <p className='text-xs text-muted-foreground tabular-nums'>
                  Showing{' '}
                  <span className='font-medium text-foreground'>
                    {from.toLocaleString()}–{to.toLocaleString()}
                  </span>{' '}
                  of{' '}
                  <span className='font-medium text-foreground'>
                    {total.toLocaleString()}
                  </span>{' '}
                  shops
                </p>

                {hasMore ? (
                  <Button
                    variant='outline'
                    size='sm'
                    className='gap-2 min-w-[140px]'
                    onClick={() => setPage((p) => p + 1)}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore && (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    )}
                    {isLoadingMore ? 'Loading…' : 'Load More Shops'}
                  </Button>
                ) : (
                  total > 0 && (
                    <p className='text-xs text-muted-foreground'>
                      You&rsquo;ve viewed all shops
                    </p>
                  )
                )}
              </motion.div>
            </>
          ) : (
            <motion.div
              initial='hidden'
              whileInView='show'
              viewport={viewportOpts}
              variants={fadeUp}
              custom={0.14}
              className='flex flex-col items-center justify-center py-20 gap-4 text-center mt-10'
            >
              <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
                <Store className='w-7 h-7 text-muted-foreground' />
              </div>
              <div>
                <p className='text-sm font-semibold'>
                  {hasActiveSearch ? 'No shops found' : 'No shops yet'}
                </p>
                <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                  {hasActiveSearch
                    ? `No shops matching "${debouncedSearch}". Try adjusting your search.`
                    : 'Shops will appear here once vendors join.'}
                </p>
              </div>
              {hasActiveSearch ? (
                <Button
                  size='sm'
                  variant='outline'
                  className='mt-2'
                  onClick={() => {
                    setSearch('');
                    setDebouncedSearch('');
                    setPage(1);
                  }}
                >
                  Clear Search
                </Button>
              ) : (
                <Button size='sm' asChild className='mt-2'>
                  <Link to='/'>Browse Home</Link>
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
