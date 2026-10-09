import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Eye, Package, Search } from 'lucide-react';
import { useRef, useState } from 'react';

import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useMyOrders } from '@/services/order';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, className: '', label: 'Pending' };
    case 'CONFIRMED':
      return { variant: 'default' as const, className: '', label: 'Confirmed' };
    case 'PROCESSING':
      return {
        variant: 'outline' as const,
        className: '',
        label: 'Processing',
      };
    case 'SHIPPED':
      return {
        variant: 'default' as const,
        className:
          'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25',
        label: 'Shipped',
      };
    case 'DELIVERED':
      return { variant: 'default' as const, className: '', label: 'Delivered' };
    case 'CANCELLED':
      return {
        variant: 'destructive' as const,
        className: '',
        label: 'Cancelled',
      };
    case 'REFUNDED':
      return { variant: 'outline' as const, className: '', label: 'Refunded' };
    case 'PARTIALLY_REFUNDED':
      return {
        variant: 'outline' as const,
        className: '',
        label: 'Partial Refund',
      };
    default:
      return { variant: 'outline' as const, className: '', label: status };
  }
};

const paymentStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return { variant: 'default' as const, className: '', label: 'Paid' };
    case 'PENDING':
      return { variant: 'secondary' as const, className: '', label: 'Unpaid' };
    case 'FAILED':
      return {
        variant: 'destructive' as const,
        className: '',
        label: 'Failed',
      };
    case 'REFUNDED':
      return { variant: 'outline' as const, className: '', label: 'Refunded' };
    default:
      return { variant: 'outline' as const, className: '', label: status };
  }
};

export const Route = createFileRoute('/dashboard/orders/')({
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { status?: string } => ({
    status: search.status,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { status: statusParam } = Route.useSearch();
  const navigate = useNavigate();
  const status =
    statusParam && STATUS_TABS.some((t) => t.value === statusParam)
      ? statusParam
      : '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useMyOrders(status || undefined, debouncedSearch || undefined);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleStatusChange = (newStatus: string) => {
    navigate({
      to: '/dashboard/orders',
      search: newStatus ? { status: newStatus } : {},
    });
  };

  const viewOrder = (orderId: string) => {
    navigate({ to: '/dashboard/orders/$orderId', params: { orderId } });
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>My Orders</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            View and track your orders
          </p>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex gap-1 flex-wrap'>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={status === tab.value ? 'default' : 'outline'}
              size='sm'
              className='rounded-lg'
              onClick={() => handleStatusChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search by order number...'
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {isLoading && (
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: this is fine
            <Skeleton key={i} className='h-24 rounded-2xl' />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <QueryErrorState
          title='Failed to load orders'
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && orders?.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Package className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>
              {status ? `No ${status.toLowerCase()} orders` : 'No orders yet'}
            </p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              {status
                ? `You don't have any orders with "${status.toLowerCase()}" status.`
                : 'Your orders will appear here once you make a purchase.'}
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <a href='/products'>Start Shopping</a>
          </Button>
        </div>
      )}

      {!isLoading && orders && orders.length > 0 && (
        <div className='space-y-3'>
          {orders.map((order) => {
            const {
              variant: sVariant,
              className: sClass,
              label: sLabel,
            } = statusBadge(order.status);
            const {
              variant: pVariant,
              className: pClass,
              label: pLabel,
            } = paymentStatusBadge(order.paymentStatus);

            return (
              <div
                key={order.id}
                className='relative rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors duration-200 cursor-pointer'
              >
                <div className='flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center'>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold truncate'>
                      {order.orderNumber}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {format(new Date(order.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className='flex items-center gap-2'>
                    <Badge
                      variant={sVariant}
                      className={`text-[10px] uppercase tracking-wider ${sClass}`}
                    >
                      {sLabel}
                    </Badge>
                    <Badge
                      variant={pVariant}
                      className={`text-[10px] uppercase tracking-wider ${pClass}`}
                    >
                      {pLabel}
                    </Badge>
                  </div>

                  <div className='text-xs text-muted-foreground'>
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </div>

                  <div className='text-sm font-bold tabular-nums'>
                    ৳{formatBDT(order.total)}
                  </div>
                </div>

                <Button
                  variant='ghost'
                  size='icon'
                  className='relative z-10 w-8 h-8 rounded-lg shrink-0'
                  onClick={(e) => {
                    e.stopPropagation();
                    viewOrder(order.id);
                  }}
                >
                  <Eye className='w-3.5 h-3.5' />
                </Button>
                <Link
                  to='/dashboard/orders/$orderId'
                  params={{ orderId: order.id }}
                  aria-label={`View order ${order.orderNumber}`}
                  className='absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
