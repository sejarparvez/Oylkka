import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { ShopCard, ShopCardSkeleton } from '@/components/pages/shop/shop-card';
import { Button } from '@/components/ui/button';
import { usePublicShops } from '@/services/shop';

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

export default function VendorShowcase() {
  const { data, isLoading } = usePublicShops({ page: 1 });
  const shops = (data?.shops ?? []).slice(0, 4);

  if (!isLoading && shops.length === 0) return null;

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
                Our Sellers
              </span>
            </div>
            <h2 className='mt-4 text-3xl font-bold tracking-tight md:text-4xl'>
              Featured{' '}
              <span className='italic font-bold text-primary'>Vendors</span>
              <span className='text-primary'>.</span>
            </h2>
            <p className='mt-2 max-w-xl text-sm text-muted-foreground'>
              Trusted shops building their businesses on Oylkka.
            </p>
          </div>
          <Button
            variant='ghost'
            asChild
            className='hidden gap-2 text-primary sm:flex'
          >
            <Link to='/shops'>
              View all shops <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </motion.div>

        {isLoading ? (
          <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className='grid grid-cols-1 gap-5 sm:grid-cols-2'
          >
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </motion.div>
        )}

        <div className='mt-8 flex justify-center sm:hidden'>
          <Button variant='outline' asChild className='gap-2'>
            <Link to='/shops'>
              View all shops <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
