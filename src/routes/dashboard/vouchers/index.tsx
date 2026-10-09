import { createFileRoute, Link } from '@tanstack/react-router';
import { Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { QueryErrorState } from '@/components/query-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import type { VoucherCoupon } from '@/services/voucher';
import { useMyVouchers } from '@/services/voucher';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

function voucherLabel(coupon: VoucherCoupon): string {
  if (coupon.freeShipping) {
    return coupon.shippingDiscount > 0
      ? `৳${formatBDT(coupon.shippingDiscount)} off shipping`
      : 'Free shipping';
  }
  switch (coupon.type) {
    case 'PERCENTAGE':
      return `${coupon.value}% off`;
    case 'CASHBACK':
      return `৳${formatBDT(coupon.value)} cashback`;
    default:
      return `৳${formatBDT(coupon.value)} off`;
  }
}

export const Route = createFileRoute('/dashboard/vouchers/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: vouchers, isLoading, isError, refetch } = useMyVouchers();

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
            <Ticket className='w-6 h-6' />
            My Vouchers
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Vouchers you have collected. Apply them at checkout for a discount.
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className='grid gap-4 sm:grid-cols-2'>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className='h-32 w-full rounded-2xl' />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState
          title='Failed to load vouchers'
          onRetry={() => refetch()}
        />
      ) : !vouchers || vouchers.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Ticket className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No vouchers yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Collect vouchers from product pages to see them here.
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/shops'>Browse Products</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          variants={fadeUp}
          custom={1}
          className='grid gap-4 sm:grid-cols-2'
        >
          {vouchers.map((voucher) => (
            <Card key={voucher.id} className='overflow-hidden'>
              <CardContent className='p-5 space-y-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-lg font-bold'>
                      {voucherLabel(voucher.coupon)}
                    </p>
                    <p className='text-xs text-muted-foreground mt-0.5'>
                      {voucher.coupon.description || 'Voucher'}
                    </p>
                  </div>
                  <Badge variant='secondary' className='shrink-0 font-mono'>
                    {voucher.coupon.code}
                  </Badge>
                </div>
                <div className='flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground'>
                  {voucher.coupon.minOrderAmount !== null && (
                    <span>
                      Min. order ৳{formatBDT(voucher.coupon.minOrderAmount)}
                    </span>
                  )}
                  {voucher.coupon.expiresAt && (
                    <span>
                      Expires{' '}
                      {new Date(voucher.coupon.expiresAt).toLocaleDateString(
                        'en-GB',
                      )}
                    </span>
                  )}
                  {voucher.coupon.autoApply && (
                    <span>Auto-applies at checkout</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
