import { createFileRoute, Navigate } from '@tanstack/react-router';

import { ShopForm } from '@/components/forms/shop-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyShop } from '@/services/shop';

export const Route = createFileRoute('/dashboard/become-vendor/apply')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: shop, isLoading } = useMyShop();

  if (isLoading) {
    return (
      <div className='max-w-4xl mx-auto container space-y-6'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-20' />
          <Skeleton className='h-10 w-64' />
          <Skeleton className='h-4 w-96' />
        </div>
        <div className='grid gap-6 md:grid-cols-2'>
          <Skeleton className='h-80 rounded-2xl' />
          <Skeleton className='h-80 rounded-2xl' />
        </div>
        <Skeleton className='h-52 rounded-2xl' />
      </div>
    );
  }

  if (shop?.status === 'PENDING') {
    return <Navigate to='/dashboard/become-vendor/pending' />;
  }

  if (shop?.status === 'ACTIVE') {
    return <Navigate to='/dashboard/vendor' />;
  }

  if (shop?.status === 'REJECTED') {
    return (
      <div className='max-w-4xl mx-auto container space-y-6'>
        <div className='rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-2'>
          <h2 className='text-lg font-bold text-destructive'>
            Your previous application was rejected
          </h2>
          <p className='text-sm text-muted-foreground'>
            {shop.rejectionReason
              ? `Reason: ${shop.rejectionReason}`
              : 'Your shop application has been rejected.'}
          </p>
          <p className='text-sm text-muted-foreground'>
            Fix the issues above and submit again — your new application will be
            reviewed by an admin.
          </p>
        </div>
        <ShopForm mode='create' />
      </div>
    );
  }

  return <ShopForm mode='create' />;
}
