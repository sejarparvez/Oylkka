import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, LogIn, PackageSearch, Search, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Route as RootRoute } from '@/routes/__root';
import { useMyOrders } from '@/services/order';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'CONFIRMED':
      return { variant: 'outline' as const, label: 'Confirmed' };
    case 'PROCESSING':
      return { variant: 'default' as const, label: 'Processing' };
    case 'SHIPPED':
      return { variant: 'default' as const, label: 'Shipped' };
    case 'DELIVERED':
      return { variant: 'default' as const, label: 'Delivered' };
    case 'CANCELLED':
      return { variant: 'destructive' as const, label: 'Cancelled' };
    case 'REFUNDED':
      return { variant: 'destructive' as const, label: 'Refunded' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export const Route = createFileRoute('/tracking')({
  component: TrackingPage,
});

function TrackingPage() {
  const { user } = RootRoute.useRouteContext();
  const [search, setSearch] = useState('');

  const { data: orders, isLoading, isError, refetch } = useMyOrders();

  const filtered = useMemo(() => {
    const list = orders ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((order) => order.orderNumber.toLowerCase().includes(q));
  }, [orders, search]);

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
                Order Tracking
              </span>
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Track your{' '}
              <span className='italic font-bold text-primary'>order</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Look up an order to see its current status and shipment progress.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        {!user ? (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
            className='flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center'
          >
            <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
              <Truck className='h-7 w-7 text-muted-foreground' />
            </div>
            <div>
              <p className='text-sm font-semibold'>Sign in to track orders</p>
              <p className='mt-1 max-w-xs text-sm text-muted-foreground'>
                For your security, order tracking is only available to the
                account that placed the order.
              </p>
            </div>
            <Button asChild className='mt-2 gap-2'>
              <Link to='/auth/signin'>
                <LogIn className='h-4 w-4' /> Sign In
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
          >
            <div className='relative mb-8'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                placeholder='Search by order number…'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='h-11 rounded-xl pl-9'
              />
            </div>

            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-20 w-full rounded-2xl' />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState
                title='Failed to load your orders'
                onRetry={() => refetch()}
              />
            ) : filtered.length > 0 ? (
              <div className='space-y-3'>
                {filtered.map((order) => {
                  const badge = statusBadge(order.status);
                  return (
                    <Link
                      key={order.id}
                      to='/dashboard/orders/$orderId'
                      params={{ orderId: order.id }}
                      className='flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/40'
                    >
                      <div className='flex min-w-0 items-center gap-4'>
                        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
                          <PackageSearch className='h-5 w-5 text-primary' />
                        </div>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold'>
                            {order.orderNumber}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {new Date(order.createdAt).toLocaleDateString()} ·{' '}
                            {order.itemCount} item
                            {order.itemCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className='flex shrink-0 flex-col items-end gap-1'>
                        <Badge
                          variant={badge.variant}
                          className='text-[10px] uppercase'
                        >
                          {badge.label}
                        </Badge>
                        <span className='text-xs text-muted-foreground'>
                          View tracking →
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
                <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
                  <PackageSearch className='h-7 w-7 text-muted-foreground' />
                </div>
                <div>
                  <p className='text-sm font-semibold'>No orders found</p>
                  <p className='mt-1 max-w-xs text-sm text-muted-foreground'>
                    {search.trim()
                      ? `No order matches "${search.trim()}".`
                      : 'You have not placed any orders yet.'}
                  </p>
                </div>
                <Button size='sm' asChild className='mt-2'>
                  <Link to='/shops'>Start Shopping</Link>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
