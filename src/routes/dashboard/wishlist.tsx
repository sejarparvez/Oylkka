import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddToCartMutation } from '@/services/cart';
import {
  useRemoveFromWishlistMutation,
  useWishlist,
  type WishlistItem,
} from '@/services/wishlist';

const PAGE_SIZE = 12;

export const Route = createFileRoute('/dashboard/wishlist')({
  component: WishlistPage,
});

function WishlistPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useWishlist({ page, pageSize: PAGE_SIZE });
  const removeMutation = useRemoveFromWishlistMutation();
  const addToCartMutation = useAddToCartMutation();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleMoveToCart = (item: WishlistItem) => {
    addToCartMutation.mutate(
      {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: 1,
      },
      {
        onSuccess: () => {
          removeMutation.mutate({
            productId: item.productId,
            variantId: item.variantId ?? undefined,
          });
        },
      },
    );
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>My Wishlist</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Products you've saved for later
        </p>
      </div>

      {isLoading && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: loading skeleton
            <Skeleton key={i} className='h-64 rounded-2xl' />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Heart className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>Your wishlist is empty</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Save your favorite products here to buy them later
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/products'>Browse Products</Link>
          </Button>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {items.map((item) => {
              // One price basis per level (CUST-11): a variant's price only
              // ever compares against that variant's own price, never the
              // parent product's.
              const basePrice = item.variant
                ? item.variant.price
                : item.product.price;
              const discountPrice = item.variant
                ? item.variant.discountPrice
                : item.product.discountPrice;
              const currentPrice = discountPrice ?? basePrice;
              const onSale = discountPrice != null && discountPrice < basePrice;
              const available = item.variant
                ? item.variant.stock
                : item.product.stock;
              const outOfStock = available <= 0;

              return (
                <Card
                  key={item.id}
                  className='rounded-2xl border-border shadow-none overflow-hidden group cursor-pointer'
                  onClick={() =>
                    navigate({ to: `/product/${item.product.slug}` } as never)
                  }
                >
                  <div className='aspect-square bg-muted relative overflow-hidden'>
                    {item.product.images[0]?.imageUrl ? (
                      <img
                        src={item.product.images[0].imageUrl}
                        alt={item.product.productName}
                        className='h-full w-full object-cover group-hover:scale-105 transition-transform duration-300'
                      />
                    ) : (
                      <div className='h-full w-full flex items-center justify-center'>
                        <ShoppingBag className='h-10 w-10 text-muted-foreground/40' />
                      </div>
                    )}
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMutation.mutate({
                          productId: item.productId,
                          variantId: item.variantId ?? undefined,
                        });
                      }}
                      className='absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                  <CardContent className='p-4 space-y-2'>
                    <p className='text-sm font-semibold truncate'>
                      {item.product.productName}
                    </p>
                    {item.variant && (
                      <p className='text-xs text-muted-foreground'>
                        {item.variant.name}
                      </p>
                    )}
                    <div className='flex items-center gap-2'>
                      <span className='text-base font-bold'>
                        ৳{currentPrice.toLocaleString('en-BD')}
                      </span>
                      {onSale && (
                        <span className='text-xs text-muted-foreground line-through'>
                          ৳{basePrice.toLocaleString('en-BD')}
                        </span>
                      )}
                    </div>
                    {outOfStock ? (
                      <p className='text-xs font-medium text-destructive'>
                        Out of stock
                      </p>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full gap-2'
                        disabled={addToCartMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToCart(item);
                        }}
                      >
                        {addToCartMutation.isPending ? (
                          <Loader2 className='w-3.5 h-3.5 animate-spin' />
                        ) : (
                          <ShoppingBag className='w-3.5 h-3.5' />
                        )}
                        Move to Cart
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-3'>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className='w-4 h-4' />
                Previous
              </Button>
              <span className='text-sm text-muted-foreground tabular-nums'>
                Page {page} of {totalPages}
              </span>
              <Button
                variant='outline'
                size='sm'
                className='gap-1'
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className='w-4 h-4' />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
