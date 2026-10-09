import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useReturnDetail } from '@/services/returns';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const statusConfig: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    label: string;
  }
> = {
  PENDING: { variant: 'secondary', label: 'Pending Review' },
  APPROVED: { variant: 'default', label: 'Approved' },
  REJECTED: { variant: 'destructive', label: 'Rejected' },
  AWAITING_SHIPMENT: { variant: 'outline', label: 'Awaiting Shipment' },
  SHIPPED: { variant: 'default', label: 'Shipped' },
  RECEIVED: { variant: 'default', label: 'Received' },
  REFUNDED: { variant: 'default', label: 'Refunded' },
};

const statusOrder = [
  'PENDING',
  'APPROVED',
  'AWAITING_SHIPMENT',
  'SHIPPED',
  'RECEIVED',
  'REFUNDED',
];

const reasonLabels: Record<string, string> = {
  DEFECTIVE: 'Defective Item',
  WRONG_ITEM: 'Wrong Item',
  NOT_AS_DESCRIBED: 'Not as Described',
  SIZE_ISSUE: 'Size Issue',
  DAMAGED: 'Damaged in Transit',
  UNWANTED: 'No Longer Needed',
  OTHER: 'Other',
};

export const Route = createFileRoute('/dashboard/orders/returns/$returnId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { returnId } = Route.useParams();
  const { data: ret, isLoading } = useReturnDetail(returnId);

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-40 w-full' />
      </div>
    );
  }

  if (!ret) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <RotateCcw className='w-10 h-10 text-muted-foreground mb-3' />
        <p className='text-sm font-semibold'>Return request not found</p>
        <Button variant='outline' className='mt-4' asChild>
          <Link to='/dashboard/orders/returns'>Back to Returns</Link>
        </Button>
      </div>
    );
  }

  const cfg = statusConfig[ret.status] ?? {
    variant: 'secondary' as const,
    label: ret.status,
  };
  const currentIdx = statusOrder.indexOf(ret.status);

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' asChild className='shrink-0'>
            <Link to='/dashboard/orders/returns'>
              <ArrowLeft className='w-4 h-4' />
            </Link>
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-2xl font-bold tracking-tight'>
                Return Request
              </h1>
              <Badge
                variant={cfg.variant}
                className='text-[10px] uppercase tracking-wider'
              >
                {cfg.label}
              </Badge>
            </div>
            <p className='text-sm text-muted-foreground mt-1'>
              Order #{ret.order?.orderNumber}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Status Timeline */}
      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              {statusOrder.map((s, i) => {
                const scfg = statusConfig[s] ?? {
                  variant: 'secondary',
                  label: s,
                };
                const isPast = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s} className='flex items-center gap-2'>
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : isPast
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {scfg.label}
                    </div>
                    {i < statusOrder.length - 1 && (
                      <div
                        className={`h-px w-4 ${
                          i < currentIdx ? 'bg-primary' : 'bg-border'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Details */}
      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <span className='text-muted-foreground'>Reason</span>
                <p className='font-medium mt-0.5'>
                  {reasonLabels[ret.reason] ?? ret.reason}
                </p>
              </div>
              <div>
                <span className='text-muted-foreground'>Resolution</span>
                <p className='font-medium mt-0.5'>{ret.resolution ?? '-'}</p>
              </div>
              {ret.details && (
                <div className='col-span-2'>
                  <span className='text-muted-foreground'>Details</span>
                  <p className='font-medium mt-0.5'>{ret.details}</p>
                </div>
              )}
              {ret.refundAmount != null && (
                <div>
                  <span className='text-muted-foreground'>Refund Amount</span>
                  <p className='font-medium mt-0.5'>
                    ৳{formatBDT(ret.refundAmount)}
                  </p>
                </div>
              )}
              <div>
                <span className='text-muted-foreground'>Submitted</span>
                <p className='font-medium mt-0.5'>
                  {new Date(ret.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {ret.images.length > 0 && (
              <div>
                <span className='text-sm text-muted-foreground'>
                  Evidence Photos
                </span>
                <div className='flex gap-2 mt-1.5 flex-wrap'>
                  {ret.images.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      <img
                        src={url}
                        alt='Return evidence'
                        width={80}
                        height={80}
                        loading='lazy'
                        decoding='async'
                        className='w-20 h-20 object-cover rounded-lg border'
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {ret.adminNote && (
              <div>
                <span className='text-sm text-muted-foreground'>
                  Admin Note
                </span>
                <p className='text-sm mt-0.5 p-3 bg-muted rounded-lg'>
                  {ret.adminNote}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Items */}
      {ret.order?.items && ret.order.items.length > 0 && (
        <motion.div variants={fadeUp} custom={3}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Items</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              {ret.order.items.map((item) => (
                <div
                  key={item.id}
                  className='flex items-center gap-3 p-3 rounded-lg border'
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      width={48}
                      height={48}
                      loading='lazy'
                      decoding='async'
                      className='w-12 h-12 object-cover rounded-md'
                    />
                  )}
                  <div className='min-w-0 flex-1'>
                    <p className='text-sm font-medium truncate'>
                      {item.productName}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      Qty: {item.quantity} &times; ৳{formatBDT(item.unitPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
