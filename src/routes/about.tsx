import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  BadgeCheck,
  LayoutGrid,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { motion } from 'motion/react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { usePublicCategories } from '@/services/category';
import { useAllProducts } from '@/services/product';
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

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

// CONTENT-04: metrics are queried live on the page instead of hardcoded.
function formatCount(value: number | undefined) {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

const values = [
  {
    title: 'Trust & Transparency',
    desc: 'Every shop is reviewed before it can list. What you see is exactly what you get.',
  },
  {
    title: 'Quality First',
    desc: 'We curate our marketplace to ensure only the best products reach your doorstep.',
  },
  {
    title: 'Customer Centric',
    desc: 'Your satisfaction drives every decision we make — from easy returns to responsive support.',
  },
  {
    title: 'Empowering Vendors',
    desc: 'We provide local businesses and artisans with the tools to reach customers nationwide.',
  },
];

function AboutPage() {
  const { data: products } = useAllProducts({ page: 1, limit: 1 });
  const { data: shops } = usePublicShops({ page: 1 });
  const { data: categories } = usePublicCategories();

  const stats = [
    {
      value: formatCount(products?.total),
      label: 'Products',
      icon: ShoppingBag,
    },
    {
      value: formatCount(shops?.total),
      label: 'Approved Shops',
      icon: BadgeCheck,
    },
    {
      value: formatCount(categories?.length),
      label: 'Categories',
      icon: LayoutGrid,
    },
    { value: 'Nationwide', label: 'Delivery Coverage', icon: Truck },
  ];

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
              About{' '}
              <span className='italic font-bold text-primary'>Oylkka</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Connecting you with trusted vendors and quality products —
              delivering a seamless shopping experience across Bangladesh.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Our Story
              </span>
            </div>
            <h2 className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-6'>
              Our <span className='italic font-bold text-primary'>Story</span>
              <span className='text-primary'>.</span>
            </h2>
            <div className='max-w-3xl space-y-4'>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                Oylkka was born from a simple idea: make online shopping in
                Bangladesh trustworthy, convenient, and enjoyable. We saw a
                market filled with uncertainty — unclear product quality,
                unreliable sellers, and frustrating return processes.
              </p>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                Our platform reviews every shop before it can list, so when you
                shop on Oylkka you are buying from sellers committed to quality.
                From electronics to fashion, home essentials to artisan crafts,
                we bring the best of Bangladesh commerce to your fingertips.
              </p>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                Today, Oylkka connects customers across the country with
                approved shops, with a commitment to making every purchase a
                delight.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0}>
              <div className='flex items-center gap-3 mb-4'>
                <div className='h-px w-8 bg-primary' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                  By the Numbers
                </span>
              </div>
              <h2 className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-12'>
                Oylkka in{' '}
                <span className='italic font-bold text-primary'>Numbers</span>
                <span className='text-primary'>.</span>
              </h2>
            </motion.div>

            <div className='grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border'>
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={0}
                  className='py-8 px-6 flex flex-col items-center justify-center gap-2'
                >
                  <p className='text-3xl md:text-4xl font-bold tabular-nums text-primary'>
                    {stat.value}
                  </p>
                  <div className='flex items-center gap-1.5'>
                    <stat.icon className='w-3.5 h-3.5 text-muted-foreground' />
                    <p className='text-xs text-muted-foreground tracking-wide uppercase font-medium'>
                      {stat.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} custom={0}>
              <div className='flex items-center gap-3 mb-4'>
                <div className='h-px w-8 bg-primary' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                  What We Believe
                </span>
              </div>
              <h2 className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-12'>
                Our{' '}
                <span className='italic font-bold text-primary'>Values</span>
                <span className='text-primary'>.</span>
              </h2>
            </motion.div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-5'>
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  variants={fadeUp}
                  custom={0}
                  className='rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors duration-300'
                >
                  <h3 className='text-sm font-semibold mb-2'>{value.title}</h3>
                  <p className='text-sm leading-relaxed text-muted-foreground'>
                    {value.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
            className='text-center'
          >
            <h2 className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-4'>
              Ready to{' '}
              <span className='italic font-bold text-primary'>Shop</span>
              <span className='text-primary'>?</span>
            </h2>
            <p className='text-sm text-muted-foreground mb-6 max-w-md mx-auto'>
              Discover approved shops and quality products delivered to your
              door.
            </p>
            <Button size='lg' asChild>
              <Link to='/products'>Start Shopping</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
