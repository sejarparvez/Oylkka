import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock, ShoppingBag } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/api-client';
import {
  clearRecentProducts,
  getRecentProductRefs,
  type RecentProductRef,
} from '@/lib/recently-viewed';

type RecentProduct = {
  id: string;
  slug: string;
  productName: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  image: string | null;
};

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

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
};

export const Route = createFileRoute('/recently-viewed')({
  component: RouteComponent,
});

function useRecentProducts(refs: RecentProductRef[]) {
  const ids = refs.map((r) => r.id).join(',');
  return useQuery<RecentProduct[]>({
    queryKey: ['recent-products', ids],
    enabled: refs.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const response = await apiClient.get<{ products: RecentProduct[] }>(
        `/api/product/public-recent?ids=${encodeURIComponent(ids)}`,
      );
      return response.data.products;
    },
  });
}

function RouteComponent() {
  const [refs, setRefs] = useState<RecentProductRef[]>([]);
  const { data: products, isLoading } = useRecentProducts(refs);

  useEffect(() => {
    setRefs(getRecentProductRefs());
  }, []);

  const clear = () => {
    clearRecentProducts();
    setRefs([]);
  };

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
              <Link to='/products'>
                <ArrowLeft className='w-3.5 h-3.5' /> Back to Products
              </Link>
            </Button>
          </motion.div>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.08}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Recently Viewed
              </span>
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Your{' '}
              <span className='italic font-bold text-primary'>Recently</span>{' '}
              Viewed
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Products you've browsed, ready to pick up right where you left
              off.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          {refs.length > 0 && (
            <motion.div
              initial='hidden'
              animate='show'
              variants={fadeUp}
              custom={0.12}
              className='flex justify-end mb-8'
            >
              <Button variant='outline' size='sm' onClick={clear}>
                Clear History
              </Button>
            </motion.div>
          )}

          {refs.length === 0 ? (
            <motion.div
              initial='hidden'
              animate='show'
              variants={fadeUp}
              custom={0.14}
              className='flex flex-col items-center justify-center py-20 gap-4 text-center'
            >
              <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
                <Clock className='w-7 h-7 text-muted-foreground' />
              </div>
              <div>
                <p className='text-sm font-semibold'>
                  No recently viewed items
                </p>
                <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                  Products you view will appear here.
                </p>
              </div>
              <Button size='sm' asChild className='mt-2'>
                <Link to='/products'>Browse Products</Link>
              </Button>
            </motion.div>
          ) : isLoading ? (
            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
              {Array.from({ length: Math.min(refs.length, 8) }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: loading skeleton
                <Skeleton key={i} className='aspect-[3/4] rounded-2xl' />
              ))}
            </div>
          ) : !products || products.length === 0 ? (
            <motion.div
              initial='hidden'
              animate='show'
              variants={fadeUp}
              custom={0.14}
              className='flex flex-col items-center justify-center py-20 gap-4 text-center'
            >
              <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
                <Clock className='w-7 h-7 text-muted-foreground' />
              </div>
              <div>
                <p className='text-sm font-semibold'>
                  No recently viewed items
                </p>
                <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                  Products you view will appear here.
                </p>
              </div>
              <Button size='sm' asChild className='mt-2'>
                <Link to='/products'>Browse Products</Link>
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial='hidden'
              animate='show'
              variants={stagger}
              className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
            >
              {products.map((item) => {
                const currentPrice = item.discountPrice ?? item.price;
                const onSale =
                  item.discountPrice != null && item.discountPrice < item.price;
                const outOfStock = item.stock <= 0;

                return (
                  <motion.div
                    key={item.id}
                    variants={cardVariants}
                    whileHover={{ y: -3 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  >
                    <Link
                      to='/product/$slug'
                      params={{ slug: item.slug }}
                      className='group block rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 transition-shadow duration-300'
                    >
                      <div className='relative overflow-hidden aspect-square bg-muted'>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
                            <ShoppingBag className='w-6 h-6' />
                          </div>
                        )}
                        {outOfStock && (
                          <span className='absolute top-2 left-2 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground'>
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className='p-4'>
                        <h3 className='text-sm font-semibold leading-snug line-clamp-2'>
                          {item.productName}
                        </h3>
                        <div className='flex items-center gap-2 mt-2'>
                          <p className='text-lg font-bold tabular-nums'>
                            BDT {currentPrice.toLocaleString()}
                          </p>
                          {onSale && (
                            <p className='text-xs text-muted-foreground line-through tabular-nums'>
                              {item.price.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
