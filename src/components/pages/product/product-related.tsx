import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { useCategoryProducts } from '@/services/product';

type ProductRelatedProps = {
  categorySlug: string;
  currentProductId: string;
};

export function ProductRelated({
  categorySlug,
  currentProductId,
}: ProductRelatedProps) {
  const { data: products, isLoading, isError, refetch } = useCategoryProducts(
    categorySlug,
  );

  const related = (products ?? [])
    .filter((p) => p.id !== currentProductId)
    .slice(0, 5);

  if (isError)
    return (
      <QueryErrorState
        title='Failed to load related products'
        onRetry={() => refetch()}
      />
    );

  if (!isLoading && related.length === 0) return null;

  return (
    <motion.div
      initial='hidden'
      whileInView='show'
      viewport={{ once: true, margin: '-80px' }}
    >
      <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
        <div>
          <div className='flex items-center gap-3 mb-3'>
            <div className='h-px w-8 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              You May Also Like
            </span>
          </div>
          <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
            Related{' '}
            <span className='italic font-bold text-primary'>Products</span>
            <span className='text-primary'>.</span>
          </h2>
        </div>
        <Button
          variant='ghost'
          size='sm'
          asChild
          className='text-primary gap-1 self-start sm:self-auto'
        >
          <Link to='/products/category/$slug' params={{ slug: categorySlug }}>
            View all <ArrowRight className='w-3.5 h-3.5' />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
          {related.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </motion.div>
  );
}
