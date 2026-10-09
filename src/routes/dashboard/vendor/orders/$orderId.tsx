import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Ban, ChevronLeft, ExternalLink, Package, Truck } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useCancelVendorOrderMutation,
  useFulfillItemMutation,
  useVendorOrderDetail,
} from '@/services/vendor-orders';

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'PROCESSING':
      return { variant: 'outline' as const, label: 'Processing' };
    case 'SHIPPED':
      return {
        variant: 'default' as const,
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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

const PAYMENT_BADGE: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    label: string;
  }
> = {
  PAID: { variant: 'default', label: 'Paid' },
  PENDING: { variant: 'secondary', label: 'Unpaid' },
  FAILED: { variant: 'destructive', label: 'Failed' },
  REFUNDED: { variant: 'outline', label: 'Refunded' },
};

export const Route = createFileRoute('/dashboard/vendor/orders/$orderId')({
  component: RouteComponent,
});

function TrackingDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (trackingNumber: string, trackingUrl: string) => void;
  isPending: boolean;
}) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

  const handleConfirm = () => {
    if (!trackingNumber.trim()) return;
    onConfirm(trackingNumber.trim(), trackingUrl.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Mark as Shipped</DialogTitle>
          <DialogDescription>
            Add tracking information for this item.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <label htmlFor='tracking-number' className='text-sm font-medium'>
              Tracking Number <span className='text-destructive'>*</span>
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
              placeholder='https://track.steamer.com/...'
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!trackingNumber.trim() || isPending}
          >
            {isPending ? 'Saving...' : 'Confirm Shipment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading } = useVendorOrderDetail(orderId);
  const fulfillMutation = useFulfillItemMutation(orderId);
  const cancelMutation = useCancelVendorOrderMutation();

  const [trackingItemId, setTrackingItemId] = useState<string | null>(null);
  const [confirmItemId, setConfirmItemId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-48 rounded-2xl' />
        <Skeleton className='h-64 rounded-2xl' />
        <Skeleton className='h-40 rounded-2xl' />
      </div>
    );
  }

  if (!order) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
          <Package className='w-7 h-7 text-muted-foreground' />
        </div>
        <div>
          <p className='text-sm font-semibold'>Order not found</p>
          <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
            This order doesn't exist or you don't have access to it.
          </p>
        </div>
        <Button size='sm' asChild className='mt-2'>
          <Link to='/dashboard/vendor/orders'>Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const {
    variant: sVariant,
    className: sClass,
    label: sLabel,
  } = statusBadge(order.orderStatus);
  const pBadge = PAYMENT_BADGE[order.paymentStatus] || {
    variant: 'outline' as const,
    label: order.paymentStatus,
  };

  // The cancel endpoint refuses paid or terminal orders, so only offer the
  // action where it can actually succeed.
  const canCancel =
    !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.paymentStatus) &&
    !['CANCELLED', 'REFUNDED', 'DELIVERED', 'CONFIRMED'].includes(
      order.orderStatus,
    ) &&
    order.items.some((i) => i.fulfillmentStatus !== 'CANCELLED');

  const handleFulfill = (
    itemId: string,
    status: string,
    trackingNumber?: string,
    trackingUrl?: string,
  ) => {
    fulfillMutation.mutate(
      { itemId, fulfillmentStatus: status, trackingNumber, trackingUrl },
      {
        onSuccess: () => {
          setTrackingItemId(null);
          setConfirmItemId(null);
        },
      },
    );
  };

  return (
    <div className='space-y-6'>
      <Button
        variant='ghost'
        size='sm'
        asChild
        className='gap-1.5 text-muted-foreground -ml-2'
      >
        <Link to='/dashboard/vendor/orders'>
          <ChevronLeft className='w-4 h-4' />
          Back to Orders
        </Link>
      </Button>

      {/* Order header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight'>
            {order.orderNumber}
          </h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            Placed on {format(new Date(order.orderDate), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge
            variant={pBadge.variant}
            className='text-[10px] uppercase tracking-wider'
          >
            {pBadge.label}
          </Badge>
          <Badge
            variant={sVariant}
            className={`text-[10px] uppercase tracking-wider w-fit ${sClass || ''}`}
          >
            {sLabel}
          </Badge>
          {canCancel && (
            <Button
              size='sm'
              variant='outline'
              className='gap-1.5 text-destructive'
              onClick={() => {
                setCancelReason('');
                setCancelOpen(true);
              }}
            >
              <Ban className='w-3.5 h-3.5' />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {/* Customer & Shipping */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Customer & Shipping</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5 text-sm'>
          <p className='font-medium'>{order.customerName}</p>
          <p className='text-muted-foreground'>{order.customerEmail}</p>
          <p className='text-muted-foreground'>{order.customerPhone}</p>
          <p className='text-muted-foreground'>
            {order.shippingAddress}
            {order.shippingUpzila && `, ${order.shippingUpzila}`}
            {order.shippingDistrict && `, ${order.shippingDistrict}`}
            {order.shippingPostalCode && ` - ${order.shippingPostalCode}`}
          </p>
          {order.shippingComment && (
            <p className='text-muted-foreground italic mt-2'>
              Note: {order.shippingComment}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>
            Items ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-0'>
          {order.items.map((item) => {
            const {
              variant: iVariant,
              className: iClass,
              label: iLabel,
            } = statusBadge(item.fulfillmentStatus);

            const isTerminal =
              item.fulfillmentStatus === 'CANCELLED' ||
              item.fulfillmentStatus === 'REFUNDED' ||
              item.fulfillmentStatus === 'DELIVERED';

            return (
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
                    </div>
                    <Badge
                      variant={iVariant}
                      className={`text-[10px] uppercase tracking-wider shrink-0 ${iClass || ''}`}
                    >
                      {iLabel}
                    </Badge>
                  </div>

                  <div className='flex items-center justify-between mt-2'>
                    <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                      <span>Qty: {item.quantity}</span>
                      <span>@ ৳{item.unitPrice.toLocaleString('en-BD')}</span>
                      <span className='font-medium text-foreground'>
                        ৳{item.total.toLocaleString('en-BD')}
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

                  {/* Fulfillment actions */}
                  {!isTerminal && (
                    <div className='flex items-center gap-2 mt-3'>
                      {item.fulfillmentStatus === 'PENDING' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs'
                          onClick={() => setConfirmItemId(item.id)}
                        >
                          Mark Processing
                        </Button>
                      )}
                      {item.fulfillmentStatus === 'PROCESSING' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs'
                          onClick={() => setTrackingItemId(item.id)}
                        >
                          <Truck className='w-3 h-3 mr-1' />
                          Mark Shipped
                        </Button>
                      )}
                      {item.fulfillmentStatus === 'SHIPPED' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-7 text-xs'
                          onClick={() => setConfirmItemId(item.id)}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Payment summary */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Subtotal</span>
            <span className='tabular-nums'>
              ৳{order.subtotal.toLocaleString('en-BD')}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>Shipping</span>
            <span className='tabular-nums'>
              {order.shippingCost > 0
                ? `৳${order.shippingCost.toLocaleString('en-BD')}`
                : 'Free'}
            </span>
          </div>
          <div className='border-t border-border pt-3 flex items-center justify-between font-bold'>
            <span>Total</span>
            <span className='tabular-nums text-base'>
              ৳{order.total.toLocaleString('en-BD')}
            </span>
          </div>
          <div className='flex items-center gap-2 pt-2'>
            <span className='text-xs text-muted-foreground'>Payment:</span>
            <Badge
              variant='secondary'
              className='text-[10px] uppercase tracking-wider'
            >
              {order.paymentMethod ?? 'N/A'}
            </Badge>
            <Badge
              variant={pBadge.variant}
              className='text-[10px] uppercase tracking-wider'
            >
              {pBadge.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog for simple transitions (PENDING→PROCESSING, SHIPPED→DELIVERED) */}
      <Dialog
        open={!!confirmItemId}
        onOpenChange={(open) => {
          if (!open) setConfirmItemId(null);
        }}
      >
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to update the fulfillment status?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setConfirmItemId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!confirmItemId) return;
                const item = order.items.find((i) => i.id === confirmItemId);
                if (!item) return;
                const nextStatus =
                  item.fulfillmentStatus === 'PENDING'
                    ? 'PROCESSING'
                    : 'DELIVERED';
                handleFulfill(confirmItemId, nextStatus);
              }}
              disabled={fulfillMutation.isPending}
            >
              {fulfillMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel order dialog */}
      <Dialog
        open={cancelOpen}
        onOpenChange={(o) => !o && setCancelOpen(false)}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Cancel order</DialogTitle>
            <DialogDescription>
              This cancels the lines from your shop, restores their stock, and
              emails the customer. Paid orders must be cancelled by an admin.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder='Reason for cancellation'
            rows={4}
          />
          <DialogFooter className='gap-2'>
            <Button variant='outline' onClick={() => setCancelOpen(false)}>
              Keep Order
            </Button>
            <Button
              variant='destructive'
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={() => {
                cancelMutation.mutate(
                  { orderId, reason: cancelReason.trim() },
                  { onSuccess: () => setCancelOpen(false) },
                );
              }}
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking dialog for SHIPPED */}
      <TrackingDialog
        open={!!trackingItemId}
        onOpenChange={(open) => {
          if (!open) setTrackingItemId(null);
        }}
        onConfirm={(trackingNumber, trackingUrl) => {
          if (trackingItemId) {
            handleFulfill(
              trackingItemId,
              'SHIPPED',
              trackingNumber,
              trackingUrl,
            );
          }
        }}
        isPending={fulfillMutation.isPending}
      />
    </div>
  );
}
