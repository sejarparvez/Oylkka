import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useAddToCartMutation } from '@/services/cart';
import { useAllProducts, useCompareProducts } from '@/services/product';

const MAX_COMPARE = 4;

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/compare')({
  component: ComparePage,
  validateSearch: (search: Record<string, string | undefined>) => ({
    ids: search.ids || '',
  }),
});

const specs = [
  { key: 'price', label: 'Price' },
  { key: 'discount', label: 'Discount' },
  { key: 'stock', label: 'Stock' },
  { key: 'brand', label: 'Brand' },
  { key: 'condition', label: 'Condition' },
  { key: 'category', label: 'Category' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'freeShipping', label: 'Free Shipping' },
  { key: 'rating', label: 'Rating' },
] as const;

function ComparePage() {
  const { ids } = Route.useSearch();
  const navigate = Route.useNavigate();
  const idList = ids
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, isLoading, isError, refetch } = useCompareProducts(idList);
  const addToCart = useAddToCartMutation();

  const products = data?.products ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: searchData,
    isError: searchError,
    refetch: refetchSearch,
  } = useAllProducts(
    { search: debouncedSearch || undefined, page: 1, limit: 8 },
    { enabled: debouncedSearch.length > 0 },
  );
  const searchResults = searchData?.products ?? [];

  const addProduct = (productId: string) => {
    if (idList.includes(productId)) return;
    if (idList.length >= MAX_COMPARE) return;
    navigate({ search: { ids: [...idList, productId].join(',') } });
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const removeProduct = (productId: string) => {
    const newIds = idList.filter((id) => id !== productId);
    navigate({ search: { ids: newIds.join(',') } });
  };

  const getValue = (product: (typeof products)[0], key: string) => {
    switch (key) {
      case 'price':
        return (
          <div className='flex items-baseline gap-1.5'>
            <span className='text-lg font-bold tabular-nums'>
              ৳{formatBDT(product.price)}
            </span>
            {product.discountPrice && (
              <span className='text-sm text-muted-foreground line-through tabular-nums'>
                ৳{formatBDT(product.discountPrice)}
              </span>
            )}
          </div>
        );
      case 'discount':
        return product.discountPercent ? (
          <span className='text-xs font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-md'>
            -{product.discountPercent}%
          </span>
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        );
      case 'stock':
        return product.stock > 0 ? (
          <span className='text-xs font-medium text-primary'>
            In Stock ({product.stock})
          </span>
        ) : (
          <span className='text-xs font-medium text-muted-foreground'>
            Out of Stock
          </span>
        );
      case 'brand':
        return (
          product.brand || <span className='text-muted-foreground'>—</span>
        );
      case 'condition':
        return product.condition.replace(/_/g, ' ');
      case 'category':
        return product.category?.name || '—';
      case 'vendor':
        return product.shop?.name || '—';
      case 'freeShipping':
        return product.freeShipping ? (
          <Check className='w-4 h-4 text-primary' />
        ) : (
          <X className='w-4 h-4 text-muted-foreground' />
        );
      case 'rating':
        return (
          <div className='flex items-center gap-1'>
            <Star className='w-3.5 h-3.5 text-amber-400 fill-amber-400' />
            <span className='text-xs text-muted-foreground'>
              ({product._count.reviews})
            </span>
          </div>
        );
      default:
        return '—';
    }
  };

  const showSearch = !isLoading && products.length < MAX_COMPARE;
  const isSearching = debouncedSearch.length > 0;

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
              Compare{' '}
              <span className='italic font-bold text-primary'>Products</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Compare features and prices side by side to make the best choice.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        {/* Search area */}
        {showSearch && (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.12}
            className={products.length >= 2 ? 'mb-12' : ''}
          >
            <div className='flex items-center gap-3 mb-6'>
              <div className='relative flex-1 max-w-md'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Search products to compare...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9 h-10 rounded-xl'
                />
              </div>
              {idList.length > 0 && (
                <span className='text-xs text-muted-foreground whitespace-nowrap'>
                  {idList.length} of {MAX_COMPARE} selected
                </span>
              )}
            </div>

            {/* Search results grid */}
            {isSearching && searchResults.length > 0 && (
              <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
                {searchResults.map((result, i) => {
                  const isSelected = idList.includes(result.id);
                  const isMaxed = idList.length >= MAX_COMPARE;
                  return (
                    <motion.div
                      key={result.id}
                      variants={fadeUp}
                      custom={i * 0.05}
                      initial='hidden'
                      animate='show'
                      className='rounded-xl border border-border overflow-hidden bg-card'
                    >
                      <div className='aspect-square bg-muted relative'>
                        {result.images?.[0]?.imageUrl ? (
                          <img
                            src={result.images[0].imageUrl}
                            alt={result.productName}
                            width={400}
                            height={400}
                            loading='lazy'
                            decoding='async'
                            className='object-cover w-full h-full'
                          />
                        ) : (
                          <div className='flex items-center justify-center w-full h-full'>
                            <Package className='w-6 h-6 text-muted-foreground' />
                          </div>
                        )}
                      </div>
                      <div className='p-3 space-y-2'>
                        <h4 className='text-xs font-semibold leading-snug line-clamp-2'>
                          {result.productName}
                        </h4>
                        <p className='text-sm font-bold tabular-nums'>
                          ৳{formatBDT(result.discountPrice ?? result.price)}
                        </p>
                        <Button
                          size='sm'
                          variant={isSelected ? 'secondary' : 'default'}
                          className='w-full h-7 text-xs gap-1'
                          onClick={() => addProduct(result.id)}
                          disabled={isSelected || (isMaxed && !isSelected)}
                        >
                          {isSelected ? (
                            <>
                              Added <Check className='w-3 h-3' />
                            </>
                          ) : (
                            <>
                              Compare <Plus className='w-3 h-3' />
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {isSearching && searchError && (
              <QueryErrorState
                title='Failed to search products'
                onRetry={() => refetchSearch()}
              />
            )}

            {isSearching && !searchError && searchResults.length === 0 && (
              <p className='text-sm text-muted-foreground text-center py-8'>
                No products found for &ldquo;{debouncedSearch}&rdquo;
              </p>
            )}

            {/* Empty prompt (no search query, no products selected) */}
            {!isSearching && idList.length < 2 && (
              <div className='flex flex-col items-center justify-center py-12 gap-3 text-center'>
                <div className='w-12 h-12 rounded-2xl bg-muted flex items-center justify-center'>
                  <Search className='w-5 h-5 text-muted-foreground' />
                </div>
                <p className='text-sm font-semibold'>
                  Search for products to compare
                </p>
                <p className='text-xs text-muted-foreground max-w-xs'>
                  Type a product name above to find and add up to 4 products for
                  comparison.
                </p>
              </div>
            )}

            {/* Filled prompt (no search query, some products selected) */}
            {!isSearching && idList.length >= 2 && (
              <p className='text-sm text-muted-foreground text-center py-4'>
                Search above to add more products to compare.
              </p>
            )}
          </motion.div>
        )}

        {/* Loading skeletons */}
        {idList.length >= 2 && isLoading && (
          <div className='space-y-4'>
            {Array.from({ length: 6 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <Skeleton key={i} className='h-12 w-full rounded-xl' />
            ))}
          </div>
        )}

        {isError && (
          <QueryErrorState
            title='Failed to load products'
            onRetry={() => refetch()}
          />
        )}

        {/* Products not found */}
        {idList.length > 1 && !isLoading && !isError && products.length < 2 && (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
            className='flex flex-col items-center justify-center py-12 gap-4 text-center'
          >
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
              <Package className='w-7 h-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>Products not found</p>
              <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
                Some products may be unpublished or invalid. Please check the
                IDs or search for different products above.
              </p>
            </div>
          </motion.div>
        )}

        {/* Comparison table */}
        {idList.length >= 2 && !isLoading && products.length >= 2 && (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.16}
          >
            <div className='overflow-x-auto scrollbar-none'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr>
                    <th className='text-left p-4 w-40' />
                    {products.map((product) => (
                      <th
                        key={product.id}
                        className='p-4 min-w-[200px] align-top relative'
                      >
                        <button
                          type='button'
                          onClick={() => removeProduct(product.id)}
                          className='absolute top-1 right-1 w-6 h-6 rounded-full bg-muted hover:bg-destructive/10 flex items-center justify-center transition-colors z-10'
                          aria-label='Remove from comparison'
                        >
                          <X className='w-3 h-3 text-muted-foreground hover:text-destructive' />
                        </button>
                        <Link
                          to='/product/$slug'
                          params={{ slug: product.slug }}
                          className='block'
                        >
                          <div className='relative aspect-square rounded-xl overflow-hidden bg-muted mb-3'>
                            {product.images?.[0]?.imageUrl ? (
                              <img
                                src={product.images[0].imageUrl}
                                alt={product.productName}
                                width={400}
                                height={400}
                                loading='lazy'
                                decoding='async'
                                className='object-cover w-full h-full'
                              />
                            ) : (
                              <div className='flex items-center justify-center w-full h-full'>
                                <Package className='w-8 h-8 text-muted-foreground' />
                              </div>
                            )}
                          </div>
                          <h3 className='text-sm font-semibold leading-snug line-clamp-2'>
                            {product.productName}
                          </h3>
                        </Link>
                        {/* FE-26: variant products have no resolvable
                            default variant, so their compare button is a
                            navigation to the PDP (same actor as
                            product-card.tsx). Plain products add to cart. */}
                        {product.hasVariants ? (
                          <Button
                            asChild
                            size='sm'
                            className='w-full mt-3 gap-1.5 h-8 text-xs'
                          >
                            <Link
                              to='/product/$slug'
                              params={{ slug: product.slug }}
                              className='inline-flex items-center justify-center gap-1.5'
                            >
                              <ShoppingCart className='w-3.5 h-3.5' />
                              Choose Options
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size='sm'
                            className='w-full mt-3 gap-1.5 h-8 text-xs'
                            onClick={() =>
                              addToCart.mutate({
                                productId: product.id,
                                quantity: 1,
                                variantId: undefined,
                              })
                            }
                            disabled={product.stock === 0}
                          >
                            <ShoppingCart className='w-3.5 h-3.5' />
                            {product.stock === 0
                              ? 'Out of Stock'
                              : 'Add to Cart'}
                          </Button>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.key} className='border-t border-border'>
                      <th
                        scope='row'
                        className='p-4 text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground'
                      >
                        {spec.label}
                      </th>
                      {products.map((product) => (
                        <td key={product.id} className='p-4 text-sm'>
                          {getValue(product, spec.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
