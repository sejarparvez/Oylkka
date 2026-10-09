import { createFileRoute } from '@tanstack/react-router';
import { DollarSign, Package, Percent, Wallet } from 'lucide-react';
import { motion } from 'motion/react';

import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useVendorPayouts, useVendorPendingPayout } from '@/services/payouts';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/payouts/')({
  component: RouteComponent,
});

function RouteComponent() {
  const {
    data: payouts,
    isLoading: payoutsLoading,
    isError: payoutsError,
    refetch: refetchPayouts,
  } = useVendorPayouts();
  const {
    data: pending,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = useVendorPendingPayout();

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
      <motion.div
        className='flex items-center gap-2'
        variants={fadeUp}
        custom={0}
      >
        <Wallet className='w-6 h-6' />
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Payouts</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Track your earnings and payout history
          </p>
        </div>
      </motion.div>

      <motion.div
        className='grid grid-cols-1 sm:grid-cols-3 gap-4'
        variants={fadeUp}
        custom={1}
      >
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <DollarSign className='w-4 h-4' />
              Pending Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <Skeleton className='h-8 w-24' />
            ) : pendingError ? (
              <QueryErrorState
                title='Failed to load pending balance'
                onRetry={() => refetchPending()}
              />
            ) : (
              <p className='text-2xl font-bold'>
                ৳{formatBDT(pending?.totalPending ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <Package className='w-4 h-4' />
              Items Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <Skeleton className='h-8 w-16' />
            ) : pendingError ? (
              <QueryErrorState
                title='Failed to load pending items'
                onRetry={() => refetchPending()}
              />
            ) : (
              <p className='text-2xl font-bold'>{pending?.pendingItems ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground flex items-center gap-2'>
              <Percent className='w-4 h-4' />
              Total Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <Skeleton className='h-8 w-24' />
            ) : pendingError ? (
              <QueryErrorState
                title='Failed to load commission'
                onRetry={() => refetchPending()}
              />
            ) : (
              <p className='text-2xl font-bold'>
                ৳{formatBDT(pending?.totalCommission ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payoutsLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-14 w-full' />
                ))}
              </div>
            ) : payoutsError ? (
              <QueryErrorState
                title='Failed to load payouts'
                onRetry={() => refetchPayouts()}
              />
            ) : !payouts || payouts.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Wallet className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No payouts yet</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-sm'>
                  Payouts are processed by the admin after items are delivered.
                </p>
              </div>
            ) : (
              <div className='space-y-2'>
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className='flex items-center justify-between p-4 rounded-lg border'
                  >
                    <div>
                      <p className='text-sm font-medium'>
                        {new Date(p.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {p._count?.items} item{p._count?.items !== 1 ? 's' : ''}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm font-bold tabular-nums'>
                        ৳{formatBDT(p.amount)}
                      </span>
                      <Badge
                        variant={
                          p.status === 'COMPLETED' ? 'default' : 'secondary'
                        }
                        className='text-[10px] uppercase'
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
