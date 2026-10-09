import { Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBDT } from '@/lib/currency';
import {
  type ProductVoucher,
  useCollectVoucher,
  useProductVouchers,
} from '@/services/voucher';

function voucherLabel(voucher: ProductVoucher): string {
  if (voucher.freeShipping) {
    return voucher.shippingDiscount > 0
      ? `৳${formatBDT(voucher.shippingDiscount)} off shipping`
      : 'Free shipping';
  }
  switch (voucher.type) {
    case 'PERCENTAGE':
      return `${voucher.value}% off`;
    case 'CASHBACK':
      return `৳${formatBDT(voucher.value)} cashback`;
    case 'FIXED':
      return `৳${formatBDT(voucher.value)} off`;
    default:
      return `৳${formatBDT(voucher.value)} off`;
  }
}

export function ProductVouchers({ productId }: { productId: string }) {
  const { data: vouchers, isLoading } = useProductVouchers(productId);
  const collect = useCollectVoucher();

  if (isLoading || !vouchers || vouchers.length === 0) return null;

  return (
    <div className='rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3'>
      <p className='text-sm font-semibold flex items-center gap-2'>
        <Ticket className='w-4 h-4 text-primary' />
        Available vouchers
      </p>
      <div className='space-y-2'>
        {vouchers.map((voucher) => (
          <div
            key={voucher.id}
            className='flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2'
          >
            <div className='min-w-0'>
              <p className='text-xs font-semibold'>{voucherLabel(voucher)}</p>
              <p className='text-[11px] text-muted-foreground'>
                {voucher.description || `Code: ${voucher.code}`}
              </p>
              {voucher.minOrderAmount !== null && (
                <p className='text-[11px] text-muted-foreground'>
                  Min. order ৳{formatBDT(voucher.minOrderAmount)}
                </p>
              )}
            </div>
            {voucher.isCollected ? (
              <Badge variant='secondary' className='shrink-0'>
                Collected
              </Badge>
            ) : (
              <Button
                size='sm'
                variant='outline'
                className='shrink-0 h-7 text-xs'
                disabled={collect.isPending}
                onClick={() => collect.mutate(voucher.id)}
              >
                Collect
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
