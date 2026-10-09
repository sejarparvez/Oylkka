import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Eye, Package, Search } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/orders/status-badge';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useAdminOrders } from '@/services/admin-orders';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Refunded', value: 'REFUNDED' },
] as const;

const PAYMENT_STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Unpaid', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Refunded', value: 'REFUNDED' },
  { label: 'Partial Refund', value: 'PARTIALLY_REFUNDED' },
] as const;

export const Route = createFileRoute('/dashboard/admin/orders/')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
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
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAdminOrders({
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    search: debouncedSearch || undefined,
    customer: customerSearch || undefined,
    vendor: vendorSearch || undefined,
    page,
  });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleStatusChange = (newStatus: string) => {
    setPage(1);
    navigate({
      to: '/dashboard/admin/orders',
      search: newStatus ? { status: newStatus } : {},
    });
  };

  const viewOrder = (orderId: string) => {
    navigate({ to: `/dashboard/admin/orders/${orderId}` } as never);
  };

  const orders = data?.orders ?? [];
  const totalRevenue = data?.totalRevenue ?? 0;
  const totalOrders = data?.total ?? 0;
  const pendingCount = data?.pendingCount ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Orders</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage all orders across the platform
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className='grid grid-cols-3 gap-4'>
        <div className='rounded-2xl border border-border bg-card p-4'>
          <p className='text-xs text-muted-foreground'>Total Orders</p>
          <p className='text-2xl font-bold mt-1'>
            {isLoading ? '-' : totalOrders.toLocaleString('en-BD')}
          </p>
        </div>
        <div className='rounded-2xl border border-border bg-card p-4'>
          <p className='text-xs text-muted-foreground'>Total Revenue</p>
          <p className='text-2xl font-bold mt-1'>
            {isLoading ? '-' : `৳${formatBDT(totalRevenue)}`}
          </p>
        </div>
        <div className='rounded-2xl border border-border bg-card p-4'>
          <p className='text-xs text-muted-foreground'>Pending Orders</p>
          <p className='text-2xl font-bold mt-1'>
            {isLoading ? '-' : pendingCount.toLocaleString('en-BD')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-4'>
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

        <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              placeholder='Search order #...'
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className='pl-9'
            />
          </div>
          <Input
            placeholder='Search customer...'
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setPage(1);
            }}
          />
          <Input
            placeholder='Search vendor/shop...'
            value={vendorSearch}
            onChange={(e) => {
              setVendorSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={paymentStatus}
            onValueChange={(v) => {
              setPaymentStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder='Payment status' />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <Skeleton key={i} className='h-16 rounded-2xl' />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <QueryErrorState
          title='Failed to load orders'
          onRetry={() => refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && orders.length === 0 && (
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
                ? `No orders with "${status}" status found.`
                : 'Orders will appear here once customers place them.'}
            </p>
          </div>
        </div>
      )}

      {/* Orders table */}
      {!isLoading && orders.length > 0 && (
        <div className='space-y-2'>
          {orders.map((order) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: clickable row
            <div
              key={order.id}
              className='rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors duration-200 cursor-pointer'
              onClick={() => viewOrder(order.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') viewOrder(order.id);
              }}
            >
              <div className='flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 items-center'>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold truncate'>
                    {order.orderNumber}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {order.customerName}
                  </p>
                </div>

                <div className='text-sm font-bold tabular-nums'>
                  ৳{formatBDT(order.total)}
                </div>

                <StatusBadge type='payment' value={order.paymentStatus} />
                <StatusBadge type='order' value={order.status} />

                <div className='text-xs text-muted-foreground text-center'>
                  {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                </div>

                <div className='text-xs text-muted-foreground'>
                  {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </div>
              </div>

              <Button
                variant='ghost'
                size='icon'
                className='w-8 h-8 rounded-lg shrink-0'
                onClick={(e) => {
                  e.stopPropagation();
                  viewOrder(order.id);
                }}
              >
                <Eye className='w-3.5 h-3.5' />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 pt-4'>
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className='text-sm text-muted-foreground'>
            Page {page} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
