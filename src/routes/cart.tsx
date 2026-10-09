import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import Footer from '#/components/layout/footer';
import Header from '#/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT, toNumber } from '@/lib/currency';
import {
  type CartItem,
  useCart,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '@/services/cart';

export const Route = createFileRoute('/cart')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/auth/signin' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: cart, isLoading, isError } = useCart();
  const updateMutation = useUpdateCartItemMutation();
  const removeMutation = useRemoveCartItemMutation();

  if (isLoading) return <CartSkeleton />;
  if (isError || !cart) return <CartError />;
  if (cart.items.length === 0) return <CartEmpty />;

  const subtotal = cart.items.reduce((sum, item) => {
    const price = item.savedPrice ?? item.product.price;
    return sum + toNumber(price) * item.quantity;
  }, 0);

  const groupedByShop = cart.items.reduce<
    Record<
      string,
      { shop: { id: string; name: string; slug: string }; items: CartItem[] }
    >
  >((groups, item) => {
    const shop = item.product.shop;
    if (!shop) return groups;
    if (!groups[shop.id]) {
      groups[shop.id] = { shop, items: [] };
    }
    groups[shop.id].items.push(item);
    return groups;
  }, {});

  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='max-w-4xl mx-auto'>
          <h1 className='text-2xl font-bold mb-8'>Shopping Cart</h1>

          {Object.values(groupedByShop).map(({ shop, items }) => (
            <Card
              key={shop.id}
              className='rounded-2xl border-border shadow-none mb-6 p-6'
            >
              <Link
                to='/shop/$slug'
                params={{ slug: shop.slug }}
                className='text-base font-semibold hover:text-primary transition-colors mb-4 block'
              >
                {shop.name}
              </Link>
              <Separator className='mb-4' />
              <div className='space-y-4'>
                {items.map((item) => {
                  const price =
                    item.savedPrice ??
                    item.variant?.discountPrice ??
                    item.variant?.price ??
                    item.product.discountPrice ??
                    item.product.price;
                  const imageUrl =
                    item.variant?.imageUrl ?? item.product.images[0]?.imageUrl;
                  // Stock clamp: prefer the variant's own stock when a
                  // variant is selected (CUST-17).
                  const available = item.variant
                    ? item.variant.stock
                    : item.product.stock;
                  const outOfStock = available <= 0;
                  const atMax = item.quantity >= available;

                  return (
                    <div key={item.id} className='flex gap-4 py-2'>
                      <div className='w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0'>
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.product.productName}
                            width={80}
                            height={80}
                            loading='lazy'
                            decoding='async'
                            className='w-full h-full object-cover'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center'>
                            <ShoppingCart className='w-6 h-6 text-muted-foreground' />
                          </div>
                        )}
                      </div>

                      <div className='flex-1 min-w-0'>
                        <Link
                          to='/product/$slug'
                          params={{ slug: item.product.slug }}
                          className='text-sm font-medium hover:text-primary transition-colors line-clamp-2'
                        >
                          {item.product.productName}
                        </Link>
                        {item.variant && (
                          <p className='text-xs text-muted-foreground mt-0.5'>
                            {item.variant.name}
                          </p>
                        )}
                        <p className='text-sm font-semibold mt-1'>
                          ৳{formatBDT(price)}
                        </p>
                      </div>

                      <div className='flex items-center gap-3'>
                        <div className='flex items-center border border-border rounded-xl overflow-hidden'>
                          <button
                            type='button'
                            disabled={item.quantity <= 1 || outOfStock}
                            onClick={() =>
                              updateMutation.mutate({
                                itemId: item.id,
                                quantity: Math.max(1, item.quantity - 1),
                              })
                            }
                            className='w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40'
                          >
                            <Minus className='w-3 h-3' />
                          </button>
                          <span className='w-10 text-center text-sm font-semibold tabular-nums border-x border-border'>
                            {item.quantity}
                          </span>
                          <button
                            type='button'
                            disabled={atMax}
                            title={
                              atMax
                                ? `Only ${available} available`
                                : 'Increase quantity'
                            }
                            onClick={() =>
                              updateMutation.mutate({
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              })
                            }
                            className='w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-40'
                          >
                            <Plus className='w-3 h-3' />
                          </button>
                        </div>

                        {outOfStock && (
                          <span className='text-xs font-medium text-destructive'>
                            Out of stock
                          </span>
                        )}

                        <p className='text-sm font-semibold w-20 text-right tabular-nums'>
                          ৳ {formatBDT(toNumber(price) * item.quantity)}
                        </p>

                        <Button
                          variant='ghost'
                          size='icon'
                          className='text-muted-foreground hover:text-destructive'
                          onClick={() => removeMutation.mutate(item.id)}
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          <Card className='rounded-2xl border-border shadow-none p-6'>
            <div className='flex items-center justify-between text-base'>
              <span className='font-medium'>Subtotal</span>
              <span className='font-semibold tabular-nums'>
                ৳{formatBDT(subtotal)}
              </span>
            </div>
            <Separator className='my-4' />
            <p className='text-xs text-muted-foreground mb-4'>
              Shipping and taxes calculated at checkout
            </p>
            <Button
              size='lg'
              className='w-full h-12 text-base rounded-xl'
              onClick={() => navigate({ to: '/checkout' })}
            >
              Proceed to Checkout
            </Button>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}

function CartSkeleton() {
  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='max-w-4xl mx-auto space-y-6'>
          <Skeleton className='h-8 w-48' />
          {[1, 2].map((i) => (
            <Card key={i} className='rounded-2xl border-border shadow-none p-6'>
              <Skeleton className='h-5 w-32 mb-4' />
              <div className='space-y-4'>
                {[1, 2].map((j) => (
                  <div key={j} className='flex gap-4'>
                    <Skeleton className='w-20 h-20 rounded-xl shrink-0' />
                    <div className='flex-1 space-y-2'>
                      <Skeleton className='h-4 w-48' />
                      <Skeleton className='h-3 w-24' />
                      <Skeleton className='h-4 w-16' />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}

function CartEmpty() {
  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='max-w-md mx-auto text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4'>
            <ShoppingCart className='w-7 h-7 text-muted-foreground' />
          </div>
          <h2 className='text-sm font-semibold'>Your cart is empty</h2>
          <p className='text-sm text-muted-foreground mt-1 max-w-xs mx-auto'>
            Looks like you haven't added anything yet. Start browsing and find
            something you love!
          </p>
          <Link to='/products'>
            <Button className='mt-4'>Browse Products</Button>
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

function CartError() {
  return (
    <>
      <Header />
      <div className='container py-8 md:py-12'>
        <div className='max-w-md mx-auto text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4'>
            <ShoppingCart className='w-7 h-7 text-muted-foreground' />
          </div>
          <h2 className='text-sm font-semibold'>Something went wrong</h2>
          <p className='text-sm text-muted-foreground mt-1 max-w-xs mx-auto'>
            Could not load your cart. Please try again.
          </p>
          <Link to='/'>
            <Button variant='outline' className='mt-4 gap-2'>
              <ArrowLeft className='w-4 h-4' />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
