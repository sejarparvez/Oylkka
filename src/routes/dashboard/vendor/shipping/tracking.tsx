import { createFileRoute, Link } from '@tanstack/react-router';
import { ExternalLink, MapPin } from 'lucide-react';
import { useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorOrders } from '@/services/vendor-orders';

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'SHIPPED', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
] as const;

type TrackingFilter = (typeof FILTERS)[number]['value'];

export const Route = createFileRoute('/dashboard/vendor/shipping/tracking')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: orders, isLoading, isError, refetch } = useVendorOrders();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TrackingFilter>('ALL');

  const shipments = (orders ?? []).filter((item) => {
    const hasTracking = Boolean(item.trackingNumber || item.trackingUrl);
    const isShipped =
      item.fulfillmentStatus === 'SHIPPED' ||
      item.fulfillmentStatus === 'DELIVERED';
    if (!hasTracking && !isShipped) return false;
    if (filter === 'SHIPPED' && item.fulfillmentStatus !== 'SHIPPED') {
      return false;
    }
    if (filter === 'DELIVERED' && item.fulfillmentStatus !== 'DELIVERED') {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      item.orderNumber.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      (item.trackingNumber ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Track Shipments</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Follow the delivery status of every order you have shipped.
        </p>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-xs'>
          <Input
            placeholder='Search order, product or tracking…'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className='h-10 rounded-xl'
          />
        </div>
        <div className='flex gap-2'>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={() => setFilter(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-20 w-full rounded-2xl' />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          title='Failed to load shipments'
          onRetry={() => refetch()}
        />
      ) : shipments.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
            <MapPin className='h-7 w-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No shipments found</p>
            <p className='mt-1 max-w-xs text-sm text-muted-foreground'>
              {search.trim() || filter !== 'ALL'
                ? 'Try a different search or filter.'
                : 'Shipments with tracking details will appear here.'}
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/dashboard/vendor/orders'>Go to Orders</Link>
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              {shipments.length} shipment
              {shipments.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='divide-y divide-border'>
              {shipments.map((item) => (
                <div
                  key={item.id}
                  className='flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0'>
                    <Link
                      to='/dashboard/vendor/orders/$orderId'
                      params={{ orderId: item.orderId }}
                      className='text-sm font-semibold hover:text-primary'
                    >
                      {item.orderNumber}
                    </Link>
                    <p className='truncate text-sm text-muted-foreground'>
                      {item.productName}
                      {item.variantName ? ` · ${item.variantName}` : ''} ×
                      {item.quantity}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {item.customerName}
                      {item.customerPhone ? ` · ${item.customerPhone}` : ''}
                    </p>
                  </div>
                  <div className='flex flex-col items-start gap-1 sm:items-end'>
                    <Badge
                      variant={
                        item.fulfillmentStatus === 'DELIVERED'
                          ? 'default'
                          : 'secondary'
                      }
                      className='text-[10px] uppercase'
                    >
                      {item.fulfillmentStatus.replace('_', ' ')}
                    </Badge>
                    {item.trackingNumber && (
                      <span className='text-xs text-muted-foreground'>
                        Tracking: {item.trackingNumber}
                      </span>
                    )}
                    {item.trackingUrl && (
                      <a
                        href={item.trackingUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary hover:underline'
                      >
                        Track parcel <ExternalLink className='h-3 w-3' />
                      </a>
                    )}
                    {item.shippedAt && (
                      <span className='text-xs text-muted-foreground'>
                        Shipped {new Date(item.shippedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
