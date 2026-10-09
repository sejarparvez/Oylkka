import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import {
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useAdminDashboardStats } from '@/services/admin-dashboard';

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

export const Route = createFileRoute('/dashboard/admin/')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

const statCards = [
  {
    key: 'revenue',
    label: 'Total Revenue',
    icon: DollarSign,
    color: 'text-emerald-600',
    prefix: 'BDT ',
  },
  {
    key: 'orders',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'text-blue-600',
    prefix: '',
  },
  {
    key: 'pendingOrders',
    label: 'Pending Orders',
    icon: BarChart3,
    color: 'text-amber-600',
    prefix: '',
  },
  {
    key: 'processingOrders',
    label: 'Processing',
    icon: TrendingUp,
    color: 'text-violet-600',
    prefix: '',
  },
  {
    key: 'products',
    label: 'Products',
    icon: Package,
    color: 'text-rose-600',
    prefix: '',
  },
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    color: 'text-cyan-600',
    prefix: '',
  },
  {
    key: 'vendors',
    label: 'Active Vendors',
    icon: Store,
    color: 'text-orange-600',
    prefix: '',
  },
];

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-5 w-5 rounded' />
      </CardHeader>
      <CardContent>
        <Skeleton className='h-8 w-20 mb-1' />
        <Skeleton className='h-3 w-16' />
      </CardContent>
    </Card>
  );
}

function RouteComponent() {
  const { data, isLoading } = useAdminDashboardStats();

  const formatValue = (key: string, value: number) => {
    if (key === 'revenue') {
      return `৳${formatBDT(value)}`;
    }
    return value.toLocaleString();
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Overview of your store's performance
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
      >
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <StatCardSkeleton key={i} />
            ))
          : statCards.map((card) => {
              const value =
                data?.stats[card.key as keyof typeof data.stats] ?? 0;
              const Icon = card.icon;
              return (
                <Card key={card.key}>
                  <CardHeader className='flex flex-row items-center justify-between pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      {card.label}
                    </CardTitle>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className='text-2xl font-bold tabular-nums'>
                      {formatValue(card.key, value)}
                    </div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {card.key === 'revenue' && 'Total paid revenue'}
                      {card.key === 'orders' && 'All time orders'}
                      {card.key === 'pendingOrders' && 'Awaiting processing'}
                      {card.key === 'processingOrders' && 'Being processed'}
                      {card.key === 'products' && 'Total products'}
                      {card.key === 'users' && 'Registered users'}
                      {card.key === 'vendors' && 'Active shop owners'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Revenue (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-[200px] w-full' />
              ) : !data?.dailyRevenue || data.dailyRevenue.length === 0 ? (
                <div className='flex items-center justify-center h-[200px] text-sm text-muted-foreground'>
                  No revenue data for the last 30 days
                </div>
              ) : (
                <ResponsiveContainer width='100%' height={250}>
                  <BarChart data={data.dailyRevenue}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis
                      dataKey='date'
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      tick={{ fontSize: 11 }}
                      interval='preserveStartEnd'
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      formatter={(...args: unknown[]) => [
                        `৳${formatBDT(args[0])}`,
                        'Revenue',
                      ]}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                      }}
                    />
                    <Bar
                      dataKey='amount'
                      fill='hsl(var(--primary))'
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={3}>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-lg'>Recent Orders</CardTitle>
              <Button variant='outline' size='sm' asChild>
                <Link to='/dashboard/admin/orders'>View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : !data?.recentOrders || data.recentOrders.length === 0 ? (
                <div className='flex items-center justify-center h-[200px] text-sm text-muted-foreground'>
                  No orders yet
                </div>
              ) : (
                <div className='space-y-2'>
                  {data.recentOrders.map((order) => {
                    const badge = statusBadge(order.status);
                    return (
                      <Link
                        key={order.id}
                        to='/dashboard/admin/orders/$orderId'
                        params={{ orderId: order.id }}
                        className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                      >
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium truncate'>
                            {order.orderNumber}
                          </p>
                          <p className='text-xs text-muted-foreground truncate'>
                            {order.customerName}
                          </p>
                        </div>
                        <div className='flex items-center gap-3 ml-3'>
                          <span className='text-sm font-bold tabular-nums'>
                            ৳{formatBDT(order.total)}
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
      </div>
    </motion.div>
  );
}
