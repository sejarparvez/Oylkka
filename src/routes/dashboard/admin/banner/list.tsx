import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  CalendarDays,
  Loader2,
  PanelRightOpen,
  Pencil,
  Plus,
  Trash2,
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  type AdminBanner,
  useAdminBanners,
  useDeleteBannerMutation,
} from '@/services/banner';

export const Route = createFileRoute('/dashboard/admin/banner/list')({
  beforeLoad: ({ context }) => {
    if (!context.user.role || context.user.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: banners, isLoading, isError, refetch } = useAdminBanners();
  const { mutate: deleteBanner, isPending: isDeleting } =
    useDeleteBannerMutation();

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Banners</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage all hero banners
          </p>
        </div>
        <Button asChild>
          <Link to='/dashboard/admin/banner/add'>
            <Plus className='w-4 h-4' />
            Create Banner
          </Link>
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading has no stable id
            <BannerCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <QueryErrorState
          title='Failed to load banners'
          onRetry={() => refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && banners?.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <PanelRightOpen className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No banners yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Get started by creating your first hero banner.
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/dashboard/admin/banner/add'>
              <Plus className='w-4 h-4' />
              Create Banner
            </Link>
          </Button>
        </div>
      )}

      {/* Banner grid */}
      {!isLoading && banners && banners.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              deleteBanner={deleteBanner}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerCard({
  banner,
  deleteBanner,
  isDeleting,
}: {
  banner: AdminBanner;
  deleteBanner: (id: string) => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasDateRange = banner.startDate || banner.endDate;

  return (
    <div className='group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors duration-200'>
      {/* Image */}
      <div className='relative aspect-[2/1] bg-muted overflow-hidden'>
        <img
          src={banner.imageUrl}
          alt={banner.title}
          width={800}
          height={400}
          loading='lazy'
          decoding='async'
          className='object-cover w-full h-full group-hover:scale-105 transition-transform duration-500'
        />
        {/* Actions — overlay top-right */}
        <div className='absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200'>
          <Button
            variant='ghost'
            size='icon'
            className='w-8 h-8 bg-background/80 backdrop-blur-sm hover:bg-background rounded-lg'
            asChild
          >
            <Link
              to='/dashboard/admin/banner/edit'
              search={{ bannerId: banner.id }}
            >
              <Pencil className='w-3.5 h-3.5' />
            </Link>
          </Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='w-8 h-8 bg-background/80 backdrop-blur-sm hover:bg-background hover:text-destructive rounded-lg'
              >
                <Trash2 className='w-3.5 h-3.5' />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size='sm'>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete banner?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{banner.title}&rdquo; and
                  its image. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteBanner(banner.id);
                  }}
                >
                  {isDeleting && (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  )}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Body */}
      <div className='p-4 space-y-3'>
        {/* Tag + Position badges */}
        <div className='flex items-center gap-2'>
          {banner.bannerTag && (
            <Badge
              variant='secondary'
              className='text-[10px] uppercase tracking-wider'
            >
              {banner.bannerTag}
            </Badge>
          )}
          <Badge variant='outline' className='text-[10px]'>
            {banner.bannerPosition.replace(/_/g, ' ')}
          </Badge>
          <span
            className={cn(
              'text-[10px] font-medium ml-auto',
              banner.isActive ? 'text-green-600' : 'text-muted-foreground',
            )}
          >
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Title */}
        <h3 className='text-sm font-semibold leading-snug line-clamp-1'>
          {banner.title}
        </h3>

        {/* Subtitle or description */}
        {(banner.subTitle || banner.description) && (
          <p className='text-xs text-muted-foreground leading-relaxed line-clamp-2'>
            {banner.subTitle ?? banner.description}
          </p>
        )}

        {/* Date range */}
        {hasDateRange && (
          <div className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
            <CalendarDays className='w-3 h-3' />
            {banner.startDate && (
              <span>{format(new Date(banner.startDate), 'MMM d, yyyy')}</span>
            )}
            {banner.startDate && banner.endDate && <span>–</span>}
            {banner.endDate && (
              <span>{format(new Date(banner.endDate), 'MMM d, yyyy')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BannerCardSkeleton() {
  return (
    <div className='rounded-2xl border border-border overflow-hidden'>
      <Skeleton className='aspect-[2/1] w-full' />
      <div className='p-4 space-y-3'>
        <div className='flex gap-2'>
          <Skeleton className='h-5 w-16 rounded-full' />
          <Skeleton className='h-5 w-20 rounded-full' />
        </div>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-full' />
        <Skeleton className='h-3 w-24' />
        <div className='flex justify-end gap-1 pt-2 border-t border-border'>
          <Skeleton className='h-8 w-8 rounded-lg' />
          <Skeleton className='h-8 w-8 rounded-lg' />
        </div>
      </div>
    </div>
  );
}
