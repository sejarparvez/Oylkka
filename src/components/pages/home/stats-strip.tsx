import { LayoutGrid, Package, RefreshCw, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { usePublicCategories } from '@/services/category';
import { useAllProducts } from '@/services/product';
import { usePublicSettings } from '@/services/public-settings';
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

function formatCount(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

export default function StatsStrip() {
  const { data: products } = useAllProducts({ page: 1, limit: 1 });
  const { data: shops } = usePublicShops({ page: 1 });
  const { data: categories } = usePublicCategories();
  const { data: settings } = usePublicSettings();

  const returnWindow =
    settings?.return_window_days ?? String(RETURN_WINDOW_DAYS);

  const stats = [
    {
      icon: Package,
      value: formatCount(products?.total),
      label: 'Products',
    },
    {
      icon: Store,
      value: formatCount(shops?.total),
      label: 'Verified Vendors',
    },
    {
      icon: LayoutGrid,
      value: formatCount(categories?.length),
      label: 'Categories',
    },
    {
      icon: RefreshCw,
      value: returnWindow,
      label: 'Day Returns',
    },
  ];

  return (
    <section className='border-y border-border bg-muted/30'>
      <div className='container mx-auto px-2 md:px-4'>
        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
          className='grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0'
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className='px-6 py-8 text-center'>
                <p className='text-3xl font-bold tabular-nums text-primary md:text-4xl'>
                  {stat.value}
                </p>
                <p className='mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground'>
                  <Icon className='h-3.5 w-3.5 text-primary/70' />
                  {stat.label}
                </p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
