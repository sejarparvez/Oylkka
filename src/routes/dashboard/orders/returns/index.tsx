import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Package, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { useMyReturns } from '@/services/returns';

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

export const Route = createFileRoute('/dashboard/orders/returns/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: returns, isLoading } = useMyReturns();

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
        <div className='flex items-center gap-3 mb-1'>
          <Button variant='ghost' size='icon' asChild className='shrink-0'>
            <Link to='/dashboard/orders'>
              <ArrowLeft className='w-4 h-4' />
            </Link>
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
              <RotateCcw className='w-6 h-6' />
              Returns & Refunds
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Track your return requests and refunds
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Return Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-20 w-full' />
                ))}
              </div>
            ) : !returns || returns.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Package className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No return requests</p>
                <p className='text-sm text-muted-foreground mt-1 max-w-sm'>
                  You haven&apos;t requested any returns yet. Return a delivered
                  order within {RETURN_WINDOW_DAYS} days.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {returns.map((ret) => {
                  const cfg = statusConfig[ret.status] ?? {
                    variant: 'secondary' as const,
                    label: ret.status,
                  };
                  return (
                    <Link
                      key={ret.id}
                      to='/dashboard/orders/returns/$returnId'
                      params={{ returnId: ret.id }}
                      className='block'
                    >
                      <div className='rounded-lg border p-4 hover:bg-accent/50 transition-colors'>
                        <div className='flex items-start justify-between gap-4'>
                          <div className='min-w-0'>
                            <p className='text-sm font-medium truncate'>
                              Order #{ret.order?.orderNumber}
                            </p>
                            <p className='text-xs text-muted-foreground mt-0.5'>
                              {ret.details
                                ? ret.details.slice(0, 80)
                                : `Reason: ${ret.reason}`}
                            </p>
                          </div>
                          <Badge
                            variant={cfg.variant}
                            className='shrink-0 text-[10px] uppercase tracking-wider'
                          >
                            {cfg.label}
                          </Badge>
                        </div>
                      </div>
                    </Link>
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
