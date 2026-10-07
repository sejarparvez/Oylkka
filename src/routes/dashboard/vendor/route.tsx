import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AlertTriangle, XCircle } from 'lucide-react';
import { RouteErrorBoundary } from '@/components/error-boundary';
import { useMyShop } from '@/services/shop';

export const Route = createFileRoute('/dashboard/vendor')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  errorComponent: RouteErrorBoundary,
  component: RouteComponent,
});

function RouteComponent() {
  const { data: shop } = useMyShop();

  return (
    <div>
      {shop && shop.status !== 'ACTIVE' && <ShopStatusBanner shop={shop} />}
      <Outlet />
    </div>
  );
}

function ShopStatusBanner({
  shop,
}: {
  shop: NonNullable<ReturnType<typeof useMyShop>['data']>;
}) {
  if (shop.status === 'PENDING') {
    return (
      <div className='mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 md:mx-6'>
        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' />
        <div>
          <p className='font-semibold'>Your shop is pending approval.</p>
          <p className='mt-0.5 text-amber-800'>
            Some actions are unavailable until an admin approves your
            application.
          </p>
        </div>
      </div>
    );
  }

  if (shop.status === 'REJECTED') {
    return (
      <div className='mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive md:mx-6'>
        <XCircle className='mt-0.5 h-4 w-4 shrink-0' />
        <div>
          <p className='font-semibold'>Your shop application was rejected.</p>
          {shop.rejectionReason && (
            <p className='mt-0.5'>{shop.rejectionReason}</p>
          )}
          <Link
            to='/dashboard/become-vendor/apply'
            className='mt-1 inline-block font-medium underline underline-offset-2'
          >
            Fix the issues and re-apply
          </Link>
        </div>
      </div>
    );
  }

  if (shop.status === 'SUSPENDED') {
    return (
      <div className='mx-4 mt-4 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive md:mx-6'>
        <XCircle className='mt-0.5 h-4 w-4 shrink-0' />
        <div>
          <p className='font-semibold'>Your shop is suspended.</p>
          {shop.suspendedReason && (
            <p className='mt-0.5'>{shop.suspendedReason}</p>
          )}
          <p className='mt-0.5'>
            Selling actions are disabled. Contact support to request
            reinstatement.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
