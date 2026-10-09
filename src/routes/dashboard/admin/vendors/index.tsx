import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  Ban,
  CheckCircle,
  Eye,
  Loader2,
  RotateCcw,
  Search,
  Store,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

import { QueryErrorState } from '@/components/query-state';
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
  type AdminShopResponse,
  useAdminShops,
  useApproveShopMutation,
  useRejectShopMutation,
  useSuspendShopMutation,
  useUnsuspendShopMutation,
} from '@/services/shop';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Rejected', value: 'REJECTED' },
] as const;

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

export const Route = createFileRoute('/dashboard/admin/vendors/')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { status?: string } => ({
    status: search.status,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { status: statusParam } = Route.useSearch();
  const isAdmin = user?.role === 'ADMIN';
  const status =
    statusParam && STATUS_TABS.some((t) => t.value === statusParam)
      ? statusParam
      : '';
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const {
    data: shops,
    isLoading,
    isError,
    refetch,
  } = useAdminShops(status, debouncedSearch || undefined);
  const { mutate: approveShop, isPending: isApproving } =
    useApproveShopMutation();
  const { mutate: rejectShop, isPending: isRejecting } =
    useRejectShopMutation();
  const { mutate: suspendShop, isPending: isSuspending } =
    useSuspendShopMutation();
  const { mutate: unsuspendShop, isPending: isUnsuspending } =
    useUnsuspendShopMutation();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const handleStatusChange = (newStatus: string) => {
    navigate({
      to: '/dashboard/admin/vendors',
      search: newStatus ? { status: newStatus } : {},
    });
  };

  const handleReject = () => {
    if (rejectId && rejectReason.trim()) {
      rejectShop({ id: rejectId, rejectionReason: rejectReason.trim() });
      setRejectId(null);
      setRejectReason('');
    }
  };

  const handleSuspend = () => {
    if (suspendId && suspendReason.trim()) {
      suspendShop({ id: suspendId, reason: suspendReason.trim() });
      setSuspendId(null);
      setSuspendReason('');
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Vendors</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage vendor shops and applications
          </p>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex gap-1'>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={status === tab.value ? 'default' : 'outline'}
              size='sm'
              className='rounded-lg'
              onClick={() => handleStatusChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search shops...'
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>
      </div>

      {isLoading && (
        <div className='space-y-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className='h-20 rounded-2xl' />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <QueryErrorState
          title='Failed to load vendors'
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && shops?.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Store className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>
              {status ? `No ${status.toLowerCase()} shops` : 'No shops yet'}
            </p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              {status === 'PENDING'
                ? 'No pending applications to review.'
                : 'Shops will appear here once vendors apply.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && shops && shops.length > 0 && (
        <div className='space-y-3'>
          {shops.map((shop) => (
            <VendorRow
              key={shop.id}
              shop={shop}
              canManage={isAdmin}
              onApprove={() => approveShop(shop.id)}
              onReject={() => setRejectId(shop.id)}
              onSuspend={() => setSuspendId(shop.id)}
              onUnsuspend={() => unsuspendShop(shop.id)}
              isApproving={isApproving || isUnsuspending}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!suspendId}
        onOpenChange={(open) => {
          if (!open) {
            setSuspendId(null);
            setSuspendReason('');
          }
        }}
      >
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend shop?</AlertDialogTitle>
            <AlertDialogDescription>
              The shop will be hidden from customers and the vendor will be
              notified with this reason.
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
                handleSuspend();
              }}
            >
              {isSuspending && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
              Suspend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null);
            setRejectReason('');
          }
        }}
      >
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject shop?</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for rejection. The vendor will see this message.
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
                handleReject();
              }}
            >
              {isRejecting && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VendorRow({
  shop,
  canManage,
  onApprove,
  onReject,
  onSuspend,
  onUnsuspend,
  isApproving,
}: {
  shop: AdminShopResponse;
  canManage: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  isApproving: boolean;
}) {
  const navigate = useNavigate();
  const [approveOpen, setApproveOpen] = useState(false);
  const { variant, label } = statusBadge(shop.status);

  return (
    <div className='rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors duration-200'>
      <div className='flex-1 min-w-0 grid grid-cols-4 gap-4 items-center'>
        <div className='col-span-1'>
          <p className='text-sm font-semibold truncate'>{shop.name}</p>
          <p className='text-xs text-muted-foreground truncate'>
            {shop.owner.name}
          </p>
        </div>
        <div className='col-span-1'>
          <p className='text-xs text-muted-foreground truncate'>
            {shop.owner.email}
          </p>
        </div>
        <div className='col-span-1'>
          <Badge
            variant={variant}
            className='text-[10px] uppercase tracking-wider'
          >
            {label}
          </Badge>
        </div>
        <div className='col-span-1'>
          <p className='text-xs text-muted-foreground'>
            {format(new Date(shop.createdAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        <Button
          variant='ghost'
          size='icon'
          className='w-8 h-8 rounded-lg'
          onClick={(_e) =>
            navigate({
              to: '/dashboard/admin/vendors/detail',
              search: { vendorId: shop.slug },
            })
          }
        >
          <Eye className='w-3.5 h-3.5' />
        </Button>
        {canManage && shop.status === 'PENDING' && (
          <>
            <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='w-8 h-8 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50'
                >
                  <CheckCircle className='w-3.5 h-3.5' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size='sm'>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Approve &ldquo;{shop.name}&rdquo;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will activate the shop and grant the vendor access to
                    vendor features.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isApproving}
                    onClick={(e) => {
                      e.preventDefault();
                      onApprove();
                    }}
                  >
                    {isApproving && (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    )}
                    Approve
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant='ghost'
              size='icon'
              className='w-8 h-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={onReject}
            >
              <XCircle className='w-3.5 h-3.5' />
            </Button>
          </>
        )}
        {canManage && shop.status === 'ACTIVE' && (
          <Button
            variant='ghost'
            size='icon'
            className='w-8 h-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10'
            title='Suspend shop'
            onClick={onSuspend}
          >
            <Ban className='w-3.5 h-3.5' />
          </Button>
        )}
        {canManage && shop.status === 'SUSPENDED' && (
          <Button
            variant='ghost'
            size='icon'
            className='w-8 h-8 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50'
            title='Reinstate shop'
            disabled={isApproving}
            onClick={onUnsuspend}
          >
            {isApproving ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <RotateCcw className='w-3.5 h-3.5' />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
