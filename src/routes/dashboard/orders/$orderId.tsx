import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ChevronLeft,
  FileText,
  Loader2,
  MessageSquare,
  Package,
  RotateCcw,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useOrderDetail } from '@/services/order';
import { useCreateReturnMutation } from '@/services/returns';

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
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
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
    default:
      return { variant: 'outline' as const, className: '', label: status };
  }
};

const ITEM_STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

function getItemStepIndex(status: string): number {
  const idx = ITEM_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

const ORDER_STEPS = [
  { key: 'PENDING', label: 'Placed' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'SHIPPED', label: 'Shipped' },
  { key: 'DELIVERED', label: 'Delivered' },
] as const;

const STEP_ORDER = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];

function getActiveStepIndex(status: string): number {
  if (status === 'CANCELLED' || status === 'REFUNDED') return -1;
  const idx = STEP_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export const Route = createFileRoute('/dashboard/orders/$orderId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { orderId } = Route.useParams();
  const { data: order, isLoading } = useOrderDetail(orderId);

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
          <Link to='/dashboard/orders'>Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const {
    variant: sVariant,
    className: sClass,
    label: sLabel,
  } = statusBadge(order.status);
  const activeStep = getActiveStepIndex(order.status);
  const isTerminal =
    order.status === 'CANCELLED' || order.status === 'REFUNDED';

  return (
    <div className='space-y-6'>
      <Button
        variant='ghost'
        size='sm'
        asChild
        className='gap-1.5 text-muted-foreground -ml-2'
      >
        <Link to='/dashboard/orders'>
          <ChevronLeft className='w-4 h-4' />
          Back to Orders
        </Link>
      </Button>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-bold tracking-tight'>
            {order.orderNumber}
          </h1>
          <p className='text-sm text-muted-foreground mt-0.5'>
            Placed on {format(new Date(order.createdAt), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge
            variant={sVariant}
            className={`text-[10px] uppercase tracking-wider w-fit ${sClass}`}
          >
            {sLabel}
          </Badge>
          {order.invoice?.pdfUrl && (
            <Button variant='outline' size='sm' asChild className='gap-2'>
              <a
                href={`/api/orders/invoice/${order.invoice.id}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                <FileText className='w-4 h-4' />
                Invoice
              </a>
            </Button>
          )}
          {order.status === 'DELIVERED' && (
            <RequestReturnDialog orderId={order.id} />
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isTerminal && (
        <div className='rounded-2xl border border-border bg-card p-5'>
          <div className='flex items-center gap-0'>
            {ORDER_STEPS.map((step, i) => {
              const isActive = i <= activeStep;
              const isCurrent = i === activeStep;
              return (
                <div key={step.key} className='flex items-center flex-1'>
                  <div className='flex flex-col items-center gap-1.5'>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-2 ring-offset-card' : ''}`}
                    >
                      {isActive ? '✓' : i + 1}
                    </div>
                    <span
                      className={`text-[10px] font-medium whitespace-nowrap ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < ORDER_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mt-[-1.25rem] ${
                        i < activeStep ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isTerminal && (
        <div className='rounded-2xl border border-border bg-card p-5'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0'>
              <Package className='w-5 h-5 text-destructive' />
            </div>
            <div>
              <p className='text-sm font-semibold'>
                {order.status === 'CANCELLED'
                  ? 'Order Cancelled'
                  : 'Order Refunded'}
              </p>
              {order.cancellationReason && (
                <p className='text-xs text-muted-foreground mt-0.5'>
                  Reason: {order.cancellationReason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order items, grouped per shop with per-item fulfilment tracking */}
      {(() => {
        const grouped = order.items.reduce<
            Record<string, typeof order.items>
          >((acc, item) => {
            if (!acc[item.shopId]) acc[item.shopId] = [];
            acc[item.shopId].push(item);
            return acc;
          }, {});

        return (
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>
                Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              {Object.entries(grouped).map(([shopId, items]) => {
                const shopName =
                  items.find((i) => i.shopId === shopId)?.shopName ?? null;
                return (
                  <div key={shopId} className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <p className='text-sm font-semibold'>
                        {shopName ?? 'Shop'}
                      </p>
                    </div>
                    <div className='space-y-0'>
                      {items.map((item) => {
                        const stepIndex = getItemStepIndex(
                          item.fulfillmentStatus,
                        );
                        const fulfilled =
                          item.fulfillmentStatus === 'DELIVERED';
                        const cancelled =
                          item.fulfillmentStatus === 'CANCELLED';
                        return (
                          <div
                            key={item.id}
                            className='flex items-start gap-4 py-4 border-b border-border last:border-0'
                          >
                            <div className='relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0'>
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

                            <div className='flex-1 min-w-0 space-y-2'>
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
                                <div className='flex items-center gap-2 shrink-0'>
                                  <Badge
                                    variant={statusBadge(
                                      item.fulfillmentStatus,
                                    ).variant}
                                    className={`text-[10px] uppercase tracking-wider ${statusBadge(item.fulfillmentStatus).className}`}
                                  >
                                    {statusBadge(item.fulfillmentStatus).label}
                                  </Badge>
                                  <span className='text-sm font-bold tabular-nums'>
                                    ৳{item.total.toLocaleString('en-BD')}
                                  </span>
                                </div>
                              </div>

                              {item.trackingNumber && (
                                <div className='flex items-center gap-1.5 text-xs'>
                                  <span className='text-muted-foreground'>
                                    Tracking:
                                  </span>
                                  <span className='font-mono text-foreground'>
                                    {item.trackingNumber}
                                  </span>
                                  {item.trackingUrl && (
                                    <a
                                      href={item.trackingUrl}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      className='text-primary hover:underline'
                                    >
                                      Track
                                    </a>
                                  )}
                                </div>
                              )}

                              {!cancelled &&
                                (item.fulfillmentStatus === 'SHIPPED' ||
                                  fulfilled) && (
                                  <div className='flex items-center gap-3 text-[10px] font-medium'>
                                    {ITEM_STEPS.map((step, i) => {
                                      const isActive =
                                        stepIndex >= 0 && i <= stepIndex;
                                      const isCurrent = i === stepIndex;
                                      return (
                                        <div
                                          key={step.key}
                                          className='flex items-center gap-0'
                                        >
                                          <div className='flex flex-col items-center gap-1'>
                                            <div
                                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                                                isActive
                                                  ? 'bg-primary text-primary-foreground'
                                                  : 'bg-muted text-muted-foreground'
                                              } ${isCurrent ? 'ring-2 ring-primary/30 ring-offset-1 ring-offset-card' : ''}`}
                                            >
                                              {isActive ? '✓' : i + 1}
                                            </div>
                                            <span
                                              className={`whitespace-nowrap ${
                                                isActive
                                                  ? 'text-foreground'
                                                  : 'text-muted-foreground'
                                              }`}
                                            >
                                              {step.label}
                                            </span>
                                          </div>
                                          {i < ITEM_STEPS.length - 1 && (
                                            <div
                                              className={`w-4 h-px mb-[-1rem] ${
                                                i < stepIndex
                                                  ? 'bg-primary'
                                                  : 'bg-border'
                                              }`}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                    {fulfilled && item.deliveredAt && (
                                      <span className='text-muted-foreground'>
                                        on{' '}
                                        {format(
                                          new Date(item.deliveredAt),
                                          'MMM d, yyyy',
                                        )}
                                      </span>
                                    )}
                                    {item.fulfillmentStatus === 'SHIPPED' &&
                                      item.shippedAt && (
                                        <span className='text-muted-foreground'>
                                          on{' '}
                                          {format(
                                            new Date(item.shippedAt),
                                            'MMM d, yyyy',
                                          )}
                                        </span>
                                      )}
                                  </div>
                                )}

                              <div className='flex items-center justify-between'>
                                <span className='text-xs text-muted-foreground'>
                                  Qty: {item.quantity}
                                </span>
                                <MessageVendorButton
                                  shopId={item.shopId}
                                  productId={item.productId}
                                  productName={item.productName}
                                  orderId={order.id}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {/* Shipping info */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className='space-y-1.5 text-sm'>
          <p className='font-medium'>{order.shippingName}</p>
          <p className='text-muted-foreground'>{order.shippingEmail}</p>
          <p className='text-muted-foreground'>{order.shippingPhone}</p>
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
          {order.discountAmount > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Discount</span>
              <span className='tabular-nums text-destructive'>
                -৳{order.discountAmount.toLocaleString('en-BD')}
              </span>
            </div>
          )}
          {order.couponDiscount && order.couponDiscount > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>Coupon Discount</span>
              <span className='tabular-nums text-destructive'>
                -৳{order.couponDiscount.toLocaleString('en-BD')}
              </span>
            </div>
          )}
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
              variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}
              className='text-[10px] uppercase tracking-wider'
            >
              {order.paymentStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const RETURN_REASONS = [
  { value: 'DEFECTIVE', label: 'Defective Item' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Received' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as Described' },
  { value: 'SIZE_ISSUE', label: 'Size Issue' },
  { value: 'DAMAGED', label: 'Damaged in Transit' },
  { value: 'UNWANTED', label: 'No Longer Needed' },
  { value: 'OTHER', label: 'Other' },
];

function MessageVendorButton({
  shopId,
  productId,
  productName,
  orderId,
}: {
  shopId: string;
  productId: string;
  productName: string;
  orderId: string;
}) {
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  async function handleClick() {
    setIsSending(true);
    try {
      const response = await fetch('/api/conversations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          subject: `Question about ${productName}`,
          message: `I have a question about ${productName} from my order.`,
          orderId,
          productId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to start conversation');
        return;
      }

      navigate({
        to: '/dashboard/messages/$id',
        params: { id: data.conversation.id },
      });
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Button
      variant='ghost'
      size='icon'
      className='w-7 h-7 rounded-lg'
      onClick={handleClick}
      disabled={isSending}
      title='Message Vendor'
    >
      {isSending ? (
        <Loader2 className='w-3.5 h-3.5 animate-spin' />
      ) : (
        <MessageSquare className='w-3.5 h-3.5' />
      )}
    </Button>
  );
}

function RequestReturnDialog({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const createMutation = useCreateReturnMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('reason', reason);
    formData.append('details', details);
    formData.append('resolution', 'REFUND');

    if (fileRef.current?.files) {
      for (const file of fileRef.current.files) {
        formData.append('images', file);
      }
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success('Return request submitted');
      setOpen(false);
      navigate({ to: '/dashboard/orders/returns' });
    } catch {
      toast.error('Failed to submit return request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          <RotateCcw className='w-4 h-4' />
          Request Return
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Request Return</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div>
            <Label htmlFor='returnReason'>Reason</Label>
            <select
              id='returnReason'
              className='flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value=''>Select a reason</option>
              {RETURN_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor='returnDetails'>Details (optional)</Label>
            <Textarea
              id='returnDetails'
              placeholder='Describe the issue...'
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor='returnImages'>Evidence Photos (optional)</Label>
            <Input
              id='returnImages'
              type='file'
              ref={fileRef}
              accept='image/*'
              multiple
            />
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              )}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
