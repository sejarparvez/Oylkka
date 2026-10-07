import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminGlobalAttributes,
  useDeleteGlobalAttributeMutation,
} from '@/services/admin-global-attributes';

export const Route = createFileRoute('/dashboard/admin/global-attributes/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useAdminGlobalAttributes({
    search,
  });
  const { mutate: deleteAttribute, isPending: isDeleting } =
    useDeleteGlobalAttributeMutation();

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Global Attributes
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage the shared attribute catalog for cross-vendor filtering
          </p>
        </div>
        <Button asChild>
          <Link to='/dashboard/admin/global-attributes/create'>
            <Plus className='w-4 h-4' />
            Create Attribute
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className='max-w-sm'>
        <Input
          placeholder='Search attributes...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className='h-40 rounded-2xl' />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <QueryErrorState
          title='Failed to load attributes'
          onRetry={() => refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && data?.attributes.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Tag className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No global attributes yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Create your first global attribute to enable cross-vendor product
              filtering.
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/dashboard/admin/global-attributes/create'>
              <Plus className='w-4 h-4' />
              Create Attribute
            </Link>
          </Button>
        </div>
      )}

      {/* Attribute grid */}
      {!isLoading && data && data.attributes.length > 0 && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {data.attributes.map((attr) => {
            const linkedCount = attr._count?.productLinks ?? 0;
            return (
              <Card key={attr.id} className='group relative'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div>
                      <CardTitle className='text-base'>{attr.name}</CardTitle>
                      <p className='text-xs text-muted-foreground font-mono mt-0.5'>
                        {attr.slug}
                      </p>
                    </div>
                    <div className='flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='w-8 h-8'
                        asChild
                      >
                        <Link
                          to='/dashboard/admin/global-attributes/$id'
                          params={{ id: attr.id }}
                        >
                          <Pencil className='w-3.5 h-3.5' />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='w-8 h-8 hover:text-destructive'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent size='sm'>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete &ldquo;{attr.name}&rdquo;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the attribute and all
                              its values. Existing product mappings will also be
                              removed. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant='destructive'
                              disabled={isDeleting}
                              onClick={(e) => {
                                e.preventDefault();
                                deleteAttribute(attr.id);
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
                </CardHeader>
                <CardContent>
                  <div className='flex flex-wrap gap-1.5 mb-3'>
                    {attr.values.slice(0, 6).map((v) => (
                      <Badge
                        key={v.id}
                        variant='secondary'
                        className='text-[11px]'
                      >
                        {v.value}
                      </Badge>
                    ))}
                    {attr.values.length > 6 && (
                      <Badge variant='outline' className='text-[11px]'>
                        +{attr.values.length - 6} more
                      </Badge>
                    )}
                  </div>
                  <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border'>
                    <span>{attr.values.length} values</span>
                    <span>
                      {linkedCount} product{linkedCount !== 1 ? 's' : ''} linked
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination info */}
      {data && data.totalPages > 1 && (
        <p className='text-xs text-muted-foreground text-center'>
          Page {data.page} of {data.totalPages} ({data.total} total)
        </p>
      )}
    </div>
  );
}
