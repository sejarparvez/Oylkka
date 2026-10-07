import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { Clock, Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyShop } from '@/services/shop';

export const Route = createFileRoute('/dashboard/become-vendor/pending')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: shop, isLoading, refetch } = useMyShop();
  const isPending = shop?.status === 'PENDING';

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [isPending, refetch]);

  if (isLoading) {
    return (
      <div className='max-w-lg mx-auto container py-20'>
        <Skeleton className='h-64 rounded-2xl' />
      </div>
    );
  }

  if (!shop) {
    return <Navigate to='/dashboard/become-vendor/apply' />;
  }

  if (shop.status === 'REJECTED') {
    return (
      <div className='max-w-lg mx-auto container py-20'>
        <div className='rounded-2xl border border-border bg-card p-8 text-center space-y-4'>
          <div className='w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto'>
            <Loader2 className='w-7 h-7 text-destructive' />
          </div>
          <h2 className='text-xl font-bold'>Application Rejected</h2>
          <p className='text-sm text-muted-foreground'>
            {shop.rejectionReason
              ? `Reason: ${shop.rejectionReason}`
              : 'Your shop application has been rejected.'}
          </p>
          <Button
            variant='outline'
            onClick={() => navigate({ to: '/dashboard/become-vendor/apply' })}
          >
            Apply Again
          </Button>
        </div>
      </div>
    );
  }

  if (shop.status !== 'PENDING') {
    return <Navigate to='/dashboard/vendor' />;
  }

  return (
    <div className='max-w-lg mx-auto container py-20'>
      <div className='rounded-2xl border border-border bg-card p-8 text-center space-y-4'>
        <div className='w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto'>
          <Clock className='w-7 h-7 text-primary' />
        </div>
        <h2 className='text-xl font-bold'>Application Submitted</h2>
        <p className='text-sm text-muted-foreground'>
          Your shop application has been submitted and is awaiting admin review.
          We&apos;ll notify you once it&apos;s approved. This page will
          automatically refresh.
        </p>
        <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
          <Loader2 className='w-3 h-3 animate-spin' />
          Waiting for approval...
        </div>
      </div>
    </div>
  );
}
