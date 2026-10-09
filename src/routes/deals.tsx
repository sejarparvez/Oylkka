import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
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

function DealsPage() {
  const [page, setPage] = useState(1);

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
              Deals<span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Discounted products from approved shops, updated as prices change.
            </p>
          </motion.div>
        </div>
      </div>

      {!isLoading && !isError && (data?.total ?? 0) > 0 && (
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 mb-8'>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.1}
            className='rounded-2xl border border-border bg-card px-6 py-4 flex items-center gap-3'
          >
            <Zap className='w-5 h-5 text-primary shrink-0' />
            <p className='text-sm font-medium'>
              {(data?.total ?? 0).toLocaleString()} discounted{' '}
              {(data?.total ?? 0) === 1 ? 'product' : 'products'} from approved
              shops
            </p>
          </motion.div>
        </div>
      )}

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
                Check back soon for new discounts.
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
