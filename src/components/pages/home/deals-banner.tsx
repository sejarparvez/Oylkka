import { Link } from '@tanstack/react-router';
import { BadgePercent, Zap } from 'lucide-react';
import { motion } from 'motion/react';
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

export default function DealsBanner() {
  const { data } = useAllProducts({ hasDiscount: true, page: 1, limit: 1 });
  const dealCount = data?.total ?? 0;

  return (
    <section className='border-b border-border py-16 md:py-24'>
      <div className='container mx-auto px-2 md:px-4'>
        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
          className='flex flex-col gap-4 rounded-2xl bg-primary px-6 py-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:py-8 sm:px-10'
        >
          <div className='flex items-center gap-4'>
            <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15'>
              <BadgePercent className='h-6 w-6' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <Zap className='h-4 w-4' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase'>
                  Limited Time
                </span>
              </div>
              <h2 className='mt-1 text-xl font-bold tracking-tight sm:text-2xl'>
                Deals & Discounts
              </h2>
              <p className='mt-1 text-sm text-primary-foreground/80'>
                {dealCount > 0
                  ? `${dealCount.toLocaleString()} product${
                      dealCount !== 1 ? 's' : ''
                    } marked down right now.`
                  : 'Save more across the marketplace.'}
              </p>
            </div>
          </div>
          <Button
            asChild
            size='lg'
            variant='secondary'
            className='shrink-0 gap-2'
          >
            <Link to='/deals'>
              Shop Deals <Zap className='h-4 w-4' />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
