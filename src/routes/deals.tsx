import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { useAllProducts } from '@/services/product';

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

export const Route = createFileRoute('/deals')({
  component: DealsPage,
});

// The countdown must render identically on server and first client pass (FE-08).
// Seed at 0, compute the real deadline only after mount; a real campaign-backed
// deadline (from a loader) is tracked under CONTENT-07 instead.
const DEAL_DURATION_MS = 47 * 60 * 60 * 1000;

function useCountdown(durationMs: number) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const deadline = Date.now() + durationMs;
    const tick = () =>
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [durationMs]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  return { hours, minutes, seconds };
}

function DealsPage() {
  const [page, setPage] = useState(1);
  const { hours, minutes, seconds } = useCountdown(DEAL_DURATION_MS);

  const { data, isLoading, isError, refetch } = useAllProducts({
    sort: 'newest',
    page,
    limit: 20,
    hasDiscount: true,
  });

  const products = data?.products ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
          >
            <Button
              variant='ghost'
              size='sm'
              asChild
              className='mb-8 gap-2 text-primary'
            >
              <Link to='/'>
                <ArrowLeft className='w-3.5 h-3.5' /> Back to Home
              </Link>
            </Button>
          </motion.div>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.08}
          >
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Flash <span className='italic font-bold text-primary'>Deals</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Limited-time discounts from verified vendors. Grab them before
              they are gone.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8'>
        <motion.div
          initial='hidden'
          animate='show'
          variants={fadeUp}
          custom={0.1}
          className='rounded-2xl bg-primary px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'
        >
          <div className='flex items-center gap-3'>
            <Zap className='w-5 h-5 text-primary-foreground shrink-0' />
            <div>
              <p className='text-sm font-bold text-primary-foreground'>
                Flash Sale — Up to 60% off
              </p>
              <p className='text-xs text-primary-foreground/70 mt-0.5'>
                Verify vendors only · Deals refresh every hour
              </p>
            </div>
          </div>

          <div className='flex items-center gap-1.5 shrink-0'>
            <div className='flex items-center gap-1.5'>
              {[
                { value: hours, label: 'HRS' },
                { value: minutes, label: 'MIN' },
                { value: seconds, label: 'SEC' },
              ].map(({ value, label }, i) => (
                <div key={label} className='flex items-center gap-1.5'>
                  {i > 0 && (
                    <span className='text-primary-foreground/50 font-bold text-sm mb-3'>
                      :
                    </span>
                  )}
                  <div className='flex flex-col items-center bg-black/20 rounded-lg px-2.5 py-1.5'>
                    <span className='text-lg font-bold tabular-nums text-primary-foreground leading-none'>
                      {String(value).padStart(2, '0')}
                    </span>
                    <span className='text-[9px] text-primary-foreground/60 tracking-wider mt-0.5'>
                      {label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 pt-8'>
        {isLoading ? (
          <motion.div
            initial='hidden'
            animate='show'
            variants={stagger}
            className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
          >
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <motion.div key={i} variants={fadeUp} custom={0}>
                <ProductCardSkeleton />
              </motion.div>
            ))}
          </motion.div>
        ) : isError ? (
          <QueryErrorState
            title='Failed to load deals'
            onRetry={() => refetch()}
          />
        ) : products.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <Zap className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>No deals right now</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                Check back soon for new flash deals and discounts.
              </p>
            </div>
            <Button size='sm' asChild className='mt-2'>
              <Link to='/products'>Browse All Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <motion.div
              initial='hidden'
              animate='show'
              variants={stagger}
              className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'
            >
              {products.map((product) => (
                <motion.div key={product.id} variants={fadeUp} custom={0}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className='flex items-center justify-center gap-3 mt-12'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className='text-xs text-muted-foreground tabular-nums'>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
