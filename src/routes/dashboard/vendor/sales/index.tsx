import { createFileRoute } from '@tanstack/react-router';
import {
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useVendorAnalytics } from '@/services/vendor-analytics';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/sales/')({
  component: RouteComponent,
});

const statCards = [
  {
    key: 'revenue',
    label: 'Total Revenue',
    icon: DollarSign,
    color: 'text-emerald-600',
  },
  {
    key: 'totalOrders',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'text-blue-600',
  },
  {
    key: 'pendingOrders',
    label: 'Pending Orders',
    icon: BarChart3,
    color: 'text-amber-600',
  },
  {
    key: 'fulfilledOrders',
    label: 'Delivered',
    icon: TrendingUp,
    color: 'text-violet-600',
  },
  {
    key: 'products',
    label: 'Products Sold',
    icon: Package,
    color: 'text-rose-600',
  },
];

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'PROCESSING':
      return { variant: 'default' as const, label: 'Processing' };
    case 'SHIPPED':
      return { variant: 'default' as const, label: 'Shipped' };
    case 'DELIVERED':
      return { variant: 'default' as const, label: 'Delivered' };
    case 'CANCELLED':
      return { variant: 'destructive' as const, label: 'Cancelled' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

function RouteComponent() {
  const { data, isLoading } = useVendorAnalytics();

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Sales Analytics</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Track your shop's sales performance and revenue
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton loader
              <Card key={i}>
                <CardHeader className='pb-2'>
                  <Skeleton className='h-4 w-20' />
                </CardHeader>
                <CardContent>
                  <Skeleton className='h-8 w-16' />
                </CardContent>
              </Card>
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
                      {card.key === 'revenue'
                        ? `৳${formatBDT(value)}`
                        : value.toLocaleString()}
                    </div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {card.key === 'revenue' && 'Net vendor earnings'}
                      {card.key === 'totalOrders' && 'All time items ordered'}
                      {card.key === 'pendingOrders' && 'Awaiting processing'}
                      {card.key === 'fulfilledOrders' &&
                        'Successfully delivered'}
                      {card.key === 'products' && 'Total units sold'}
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
              <CardTitle className='text-lg'>
                Monthly Revenue (12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-[250px] w-full' />
              ) : !data?.monthlyRevenue || data.monthlyRevenue.length === 0 ? (
                <div className='flex items-center justify-center h-[250px] text-sm text-muted-foreground'>
                  No revenue data yet
                </div>
              ) : (
                <ResponsiveContainer width='100%' height={250}>
                  <BarChart data={data.monthlyRevenue}>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} />
                    <XAxis
                      dataKey='month'
                      tickFormatter={(v) => {
                        const [y, m] = v.split('-');
                        const months = [
                          'Jan',
                          'Feb',
                          'Mar',
                          'Apr',
                          'May',
                          'Jun',
                          'Jul',
                          'Aug',
                          'Sep',
                          'Oct',
                          'Nov',
                          'Dec',
                        ];
                        return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
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
                        const [y, m] = label.split('-');
                        const months = [
                          'January',
                          'February',
                          'March',
                          'April',
                          'May',
                          'June',
                          'July',
                          'August',
                          'September',
                          'October',
                          'November',
                          'December',
                        ];
                        return `${months[parseInt(m, 10) - 1]} ${y}`;
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
            <CardHeader>
              <CardTitle className='text-lg'>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='space-y-3'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className='h-10 w-full' />
                  ))}
                </div>
              ) : !data?.topProducts || data.topProducts.length === 0 ? (
                <div className='flex items-center justify-center h-[200px] text-sm text-muted-foreground'>
                  No products sold yet
                </div>
              ) : (
                <div className='space-y-2'>
                  {data.topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className='flex items-center justify-between p-3 rounded-lg border'
                    >
                      <div className='flex items-center gap-3 min-w-0'>
                        <span className='text-xs font-bold text-muted-foreground w-5'>
                          #{index + 1}
                        </span>
                        <span className='text-sm font-medium truncate'>
                          {product.name}
                        </span>
                      </div>
                      <div className='flex items-center gap-4 text-sm ml-3'>
                        <span className='text-muted-foreground'>
                          {product.quantity} sold
                        </span>
                        <span className='font-bold tabular-nums'>
                          ৳{formatBDT(product.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='mt-6'>
            <CardHeader>
              <CardTitle className='text-lg'>Recent Orders</CardTitle>
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
                      <div
                        key={order.id}
                        className='flex items-center justify-between p-3 rounded-lg border text-sm'
                      >
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium truncate'>
                            {order.productName}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {order.orderNumber} · {order.quantity} unit
                            {order.quantity !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className='flex items-center gap-3 ml-3'>
                          <span className='font-bold tabular-nums'>
                            ৳{formatBDT(order.total)}
                          </span>
                          <Badge
                            variant={badge.variant}
                            className='text-[10px] uppercase'
                          >
                            {badge.label}
                          </Badge>
                        </div>
                      </div>
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
