import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, PackageX, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { useBestsellers } from '@/services/product';

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

export const Route = createFileRoute('/bestsellers')({
  component: BestsellersPage,
});

function BestsellersPage() {
  const { data: products, isLoading, isError, refetch } = useBestsellers(24);

  const list = products ?? [];

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
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Most Loved
              </span>
              <TrendingUp className='w-3.5 h-3.5 text-primary' />
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Best<span className='italic font-bold text-primary'>sellers</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              The products our customers keep coming back for — ranked by units
              sold across verified vendors.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        {isLoading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {Array.from({ length: 8 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState
            title='Failed to load bestsellers'
            onRetry={() => refetch()}
          />
        ) : list.length > 0 ? (
          <motion.div
            initial='hidden'
            animate='show'
            variants={stagger}
            className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
          >
            {list.map((product) => (
              <motion.div key={product.id} variants={cardFadeUp}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
            className='flex flex-col items-center justify-center py-20 gap-4 text-center'
          >
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <PackageX className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>No bestsellers yet</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                Once customers start buying, the top products will show up here.
              </p>
            </div>
            <Button size='sm' asChild className='mt-2'>
              <Link to='/products'>Browse All Products</Link>
            </Button>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
