import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCategories } from '@/services/category';

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

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
});

function CategoriesPage() {
  const {
    data: categories,
    isLoading,
    isError,
    refetch,
  } = usePublicCategories();

  const list = categories ?? [];

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
                Browse
              </span>
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Shop by{' '}
              <span className='italic font-bold text-primary'>Category</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Find exactly what you are looking for across every department,
              from fashion and electronics to home and beauty.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        {isLoading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'>
            {Array.from({ length: 8 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <Skeleton key={i} className='h-48 rounded-2xl' />
            ))}
          </div>
        ) : isError ? (
          <QueryErrorState
            title='Failed to load categories'
            onRetry={() => refetch()}
          />
        ) : list.length > 0 ? (
          <motion.div
            initial='hidden'
            animate='show'
            variants={stagger}
            className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
          >
            {list.map((category) => (
              <motion.div key={category.id} variants={cardFadeUp}>
                <Link
                  to='/products/category/$slug'
                  params={{ slug: category.slug }}
                  className='group flex h-full flex-col rounded-2xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/30'
                >
                  <div className='relative aspect-[4/3] bg-muted overflow-hidden'>
                    {category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        width={800}
                        height={600}
                        loading='lazy'
                        decoding='async'
                        className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center'>
                        <ImageIcon className='h-10 w-10 text-primary/20' />
                      </div>
                    )}
                  </div>
                  <div className='flex flex-1 flex-col gap-1 p-4'>
                    <div className='flex items-center justify-between gap-2'>
                      <h2 className='text-sm font-semibold'>{category.name}</h2>
                      <ArrowRight className='h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary' />
                    </div>
                    {category.description && (
                      <p className='text-xs text-muted-foreground line-clamp-2'>
                        {category.description}
                      </p>
                    )}
                  </div>
                </Link>
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
              <ImageIcon className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>No categories yet</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                Categories will appear here once the catalog is set up.
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
