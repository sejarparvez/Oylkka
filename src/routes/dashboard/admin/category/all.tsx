import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import {
  FolderTree,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

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
  type AdminCategory,
  useCategories,
  useDeleteCategoryMutation,
} from '@/services/category';

export const Route = createFileRoute('/dashboard/admin/category/all')({
  beforeLoad: ({ context }) => {
    if (!context.user.role || context.user.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: categories, isLoading } = useCategories();
  const { mutate: deleteCategory, isPending: isDeleting } =
    useDeleteCategoryMutation();

  const rootCategories = categories?.filter((c) => !c.parentId) ?? [];
  const subCategories = categories?.filter((c) => c.parentId) ?? [];

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Categories</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage all product categories
          </p>
        </div>
        <Button asChild>
          <Link to='/dashboard/admin/category/add'>
            <Plus className='w-4 h-4' />
            Add Category
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <CategoryCardSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={i}
            />
          ))}
        </div>
      )}

      {!isLoading && categories?.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <FolderTree className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No categories yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Create your first category to start organizing products.
            </p>
          </div>
          <Button size='sm' asChild className='mt-2'>
            <Link to='/dashboard/admin/category/add'>
              <Plus className='w-4 h-4' />
              Add Category
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && categories && categories.length > 0 && (
        <div className='space-y-8'>
          {rootCategories.length > 0 && (
            <div>
              <h2 className='text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider'>
                Top-Level Categories
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {rootCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    deleteCategory={deleteCategory}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            </div>
          )}

          {subCategories.length > 0 && (
            <div>
              <h2 className='text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider'>
                Subcategories
              </h2>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {subCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    deleteCategory={deleteCategory}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryCard({
  category,
  deleteCategory,
  isDeleting,
}: {
  category: AdminCategory;
  deleteCategory: (id: string) => void;
  isDeleting: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors duration-200',
        category.featured && 'ring-1 ring-primary/20',
      )}
    >
      <div className='relative aspect-[2/1] bg-muted overflow-hidden'>
        {category.imageUrl ? (
          <img
            src={category.imageUrl}
            alt={category.name}
            width={800}
            height={400}
            loading='lazy'
            decoding='async'
            className='object-cover w-full h-full group-hover:scale-105 transition-transform duration-500'
          />
        ) : (
          <div className='flex items-center justify-center w-full h-full'>
            <ImageIcon className='w-8 h-8 text-muted-foreground/40' />
          </div>
        )}

        <div className='absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200'>
          <Button
            variant='ghost'
            size='icon'
            className='w-8 h-8 bg-background/80 backdrop-blur-sm hover:bg-background rounded-lg'
            asChild
          >
            <Link
              to='/dashboard/admin/category/edit'
              search={{ categoryId: category.id }}
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
                <AlertDialogTitle>Delete category?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{category.name}&rdquo;
                  {category._count.children > 0 &&
                    ` and its ${category._count.children} subcategor${
                      category._count.children === 1 ? 'y' : 'ies'
                    }`}
                  . This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant='destructive'
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    deleteCategory(category.id);
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

      <div className='p-4 space-y-3'>
        <div className='flex items-center gap-2'>
          {category.featured && (
            <Badge
              variant='secondary'
              className='text-[10px] uppercase tracking-wider'
            >
              Featured
            </Badge>
          )}
          {category.parent && (
            <Badge variant='outline' className='text-[10px]'>
              → {category.parent.name}
            </Badge>
          )}
          <span className='text-[10px] text-muted-foreground ml-auto'>
            {category._count.products} product
            {category._count.products !== 1 ? 's' : ''}
            {category._count.children > 0 &&
              ` · ${category._count.children} sub`}
          </span>
        </div>

        <h3 className='text-sm font-semibold leading-snug line-clamp-1'>
          {category.name}
        </h3>

        {category.description && (
          <p className='text-xs text-muted-foreground leading-relaxed line-clamp-2'>
            {category.description}
          </p>
        )}

        <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
          <span className='text-[10px] font-mono'>/{category.slug}</span>
          {category.order > 0 && (
            <>
              <span>·</span>
              <span>Order: {category.order}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryCardSkeleton() {
  return (
    <div className='rounded-2xl border border-border overflow-hidden'>
      <Skeleton className='aspect-[2/1] w-full' />
      <div className='p-4 space-y-3'>
        <Skeleton className='h-4 w-20' />
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
