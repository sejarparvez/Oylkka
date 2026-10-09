import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Eye, Package, Search } from 'lucide-react';
import { useRef, useState } from 'react';

import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorOrders } from '@/services/vendor-orders';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Shipped', value: 'SHIPPED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Returns', value: 'REFUNDED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'CONFIRMED':
      return { variant: 'default' as const, label: 'Confirmed' };
    case 'PROCESSING':
      return { variant: 'outline' as const, label: 'Processing' };
    case 'SHIPPED':
      return {
        variant: 'default' as const,
        className:
          'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25',
        label: 'Shipped',
      };
    case 'DELIVERED':
      return { variant: 'default' as const, label: 'Delivered' };
    case 'CANCELLED':
      return { variant: 'destructive' as const, label: 'Cancelled' };
    case 'REFUNDED':
      return { variant: 'outline' as const, label: 'Refunded' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export const Route = createFileRoute('/dashboard/vendor/orders/')({
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

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useVendorOrders(status || undefined, debouncedSearch || undefined);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleStatusChange = (newStatus: string) => {
    navigate({
      to: '/dashboard/vendor/orders',
      search: newStatus ? { status: newStatus } : {},
    });
  };

  const viewOrder = (orderId: string) => {
    navigate({ to: `/dashboard/vendor/orders/${orderId}` } as never);
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Orders</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage your shop's orders and fulfillment
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
            placeholder='Search by order or product...'
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {isLoading && (
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
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

      {!isLoading && !isError && items?.length === 0 && (
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
                ? `No items with "${status.toLowerCase()}" status.`
                : 'Orders with your products will appear here.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className='space-y-3'>
          {items.map((item) => {
            const {
              variant: sVariant,
              className: sClass,
              label: sLabel,
            } = statusBadge(item.fulfillmentStatus);

            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: this is fine
              <div
                key={item.id}
                className='rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors duration-200 cursor-pointer'
                onClick={() => viewOrder(item.orderId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') viewOrder(item.orderId);
                }}
              >
                <div className='flex items-start gap-4 flex-1 min-w-0'>
                  <div className='relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0'>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className='object-cover w-full h-full'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center'>
                        <Package className='w-5 h-5 text-muted-foreground' />
                      </div>
                    )}
                  </div>

                  <div className='flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center'>
                    <div className='min-w-0'>
                      <p className='text-sm font-semibold truncate'>
                        {item.productName}
                      </p>
                      {item.variantName && (
                        <p className='text-xs text-muted-foreground'>
                          {item.variantName}
                        </p>
                      )}
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {item.orderNumber} &middot;{' '}
                        {format(new Date(item.orderDate), 'MMM d, yyyy')}
                      </p>
                    </div>

                    <div className='text-xs text-muted-foreground text-center'>
                      <span className='font-medium'>{item.quantity}</span> pcs
                    </div>

                    <div className='flex items-center gap-2'>
                      <Badge
                        variant={sVariant}
                        className={`text-[10px] uppercase tracking-wider ${sClass || ''}`}
                      >
                        {sLabel}
                      </Badge>
                    </div>

                    <div className='text-sm font-bold tabular-nums'>
                      Ã Â§Â³{item.vendorAmount.toLocaleString('en-BD')}
                    </div>
                  </div>
                </div>

                <Button
                  variant='ghost'
                  size='icon'
                  className='w-8 h-8 rounded-lg shrink-0'
                  onClick={(e) => {
                    e.stopPropagation();
                    viewOrder(item.orderId);
                  }}
                >
                  <Eye className='w-3.5 h-3.5' />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
