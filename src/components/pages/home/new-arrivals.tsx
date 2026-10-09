import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
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

const cardFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: EASE, delay },
  }),
};

export default function NewArrivalsSection() {
  const { data, isLoading } = useAllProducts({
    sort: 'newest',
    page: 1,
    limit: 8,
  });

  const products = data?.products ?? [];

  if (!isLoading && products.length === 0) return null;

  return (
    <section className='border-b border-border py-16 md:py-24'>
      <div className='container mx-auto px-2 md:px-4'>
        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
          className='mb-10 flex items-end justify-between gap-4'
        >
          <div>
            <div className='flex items-center gap-3'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Just In
              </span>
            </div>
            <h2 className='mt-4 text-3xl font-bold tracking-tight md:text-4xl'>
              New{' '}
              <span className='italic font-bold text-primary'>Arrivals</span>
              <span className='text-primary'>.</span>
            </h2>
            <p className='mt-2 max-w-xl text-sm text-muted-foreground'>
              The freshest finds from our vendors, added this week.
            </p>
          </div>
          <Button
            variant='ghost'
            asChild
            className='hidden gap-2 text-primary sm:flex'
          >
            <Link to='/new-arrivals'>
              View all <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </motion.div>

        {isLoading ? (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'>
            {Array.from({ length: 8 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={cardFadeUp}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className='mt-8 flex justify-center sm:hidden'>
          <Button variant='outline' asChild className='gap-2'>
            <Link to='/new-arrivals'>
              View all <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
