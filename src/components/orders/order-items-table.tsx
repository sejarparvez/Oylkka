import { ExternalLink, Package, Truck } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge } from '@/components/orders/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBDT } from '@/lib/currency';

type OrderItemRow = {
  id: string;
  productId: string;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  fulfillmentStatus: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shopName?: string;
  commissionAmount?: number;
  vendorAmount?: number;
};

const FULFILLMENT_OPTIONS = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export function OrderItemsTable({
  items,
  showShop = false,
  allowOverride = false,
  onFulfill,
  isFulfilling,
}: {
  items: OrderItemRow[];
  showShop?: boolean;
  allowOverride?: boolean;
  onFulfill?: (
    itemId: string,
    status: string,
    trackingNumber?: string,
    trackingUrl?: string,
  ) => void;
  isFulfilling?: boolean;
}) {
  const [overrideItemId, setOverrideItemId] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const handleOverrideConfirm = () => {
    if (!overrideItemId || !overrideStatus) return;
    onFulfill?.(overrideItemId, overrideStatus, trackingNumber, trackingUrl);
    setOverrideItemId(null);
    setOverrideStatus('');
    setTrackingNumber('');
    setTrackingUrl('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Items ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className='space-y-0'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex items-start gap-4 py-4 border-b border-border last:border-0'
          >
            <div className='relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0'>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  width={56}
                  height={56}
                  loading='lazy'
                  decoding='async'
                  className='object-cover w-full h-full'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center'>
                  <Package className='w-5 h-5 text-muted-foreground' />
                </div>
              )}
            </div>

            <div className='flex-1 min-w-0'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold line-clamp-1'>
                    {item.productName}
                  </p>
                  {item.variantName && (
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {item.variantName}
                    </p>
                  )}
                  {showShop && item.shopName && (
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      Shop: {item.shopName}
                    </p>
                  )}
                </div>
                <StatusBadge
                  type='fulfillment'
                  value={item.fulfillmentStatus}
                />
              </div>

              <div className='flex items-center justify-between mt-2'>
                <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                  <span>Qty: {item.quantity}</span>
                  <span>@ ৳{formatBDT(item.unitPrice)}</span>
                  <span className='font-medium text-foreground'>
                    ৳{formatBDT(item.total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  {item.trackingNumber && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='text-[10px] text-muted-foreground flex items-center gap-1'>
                            <Truck className='w-3 h-3' />
                            {item.trackingNumber}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tracking: {item.trackingNumber}</p>
                          {item.trackingUrl && (
                            <p className='text-xs text-muted-foreground mt-1'>
                              {item.trackingUrl}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {item.trackingUrl && (
                    <a
                      href={item.trackingUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-muted-foreground hover:text-primary transition-colors'
                    >
                      <ExternalLink className='w-3 h-3' />
                    </a>
                  )}
                </div>
              </div>

              {allowOverride && onFulfill && (
                <div className='mt-3'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='h-7 text-xs'
                    onClick={() => {
                      setOverrideItemId(item.id);
                      setOverrideStatus(item.fulfillmentStatus);
                    }}
                  >
                    Override Status
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog
        open={!!overrideItemId}
        onOpenChange={(open) => {
          if (!open) {
            setOverrideItemId(null);
            setOverrideStatus('');
            setTrackingNumber('');
            setTrackingUrl('');
          }
        }}
      >
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Override Fulfillment Status</DialogTitle>
            <DialogDescription>
              Set the fulfillment status for this item. You can set any status
              regardless of the current state.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-2'>
              <label htmlFor='override-status' className='text-sm font-medium'>
                Status
              </label>
              <Select value={overrideStatus} onValueChange={setOverrideStatus}>
                <SelectTrigger id='override-status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {overrideStatus === 'SHIPPED' && (
              <>
                <div className='space-y-2'>
                  <label
                    htmlFor='tracking-number'
                    className='text-sm font-medium'
                  >
                    Tracking Number
                  </label>
                  <Input
                    id='tracking-number'
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder='e.g. TRK123456789'
                  />
                </div>
                <div className='space-y-2'>
                  <label htmlFor='tracking-url' className='text-sm font-medium'>
                    Tracking URL
                  </label>
                  <Input
                    id='tracking-url'
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder='https://track.courier.com/...'
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setOverrideItemId(null);
                setOverrideStatus('');
                setTrackingNumber('');
                setTrackingUrl('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOverrideConfirm}
              disabled={!overrideStatus || isFulfilling}
            >
              {isFulfilling ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
