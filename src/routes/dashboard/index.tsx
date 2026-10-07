import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyOrders } from '@/services/order';
import { useWishlist } from '@/services/wishlist';

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

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
});

const quickLinks = [
  {
    title: 'Browse Shop',
    description: 'Discover new products',
    icon: ShoppingBag,
    to: '/shops',
    color: 'text-blue-600',
  },
  {
    title: 'My Orders',
    description: 'Track your purchases',
    icon: Package,
    to: '/dashboard/orders',
    color: 'text-emerald-600',
  },
  {
    title: 'Wishlist',
    description: 'View saved items',
    icon: Heart,
    to: '/dashboard/wishlist',
    color: 'text-rose-600',
  },
  {
    title: 'Wallet',
    description: 'Manage your balance',
    icon: Wallet,
    to: '/dashboard/wallet',
    color: 'text-violet-600',
  },
];

function DashboardHome() {
  const { user } = Route.useRouteContext();
  const {
    data: orders,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useMyOrders();
  const {
    data: wishlist,
    isLoading: wishlistLoading,
    isError: wishlistError,
    refetch: refetchWishlist,
  } = useWishlist();

  const recentOrders = orders?.slice(0, 5) ?? [];
  const wishlistCount = wishlist?.items?.length ?? 0;
  const orderCount = orders?.length ?? 0;

  const pendingReturns = 0;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <h1 className='text-2xl font-bold tracking-tight'>
          Welcome back, {user.name}!
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Here's what's happening with your account
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className='grid grid-cols-1 sm:grid-cols-3 gap-4'
      >
        {ordersLoading || wishlistLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className='pb-2'>
                <Skeleton className='h-4 w-20' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-8 w-12' />
              </CardContent>
            </Card>
          ))
        ) : ordersError || wishlistError ? (
          <QueryErrorState
            title='Failed to load your summary'
            onRetry={() => {
              refetchOrders();
              refetchWishlist();
            }}
          />
        ) : (
          <>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Total Orders
                </CardTitle>
                <ShoppingCart className='w-5 h-5 text-blue-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{orderCount}</div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {orders?.filter((o) => o.status === 'DELIVERED').length ?? 0}{' '}
                  delivered
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Wishlist
                </CardTitle>
                <Heart className='w-5 h-5 text-rose-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{wishlistCount}</div>
                <p className='text-xs text-muted-foreground mt-1'>
                  Saved items
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Returns
                </CardTitle>
                <Package className='w-5 h-5 text-amber-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{pendingReturns}</div>
                <p className='text-xs text-muted-foreground mt-1'>
                  Pending returns
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-lg'>Recent Orders</CardTitle>
              <Button variant='outline' size='sm' asChild>
                <Link to='/dashboard/orders'>View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : ordersError ? (
                <QueryErrorState
                  title='Failed to load orders'
                  onRetry={() => refetchOrders()}
                />
              ) : recentOrders.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 text-center'>
                  <ShoppingCart className='w-10 h-10 text-muted-foreground mb-3' />
                  <p className='text-sm font-semibold'>No orders yet</p>
                  <p className='text-sm text-muted-foreground mt-1 mb-4'>
                    Start shopping to see your orders here
                  </p>
                  <Button size='sm' asChild>
                    <Link to='/shops'>Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className='space-y-2'>
                  {recentOrders.map((order) => {
                    const badge = statusBadge(order.status);
                    return (
                      <Link
                        key={order.id}
                        to='/dashboard/orders/$orderId'
                        params={{ orderId: order.id }}
                        className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                      >
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium truncate'>
                            {order.orderNumber}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className='flex items-center gap-3 ml-3'>
                          <span className='text-sm font-bold tabular-nums'>
                            BDT {order.total.toLocaleString()}
                          </span>
                          <Badge
                            variant={badge.variant}
                            className='text-[10px] uppercase'
                          >
                            {badge.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={3}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      params={{} as never}
                      search={{} as never}
                      className='flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors'
                    >
                      <div className='w-10 h-10 rounded-lg bg-muted flex items-center justify-center'>
                        <Icon className={`w-5 h-5 ${link.color}`} />
                      </div>
                      <div>
                        <p className='text-sm font-medium'>{link.title}</p>
                        <p className='text-xs text-muted-foreground'>
                          {link.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className='mt-6'>
            <CardHeader>
              <CardTitle className='text-lg'>Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <Link
                  to='/dashboard/my-account'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm'
                >
                  <span>Profile Settings</span>
                  <span className='text-muted-foreground'>&rarr;</span>
                </Link>
                <Link
                  to='/dashboard/addresses'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm'
                >
                  <span>Manage Addresses</span>
                  <span className='text-muted-foreground'>&rarr;</span>
                </Link>
                <Link
                  to='/dashboard/wallet'
                  className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-sm'
                >
                  <span>Wallet & Balance</span>
                  <span className='text-muted-foreground'>&rarr;</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
