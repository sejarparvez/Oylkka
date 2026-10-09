import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Package, RotateCcw, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
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
  useAdminReturns,
  useAdminReviewReturnMutation,
} from '@/services/returns';

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

const REFUNDABLE_SOURCES = [
  'APPROVED',
  'AWAITING_SHIPMENT',
  'SHIPPED',
  'RECEIVED',
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

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'REJECTED', label: 'Rejected' },
];

export const Route = createFileRoute('/dashboard/admin/returns/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [status, setStatus] = useState('');
  const {
    data: returns,
    isLoading,
    isError,
    refetch,
  } = useAdminReturns(status || undefined);
  const reviewMutation = useAdminReviewReturnMutation();
  const [active, setActive] = useState<{
    id: string;
    decision: 'APPROVED' | 'REJECTED' | 'REFUNDED';
  } | null>(null);
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');

  const submit = () => {
    if (!active) return;
    reviewMutation.mutate(
      {
        returnId: active.id,
        status: active.decision,
        adminNote: note.trim() || undefined,
        refundAmount:
          active.decision === 'REFUNDED' && amount ? Number(amount) : undefined,
      },
      {
        onSuccess: () => {
          setActive(null);
          setNote('');
          setAmount('');
        },
      },
    );
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div>
          <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
            <RotateCcw className='w-6 h-6' />
            Returns & Refunds
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Review and refund customer return requests
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} className='flex flex-wrap gap-2'>
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size='sm'
            variant={status === tab.value ? 'default' : 'outline'}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Return Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-24 w-full' />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState
                title='Failed to load returns'
                onRetry={() => refetch()}
              />
            ) : !returns || returns.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Package className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No return requests</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-sm'>
                  There are no return requests matching this filter.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {returns.map((ret) => {
                  const cfg = statusConfig[ret.status] ?? {
                    variant: 'secondary' as const,
                    label: ret.status,
                  };
                  const pending = ret.status === 'PENDING';
                  const refundable = REFUNDABLE_SOURCES.includes(ret.status);
                  return (
                    <div
                      key={ret.id}
                      className='rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'
                    >
                      <div className='min-w-0'>
                        <p className='text-sm font-medium truncate'>
                          Order #{ret.order?.orderNumber} ·{' '}
                          {ret.shop?.name ?? 'Shop'}
                        </p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          {ret.customer?.name ?? 'Customer'} ·{' '}
                          {ret.customer?.email ?? '—'}
                        </p>
                        <p className='text-xs text-muted-foreground mt-1'>
                          {reasonLabels[ret.reason] ?? ret.reason}
                          {ret.details ? ` — ${ret.details.slice(0, 120)}` : ''}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-2 shrink-0'>
                        <Badge
                          variant={cfg.variant}
                          className='text-[10px] uppercase tracking-wider'
                        >
                          {cfg.label}
                        </Badge>
                        {pending && (
                          <>
                            <Button
                              size='sm'
                              variant='outline'
                              className='gap-1'
                              onClick={() => {
                                setActive({
                                  id: ret.id,
                                  decision: 'APPROVED',
                                });
                                setNote('');
                              }}
                            >
                              <CheckCircle2 className='w-3.5 h-3.5' />
                              Approve
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='gap-1 text-destructive'
                              onClick={() => {
                                setActive({
                                  id: ret.id,
                                  decision: 'REJECTED',
                                });
                                setNote('');
                              }}
                            >
                              <XCircle className='w-3.5 h-3.5' />
                              Reject
                            </Button>
                          </>
                        )}
                        {refundable && (
                          <Button
                            size='sm'
                            className='gap-1'
                            onClick={() => {
                              setActive({ id: ret.id, decision: 'REFUNDED' });
                              setNote('');
                              setAmount('');
                            }}
                          >
                            <RotateCcw className='w-3.5 h-3.5' />
                            Refund
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {active?.decision === 'APPROVED'
                ? 'Approve return request'
                : active?.decision === 'REJECTED'
                  ? 'Reject return request'
                  : 'Refund return request'}
            </DialogTitle>
            <DialogDescription>
              {active?.decision === 'REFUNDED'
                ? 'The order is refunded via its original payment method. Leave the amount blank to refund the remaining balance.'
                : 'This decision is final and the customer will be notified by email.'}
            </DialogDescription>
          </DialogHeader>
          {active?.decision === 'REFUNDED' && (
            <Input
              type='number'
              min='0'
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder='Amount (optional)'
            />
          )}
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Optional note to the customer'
            rows={4}
          />
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setActive(null)}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={
                active?.decision === 'REJECTED' ? 'destructive' : 'default'
              }
              onClick={submit}
              disabled={reviewMutation.isPending}
            >
              {active?.decision === 'APPROVED'
                ? 'Approve'
                : active?.decision === 'REJECTED'
                  ? 'Reject'
                  : 'Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
