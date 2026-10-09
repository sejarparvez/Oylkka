import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { formatBDT } from '@/lib/currency';
import {
  useDeleteProductMutation,
  useVendorProducts,
  type VendorProduct,
} from '@/services/product';

const statusBadge = (status: string) => {
  switch (status) {
    case 'PUBLISHED':
    case 'ACTIVE':
      return { variant: 'default' as const, label: 'Published' };
    case 'DRAFT':
      return { variant: 'secondary' as const, label: 'Draft' };
    case 'ARCHIVED':
      return { variant: 'outline' as const, label: 'Archived' };
    case 'OUT_OF_STOCK':
      return { variant: 'destructive' as const, label: 'Out of Stock' };
    case 'REJECTED':
      return { variant: 'destructive' as const, label: 'Rejected' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export const Route = createFileRoute('/dashboard/vendor/products/')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: products, isLoading, isError, refetch } = useVendorProducts();
  const { mutate: deleteProduct, isPending: isDeleting } =
    useDeleteProductMutation();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const filteredProducts = products?.filter((p) => {
    const matchesSearch =
      !debouncedSearch ||
      p.productName.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Products</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage your product catalog
          </p>
        </div>
        <Button
          className='rounded-xl h-10 gap-2'
          onClick={() => navigate({ to: '/dashboard/vendor/products/add' })}
        >
          <Plus className='w-4 h-4' />
          Add Product
        </Button>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex gap-2'>
          {['all', 'ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size='sm'
              className='rounded-lg'
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
        <div className='relative w-full sm:w-64'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
          <Input
            placeholder='Search products...'
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
            <Skeleton key={i} className='h-24 rounded-2xl' />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <QueryErrorState
          title='Failed to load products'
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && filteredProducts?.length === 0 && (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Package className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>
              {debouncedSearch || statusFilter !== 'all'
                ? 'No matching products'
                : 'No products yet'}
            </p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              {debouncedSearch || statusFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Add your first product to start selling.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && filteredProducts && filteredProducts.length > 0 && (
        <div className='space-y-3'>
          {filteredProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              onDelete={() => setDeleteId(product.id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent size='sm'>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product and all its images will
              be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) {
                  deleteProduct(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {isDeleting && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductRow({
  product,
  onDelete,
  isDeleting,
}: {
  product: VendorProduct;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const navigate = useNavigate();
  const { variant, label } = statusBadge(product.status);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className='rounded-2xl border border-border bg-card p-4 flex items-center gap-4 hover:border-primary/30 transition-colors duration-200'>
      <div className='w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0'>
        {product.images?.[0]?.imageUrl ? (
          <img
            src={product.images[0].imageUrl}
            alt={product.productName}
            width={56}
            height={56}
            loading='lazy'
            decoding='async'
            className='w-full h-full object-cover'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <Package className='w-5 h-5 text-muted-foreground' />
          </div>
        )}
      </div>
      <div className='flex-1 min-w-0 grid grid-cols-5 gap-4 items-center'>
        <div className='col-span-2'>
          <p className='text-sm font-semibold truncate'>
            {product.productName}
          </p>
          <p className='text-xs text-muted-foreground'>SKU: {product.sku}</p>
        </div>
        <div>
          <p className='text-sm font-semibold'>৳{formatBDT(product.price)}</p>
          {product.discountPrice && (
            <p className='text-xs text-muted-foreground line-through'>
              ৳{formatBDT(product.discountPrice)}
            </p>
          )}
        </div>
        <div>
          <p className='text-xs text-muted-foreground'>
            Stock: {product.stock}
          </p>
          <p className='text-xs text-muted-foreground'>
            {product._count.orderItems} sold
          </p>
        </div>
        <div className='flex items-center justify-between gap-2'>
          <Badge
            variant={variant}
            className='text-[10px] uppercase tracking-wider'
          >
            {label}
          </Badge>
        </div>
      </div>
      <div className='flex items-center gap-1 shrink-0'>
        <Button
          variant='ghost'
          size='icon'
          className='w-8 h-8 rounded-lg'
          onClick={() =>
            navigate({
              to: '/dashboard/vendor/products/edit',
              search: { productId: product.id },
            })
          }
        >
          <Pencil className='w-3.5 h-3.5' />
        </Button>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='w-8 h-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10'
            >
              <Trash2 className='w-3.5 h-3.5' />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size='sm'>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete &ldquo;{product.productName}&rdquo;?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant='destructive'
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                  setDeleteOpen(false);
                }}
              >
                {isDeleting && <Loader2 className='w-3.5 h-3.5 animate-spin' />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
