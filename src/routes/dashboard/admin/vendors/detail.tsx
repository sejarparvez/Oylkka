import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Ban,
  Building2,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Percent,
  RotateCcw,
  Store,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useApproveShopMutation,
  useRejectShopMutation,
  useShopDetail,
  useSuspendShopMutation,
  useUnsuspendShopMutation,
  useUpdateCommissionRateMutation,
} from '@/services/shop';

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'ACTIVE':
      return { variant: 'default' as const, label: 'Active' };
    case 'SUSPENDED':
      return { variant: 'destructive' as const, label: 'Suspended' };
    case 'REJECTED':
      return { variant: 'destructive' as const, label: 'Rejected' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export const Route = createFileRoute('/dashboard/admin/vendors/detail')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  validateSearch: (search: Record<string, string | undefined>) => ({
    vendorId: search.vendorId ?? '',
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const isAdmin = user?.role === 'ADMIN';
  const { vendorId: vendorSlug } = Route.useSearch();
  const { data: shop, isLoading, isError } = useShopDetail(vendorSlug);
  const { mutate: approveShop, isPending: isApproving } =
    useApproveShopMutation();
  const { mutate: rejectShop, isPending: isRejecting } =
    useRejectShopMutation();
  const { mutate: suspendShop, isPending: isSuspending } =
    useSuspendShopMutation();
  const { mutate: unsuspendShop, isPending: isUnsuspending } =
    useUnsuspendShopMutation();
  const { mutate: updateCommission, isPending: isSavingCommission } =
    useUpdateCommissionRateMutation();
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [commissionRate, setCommissionRate] = useState('');

  useEffect(() => {
    if (shop?.commissionRate !== undefined) {
      setCommissionRate(String(Number(shop.commissionRate)));
    }
  }, [shop?.commissionRate]);

  const goBack = () =>
    navigate({
      to: '/dashboard/admin/vendors/',
      // biome-ignore lint/suspicious/noExplicitAny: navigate type limitations with index routes
    } as any);

  if (!vendorSlug) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <p className='text-sm text-muted-foreground'>No vendor selected.</p>
        <Button variant='outline' onClick={goBack}>
          <ArrowLeft className='w-4 h-4' />
          Back to Vendors
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='max-w-4xl mx-auto container space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-64 rounded-2xl' />
        <Skeleton className='h-40 rounded-2xl' />
      </div>
    );
  }

  if (isError || !shop) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <div className='w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center'>
          <Loader2 className='w-6 h-6 text-destructive' />
        </div>
        <p className='text-sm font-semibold'>Vendor not found</p>
        <p className='text-sm text-muted-foreground max-w-xs'>
          The vendor shop you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </p>
        <Button variant='outline' onClick={goBack}>
          <ArrowLeft className='w-4 h-4' />
          Back to Vendors
        </Button>
      </div>
    );
  }

  const { variant: badgeVariant, label: badgeLabel } = statusBadge(shop.status);

  return (
    <div className='max-w-4xl mx-auto container'>
      <div className='mb-6'>
        <Button variant='ghost' size='sm' onClick={goBack} className='mb-4'>
          <ArrowLeft className='w-4 h-4' />
          Back to Vendors
        </Button>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{shop.name}</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Vendor application details
            </p>
          </div>
          <Badge
            variant={badgeVariant}
            className='text-xs uppercase tracking-wider'
          >
            {badgeLabel}
          </Badge>
        </div>
      </div>

      <div className='space-y-6'>
        <div className='rounded-2xl border border-border bg-card p-6 space-y-6'>
          <h2 className='text-sm font-semibold flex items-center gap-2'>
            <Building2 className='w-4 h-4 text-primary' />
            Shop Information
          </h2>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>Name</p>
              <p className='text-sm font-medium'>{shop.name}</p>
            </div>
            {shop.description && (
              <div className='md:col-span-2'>
                <p className='text-xs text-muted-foreground'>Description</p>
                <p className='text-sm'>{shop.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-border bg-card p-6 space-y-6'>
          <h2 className='text-sm font-semibold flex items-center gap-2'>
            <Mail className='w-4 h-4 text-primary' />
            Contact
          </h2>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>Email</p>
              <p className='text-sm font-medium'>{shop.email}</p>
            </div>
            {shop.phone && (
              <div>
                <p className='text-xs text-muted-foreground'>Phone</p>
                <p className='text-sm font-medium'>{shop.phone}</p>
              </div>
            )}
            {shop.website && (
              <div>
                <p className='text-xs text-muted-foreground'>Website</p>
                <p className='text-sm font-medium'>{shop.website}</p>
              </div>
            )}
          </div>
        </div>

        {(shop.addressLine1 || shop.city) && (
          <div className='rounded-2xl border border-border bg-card p-6 space-y-6'>
            <h2 className='text-sm font-semibold flex items-center gap-2'>
              <MapPin className='w-4 h-4 text-primary' />
              Address
            </h2>
            <p className='text-sm'>
              {[
                shop.addressLine1,
                shop.addressLine2,
                shop.city,
                shop.state,
                shop.country,
                shop.postalCode,
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        )}

        <div className='rounded-2xl border border-border bg-card p-6 space-y-6'>
          <h2 className='text-sm font-semibold flex items-center gap-2'>
            <Store className='w-4 h-4 text-primary' />
            Owner
          </h2>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>Name</p>
              <p className='text-sm font-medium'>{shop.owner.name}</p>
            </div>
            <div>
              <p className='text-xs text-muted-foreground'>Email</p>
              <p className='text-sm font-medium'>{shop.owner.email}</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className='rounded-2xl border border-border bg-card p-6 space-y-4'>
            <h2 className='text-sm font-semibold flex items-center gap-2'>
              <Percent className='w-4 h-4 text-primary' />
              Commission
            </h2>
            <div className='flex items-end gap-3'>
              <div className='space-y-2'>
                <p className='text-xs text-muted-foreground'>
                  Platform commission rate (%)
                </p>
                <Input
                  type='number'
                  min={0}
                  max={100}
                  step={0.5}
                  className='w-32'
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                />
              </div>
              <Button
                variant='outline'
                disabled={
                  isSavingCommission ||
                  !commissionRate ||
                  Number(commissionRate) === Number(shop.commissionRate)
                }
                onClick={() =>
                  updateCommission({
                    shopId: shop.id,
                    commissionRate: Number(commissionRate),
                  })
                }
              >
                {isSavingCommission && (
                  <Loader2 className='w-3.5 h-3.5 mr-2 animate-spin' />
                )}
                Save
              </Button>
            </div>
            <p className='text-xs text-muted-foreground'>
              Applied to every future order item from this shop. Cannot be
              changed by the vendor.
            </p>
          </div>
        )}

        <div className='rounded-2xl border border-border bg-card p-6 space-y-6'>
          <h2 className='text-sm font-semibold flex items-center gap-2'>
            <Clock className='w-4 h-4 text-primary' />
            Timeline
          </h2>
          <div className='grid gap-4 md:grid-cols-2'>
            <div>
              <p className='text-xs text-muted-foreground'>Applied</p>
              <p className='text-sm font-medium'>
                {format(new Date(shop.createdAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            {shop.approvedAt && (
              <div>
                <p className='text-xs text-muted-foreground'>Approved</p>
                <p className='text-sm font-medium'>
                  {format(new Date(shop.approvedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>
        </div>

        {isAdmin && shop.status === 'PENDING' && (
          <div className='flex gap-3 pt-2'>
            <Button
              className='flex-1 rounded-xl h-11 gap-2'
              disabled={isApproving}
              onClick={() => approveShop(shop.id)}
            >
              {isApproving && <Loader2 className='w-4 h-4 animate-spin' />}
              Approve Shop
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='outline'
                  className='flex-1 rounded-xl h-11 gap-2 text-destructive hover:text-destructive'
                >
                  Reject Shop
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size='sm'>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Reject &ldquo;{shop.name}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Provide a reason for rejection. The vendor will see this
                    message.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-2'>
                  <Input
                    placeholder='Reason for rejection...'
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant='destructive'
                    disabled={isRejecting || !rejectReason.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      rejectShop({
                        id: shop.id,
                        rejectionReason: rejectReason.trim(),
                      });
                    }}
                  >
                    {isRejecting && (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    )}
                    Reject
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {isAdmin && shop.status === 'ACTIVE' && (
          <div className='pt-2'>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='outline'
                  className='w-full rounded-xl h-11 gap-2 text-destructive hover:text-destructive'
                >
                  <Ban className='w-4 h-4' />
                  Suspend Shop
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size='sm'>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Suspend &ldquo;{shop.name}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    The shop will be hidden from customers and the vendor will
                    be notified with this reason.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-2'>
                  <Input
                    placeholder='Reason for suspension...'
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant='destructive'
                    disabled={isSuspending || !suspendReason.trim()}
                    onClick={(e) => {
                      e.preventDefault();
                      suspendShop({
                        id: shop.id,
                        reason: suspendReason.trim(),
                      });
                      setSuspendReason('');
                    }}
                  >
                    {isSuspending && (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    )}
                    Suspend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {shop.status === 'SUSPENDED' && (
          <div className='space-y-4 pt-2'>
            {shop.suspendedReason && (
              <div className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4'>
                <p className='text-xs font-semibold text-destructive mb-1'>
                  Suspension Reason
                </p>
                <p className='text-sm'>{shop.suspendedReason}</p>
              </div>
            )}
            {isAdmin && (
              <Button
                className='w-full rounded-xl h-11 gap-2'
                disabled={isUnsuspending}
                onClick={() => unsuspendShop(shop.id)}
              >
                {isUnsuspending && <Loader2 className='w-4 h-4 animate-spin' />}
                <RotateCcw className='w-4 h-4' />
                Reinstate Shop
              </Button>
            )}
          </div>
        )}

        {shop.status === 'REJECTED' && shop.rejectionReason && (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4'>
            <p className='text-xs font-semibold text-destructive mb-1'>
              Rejection Reason
            </p>
            <p className='text-sm'>{shop.rejectionReason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
