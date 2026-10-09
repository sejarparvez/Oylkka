import { createFileRoute, Link } from '@tanstack/react-router';
import { PackageSearch, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useVendorOrderDetail,
  useVendorOrders,
} from '@/services/vendor-orders';

interface OrderToPack {
  orderId: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
}

export const Route = createFileRoute('/dashboard/vendor/shipping/labels')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: orders, isLoading, isError, refetch } = useVendorOrders();
  const [search, setSearch] = useState('');

  const awaiting = useMemo(() => {
    const map = new Map<string, OrderToPack>();
    for (const item of orders ?? []) {
      if (
        item.fulfillmentStatus !== 'PENDING' &&
        item.fulfillmentStatus !== 'PROCESSING'
      ) {
        continue;
      }
      const existing = map.get(item.orderId);
      if (existing) {
        existing.itemCount += 1;
      } else {
        map.set(item.orderId, {
          orderId: item.orderId,
          orderNumber: item.orderNumber,
          customerName: item.customerName,
          itemCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.orderNumber.localeCompare(b.orderNumber),
    );
  }, [orders]);

  const filtered = useMemo(() => {
    if (!search.trim()) return awaiting;
    const q = search.trim().toLowerCase();
    return awaiting.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q),
    );
  }, [awaiting, search]);

  return (
    <div className='space-y-6'>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #shipping-labels, #shipping-labels * { visibility: visible; }
          #shipping-labels { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <div className='flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Print Labels</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Generate packing slips for orders that are awaiting shipment.
          </p>
        </div>
        {filtered.length > 0 && (
          <Button
            onClick={() => window.print()}
            className='gap-2 self-start sm:self-auto'
          >
            <Printer className='h-4 w-4' /> Print All
          </Button>
        )}
      </div>

      <div className='relative w-full print:hidden sm:max-w-xs'>
        <Input
          placeholder='Search order or customer…'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className='h-10 rounded-xl'
        />
      </div>

      {isLoading ? (
        <div className='space-y-4'>
          {[1, 2].map((i) => (
            <Skeleton key={i} className='h-44 w-full rounded-2xl' />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          title='Failed to load labels'
          onRetry={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-muted'>
            <PackageSearch className='h-7 w-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>Nothing to pack</p>
            <p className='mt-1 max-w-xs text-sm text-muted-foreground'>
              {search.trim()
                ? 'No awaiting shipment order matches your search.'
                : 'Printing labels becomes available once new orders arrive.'}
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/dashboard/vendor/orders'>Go to Orders</Link>
          </Button>
        </div>
      ) : (
        <div id='shipping-labels' className='space-y-4'>
          {filtered.map((order) => (
            <PackingSlip
              key={order.orderId}
              orderId={order.orderId}
              orderNumber={order.orderNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PackingSlip({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const { data, isLoading } = useVendorOrderDetail(orderId);

  if (isLoading) {
    return <Skeleton className='h-44 w-full rounded-2xl' />;
  }
  if (!data) return null;

  const itemCount = data.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className='break-inside-avoid rounded-2xl border border-border bg-card p-6'>
      <div className='flex items-start justify-between gap-4 border-b border-border pb-4'>
        <div>
          <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-primary'>
            Oylkka Packing Slip
          </p>
          <p className='text-lg font-bold'>{data.orderNumber}</p>
        </div>
        <div className='text-right text-xs text-muted-foreground'>
          <p>{new Date(data.orderDate).toLocaleDateString()}</p>
          <p>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className='grid gap-6 py-4 sm:grid-cols-2'>
        <div>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Ship To
          </p>
          <p className='mt-1 text-sm font-semibold'>{data.customerName}</p>
          <p className='text-xs text-muted-foreground'>{data.customerPhone}</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {data.shippingAddress}, {data.shippingUpzila},{' '}
            {data.shippingDistrict}
            {data.shippingPostalCode ? ` - ${data.shippingPostalCode}` : ''}
          </p>
          {data.shippingComment && (
            <p className='mt-2 text-xs italic text-muted-foreground'>
              Note: {data.shippingComment}
            </p>
          )}
        </div>
        <div>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'>
            Items
          </p>
          <ul className='mt-1 space-y-1.5'>
            {data.items.map((item) => (
              <li
                key={item.id}
                className='flex items-start justify-between gap-3 text-xs'
              >
                <span className='truncate'>
                  {item.productName}
                  {item.variantName ? ` · ${item.variantName}` : ''}
                </span>
                <span className='shrink-0 tabular-nums'>×{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className='border-t border-border pt-3 text-[10px] text-muted-foreground'>
        Order {orderNumber} · Payment: {data.paymentMethod ?? '—'} ·{' '}
        {data.paymentStatus}
      </div>
    </div>
  );
}
