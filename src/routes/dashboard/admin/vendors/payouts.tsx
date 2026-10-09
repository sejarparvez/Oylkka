import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import {
  useAdminPayouts,
  useAdminPendingPayouts,
  useProcessPayoutMutation,
} from '@/services/payouts';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/admin/vendors/payouts')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: payouts, isLoading: payoutsLoading } = useAdminPayouts();
  const { data: pending, isLoading: pendingLoading } = useAdminPendingPayouts();
  const processMutation = useProcessPayoutMutation();
  const [processingShop, setProcessingShop] = useState<string | null>(null);

  const handleProcess = async (shopId: string) => {
    setProcessingShop(shopId);
    try {
      await processMutation.mutateAsync({ shopId });
      toast.success('Payout processed successfully');
    } catch {
      toast.error('Failed to process payout');
    } finally {
      setProcessingShop(null);
    }
  };

  const isLoading = payoutsLoading || pendingLoading;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <Wallet className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Vendor Payouts
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Manage and process vendor payments
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : !pending || pending.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Wallet className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No pending payouts</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  All vendor payments have been processed.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {pending.map((shop) => (
                  <div
                    key={shop.shopId}
                    className='flex items-center justify-between p-4 rounded-lg border'
                  >
                    <div>
                      <p className='text-sm font-medium'>{shop.shopName}</p>
                      <p className='text-xs text-muted-foreground mt-0.5'>
                        {shop.pendingItems} item
                        {shop.pendingItems !== 1 ? 's' : ''}
                        {' · '}Rate: {shop.commissionRate}%
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      <span className='text-sm font-bold tabular-nums'>
                        ৳{formatBDT(shop.totalAmount)}
                      </span>
                      <Button
                        size='sm'
                        onClick={() => handleProcess(shop.shopId)}
                        disabled={processingShop === shop.shopId}
                      >
                        {processingShop === shop.shopId && (
                          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        )}
                        Process
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : !payouts || payouts.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <p className='text-sm text-muted-foreground'>No payouts yet.</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className='flex items-center justify-between p-3 rounded-lg border text-sm'
                  >
                    <div>
                      <p className='font-medium'>{p.shop?.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        {p._count?.items} items
                        {' · '}
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold tabular-nums'>
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
