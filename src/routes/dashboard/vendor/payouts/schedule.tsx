import { createFileRoute } from '@tanstack/react-router';
import { Calendar, DollarSign, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useVendorPayoutSchedule } from '@/services/payouts';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/payouts/schedule')({
  component: RouteComponent,
});

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function RouteComponent() {
  const { data, isLoading } = useVendorPayoutSchedule();

  const summary = data?.summary;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <Calendar className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Payout Schedule
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Estimated payout dates and pending earnings
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={fadeUp}
        custom={1}
        className='grid grid-cols-1 sm:grid-cols-3 gap-4'
      >
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className='pb-2'>
                <Skeleton className='h-4 w-20' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-8 w-16' />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Pending Items
                </CardTitle>
                <Package className='w-5 h-5 text-blue-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {summary?.pendingItems ?? 0}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  Delivered orders awaiting payout
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Estimated Payout
                </CardTitle>
                <DollarSign className='w-5 h-5 text-emerald-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold tabular-nums'>
                  ৳{formatBDT(summary?.totalPending ?? 0)}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  Commission: ৳{formatBDT(summary?.totalCommission ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  Last Payout
                </CardTitle>
                <Calendar className='w-5 h-5 text-violet-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold tabular-nums'>
                  {summary?.lastPayoutDate
                    ? new Date(summary.lastPayoutDate).toLocaleDateString()
                    : 'N/A'}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {summary?.lastPayoutAmount
                    ? `৳${formatBDT(summary.lastPayoutAmount)}`
                    : 'No payouts yet'}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Projected Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : !data?.schedule || data.schedule.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Calendar className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No pending payouts</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-sm'>
                  Payouts are processed for delivered orders. Once orders are
                  delivered, they will appear here with estimated payout dates.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {data.schedule.map((entry) => {
                  const [y, m] = entry.month.split('-');
                  const monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                  const isPast =
                    entry.estimatedDate < new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={entry.month}
                      className='flex items-center justify-between p-4 rounded-lg border'
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <p className='text-sm font-medium'>{monthLabel}</p>
                          <Badge
                            variant={isPast ? 'default' : 'secondary'}
                            className='text-[10px] uppercase'
                          >
                            {isPast ? 'Due' : 'Estimated'}
                          </Badge>
                        </div>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          {entry.items} item{entry.items !== 1 ? 's' : ''}
                          {' · Est. '}
                          {new Date(entry.estimatedDate).toLocaleDateString(
                            'en-US',
                            {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            },
                          )}
                        </p>
                      </div>
                      <div className='text-right ml-3'>
                        <p className='text-sm font-bold tabular-nums'>
                          ৳{formatBDT(entry.totalAmount)}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Commission: ৳{formatBDT(entry.totalCommission)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
