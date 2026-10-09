import { createFileRoute, Link } from '@tanstack/react-router';
import { PackageX } from 'lucide-react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import {
  ProductCard,
  ProductCardSkeleton,
} from '@/components/pages/shop/product-card';
import { Button } from '@/components/ui/button';
import { useCategoryProducts } from '@/services/product';

export const Route = createFileRoute('/products/category/$slug')({
  component: RouteComponent,
});

function formatSlug(slug: string) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function RouteComponent() {
  const { slug } = Route.useParams();
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useCategoryProducts(slug);

  // CONTENT-18: prefer the real category name the API returns; only fall back
  // to prettifying the slug while the request is in flight.
  const categoryName = products?.[0]?.category?.name ?? formatSlug(slug);

  return (
    <div>
      <Header />
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
          <div>
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Category
              </span>
            </div>
            <h2 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
              {categoryName}
              <span className='text-primary'>.</span>
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <PackageX className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>Failed to load products</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                Something went wrong loading this category. Please try again.
              </p>
            </div>
            <Button
              size='sm'
              variant='outline'
              onClick={() => refetch()}
              className='mt-2'
            >
              Try Again
            </Button>
          </div>
        ) : products && products.length > 0 ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <PackageX className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>No products found</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                There are no products in{' '}
                <span className='font-medium'>{categoryName}</span> yet. Check
                back soon!
              </p>
            </div>
            <Button size='sm' asChild className='mt-2'>
              <Link to='/'>Browse Home</Link>
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
