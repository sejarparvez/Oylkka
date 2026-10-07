import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  PackageX,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePublicCategories } from '@/services/category';
import { type ProductSortOption, useAllProducts } from '@/services/product';

// ── Shared animation constants ──

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: EASE, delay },
  }),
};

// ── Route definition ──

type ProductSearch = {
  search?: string;
  category?: string;
};

export const Route = createFileRoute('/products')({
  validateSearch: (
    search: Record<string, string | undefined>,
  ): ProductSearch => ({
    search: search.search || undefined,
    category: search.category || undefined,
  }),
  component: RouteComponent,
});

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const ITEMS_PER_PAGE = 20;

// ── Component ──

function RouteComponent() {
  const navigate = useNavigate();
  const { search: searchQuery, category: categoryQuery } = Route.useSearch();

  const [sort, setSort] = useState<ProductSortOption>('newest');
  const [page, setPage] = useState(1);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    categoryQuery,
  );

  // Re-sync when the URL `category` param changes (back/forward, external links)
  useEffect(() => {
    setActiveCategory(categoryQuery);
    setPage(1);
  }, [categoryQuery]);

  const sectionRef = useRef<HTMLDivElement>(null);

  const { data: listData, isLoading, isError, refetch } = useAllProducts({
    sort,
    page,
    limit: ITEMS_PER_PAGE,
    category: activeCategory,
    search: searchQuery,
  });

  const { data: categories } = usePublicCategories();

  const products = listData?.products ?? [];
  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;
  const hasActiveSearch = !!searchQuery;
  const hasActiveFilter = hasActiveSearch || !!activeCategory;

  // ── Event handlers ──

  const handleCategoryChange = (slug: string | undefined) => {
    setActiveCategory(slug);
    setPage(1);
  };

  const handleClearSearch = () => {
    const params: Record<string, string> = {};
    if (activeCategory) params.category = activeCategory;
    navigate({ to: '/products', search: params });
  };

  const handleClearAll = () => {
    navigate({ to: '/products', search: {} });
    setActiveCategory(undefined);
    setPage(1);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Newest';

  const from = (page - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(page * ITEMS_PER_PAGE, total);

  // Page-number window: up to 5 pages centered on the current page,
  // clamped to 1..totalPages so the active page is always visible.
  const pageWindowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
  const pageNumbers = Array.from(
    { length: Math.max(pageWindowEnd - pageWindowStart + 1, 0) },
    (_, i) => pageWindowStart + i,
  );

  // ── Sort dropdown (reusable) ──

  const sortDropdown = (
    <div className='flex items-center gap-2'>
      <ArrowUpDown className='w-4 h-4 text-muted-foreground shrink-0' />
      <Select
        value={sort}
        onValueChange={(value) => {
          setSort(value as ProductSortOption);
          setPage(1);
        }}
      >
        <SelectTrigger className='w-[170px] h-9 rounded-lg border-border text-sm'>
          <SelectValue>{currentSortLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <div
        ref={sectionRef}
        className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'
      >
        {/* ════════════════════════════════════════
            1. Eyebrow + Heading
           ════════════════════════════════════════ */}
        <motion.div
          initial='hidden'
          animate='show'
          variants={fadeUp}
          custom={0}
          className='mb-6'
        >
          <div className='flex items-center gap-3 mb-3'>
            <div className='h-px w-8 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              {hasActiveSearch ? 'Search Results' : 'Browse'}
            </span>
            <span className='text-xs text-muted-foreground tabular-nums'>
              {isLoading ? (
                <span className='animate-pulse'>Loading…</span>
              ) : (
                `${total.toLocaleString()} product${total !== 1 ? 's' : ''}`
              )}
            </span>
          </div>

          <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
            {hasActiveSearch ? (
              <>
                Results for{' '}
                <span className='italic font-bold text-primary'>
                  &ldquo;{searchQuery}&rdquo;
                </span>
                <span className='text-primary'>.</span>
              </>
            ) : (
              <>
                All{' '}
                <span className='italic font-bold text-primary'>Products</span>
                <span className='text-primary'>.</span>
              </>
            )}
          </h2>
        </motion.div>

        {/* ════════════════════════════════════════
            2. Category pills
           ════════════════════════════════════════ */}
        {categories && categories.length > 0 && (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.06}
            className='flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap mb-6'
          >
            <button
              type='button'
              onClick={() => handleCategoryChange(undefined)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 shrink-0 ${
                !activeCategory
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                type='button'
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 shrink-0 ${
                  activeCategory === cat.slug
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50 hover:text-primary'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            3. Filter bar (only when filters active)
           ════════════════════════════════════════ */}
        {hasActiveFilter ? (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.1}
            className='flex items-center gap-2 flex-wrap mb-6 pb-4 border-b border-border'
          >
            {/* Search chip */}
            {searchQuery && (
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20'>
                <Search className='w-3 h-3' />
                &ldquo;{searchQuery}&rdquo;
                <button
                  type='button'
                  onClick={handleClearSearch}
                  className='hover:bg-primary/20 rounded-full p-0.5 transition-colors'
                >
                  <X size={14} />
                  <span className='sr-only'>Clear search</span>
                </button>
              </span>
            )}

            {/* Category chip */}
            {activeCategory && (
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-border'>
                {categories?.find((c) => c.slug === activeCategory)?.name ??
                  activeCategory}
                <button
                  type='button'
                  onClick={() => handleCategoryChange(undefined)}
                  className='hover:bg-muted rounded-full p-0.5 transition-colors'
                >
                  <X size={14} />
                  <span className='sr-only'>Remove category</span>
                </button>
              </span>
            )}

            {/* Spacer */}
            <div className='flex-1 min-w-4' />

            {/* Clear all */}
            <button
              type='button'
              onClick={handleClearAll}
              className='text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 mr-2 shrink-0'
            >
              Clear all
            </button>

            {/* Sort — with border separator on desktop */}
            <div className='border-l border-border pl-3 ml-1 shrink-0 hidden sm:block'>
              {sortDropdown}
            </div>
          </motion.div>
        ) : (
          /* ── No filters: standalone sort row ── */
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.1}
            className='flex justify-end items-center mb-6 pb-4 border-b border-border'
          >
            {sortDropdown}
          </motion.div>
        )}

        {/* Mobile sort — shown separately on small screens */}
        {hasActiveFilter && (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.12}
            className='flex sm:hidden justify-end items-center mb-6 -mt-3'
          >
            {sortDropdown}
          </motion.div>
        )}

        {/* ════════════════════════════════════════
            4. Product grid
           ════════════════════════════════════════ */}
        {isLoading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState
            title='Failed to load products'
            onRetry={() => refetch()}
          />
        ) : products.length > 0 ? (
          <>
            <motion.div
              initial='hidden'
              animate='show'
              variants={stagger}
              className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
            >
              {products.map((product) => (
                <motion.div key={product.id} variants={cardFadeUp}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <motion.div
                initial='hidden'
                animate='show'
                variants={fadeUp}
                custom={0.14}
                className='flex flex-col sm:flex-row items-center justify-center gap-4 mt-12'
              >
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => handlePageChange(page - 1)}
                    className='gap-1'
                  >
                    <ChevronLeft className='w-4 h-4' />
                    <span className='hidden sm:inline'>Previous</span>
                  </Button>

                  <div className='flex items-center gap-1'>
                    {pageNumbers.map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size='sm'
                        className='w-9 h-9 p-0 tabular-nums'
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    ))}
                    {pageWindowEnd < totalPages && (
                      <span className='text-sm text-muted-foreground px-1'>
                        …
                      </span>
                    )}
                    {pageWindowEnd < totalPages && (
                      <Button
                        variant={page === totalPages ? 'default' : 'outline'}
                        size='sm'
                        className='w-9 h-9 p-0 tabular-nums'
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    )}
                  </div>

                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= totalPages}
                    onClick={() => handlePageChange(page + 1)}
                    className='gap-1'
                  >
                    <span className='hidden sm:inline'>Next</span>
                    <ChevronRight className='w-4 h-4' />
                  </Button>
                </div>

                <span className='text-xs text-muted-foreground tabular-nums sm:ml-2'>
                  {from.toLocaleString()} {'\u2013'} {to.toLocaleString()} of{' '}
                  {total.toLocaleString()}
                </span>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.14}
            className='flex flex-col items-center justify-center py-20 gap-4 text-center'
          >
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <PackageX className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>No products found</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                {hasActiveSearch
                  ? `No results for "${searchQuery}". Try adjusting your search or filters.`
                  : activeCategory
                    ? 'No products in this category yet. Try a different category.'
                    : 'No products available yet. Check back soon!'}
              </p>
            </div>
            <Button size='sm' asChild className='mt-2'>
              <Link to='/'>Browse Home</Link>
            </Button>
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
