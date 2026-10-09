import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Edit, Loader2, Plus, Search, Tag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatBDT } from '@/lib/currency';
import {
  useAdminCoupons,
  useDeleteCouponMutation,
} from '@/services/admin-coupons';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const SCOPE_LABELS: Record<string, string> = {
  ALL: 'All',
  CATEGORY: 'Category',
  PRODUCT: 'Product',
  SHOP: 'Shop',
  USER: 'User',
  GLOBAL: 'Global',
};

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE: '% Off',
  FIXED: 'Fixed',
  CASHBACK: 'Cashback',
};

export const Route = createFileRoute('/dashboard/admin/coupons/')({
  beforeLoad: ({ context }) => {
    if (
      !context.user?.role ||
      (context.user.role !== 'ADMIN' && context.user.role !== 'MANAGER')
    ) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    ...(search && { search }),
    ...(scopeFilter && { scope: scopeFilter }),
    ...(activeFilter === 'true' && { isActive: true }),
    ...(activeFilter === 'false' && { isActive: false }),
    page,
    limit: 20,
  };

  const { data, isLoading } = useAdminCoupons(filters);
  const deleteMutation = useDeleteCouponMutation();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // error handled in service
    }
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div
        variants={fadeUp}
        custom={0}
        className='flex items-center justify-between'
      >
        <div className='flex items-center gap-2'>
          <Tag className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Coupons</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Manage promotional coupons and discounts
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to='/dashboard/admin/coupons/create'>
            <Plus className='w-4 h-4 mr-2' />
            Add Coupon
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='relative flex-1 min-w-[200px]'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Search by code...'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className='pl-9'
                />
              </div>
              <Select
                value={scopeFilter}
                onValueChange={(v) => {
                  setScopeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Scopes' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Scopes</SelectItem>
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={activeFilter}
                onValueChange={(v) => {
                  setActiveFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[140px]'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Status</SelectItem>
                  <SelectItem value='true'>Active</SelectItem>
                  <SelectItem value='false'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className='h-14 w-full' />
                ))}
              </div>
            ) : !data?.coupons || data.coupons.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Tag className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No coupons found</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  {search || scopeFilter || activeFilter
                    ? 'Try adjusting your filters'
                    : 'Create your first coupon to get started'}
                </p>
                {!search && !scopeFilter && !activeFilter && (
                  <Button className='mt-4' size='sm' asChild>
                    <Link to='/dashboard/admin/coupons/create'>
                      <Plus className='w-4 h-4 mr-2' />
                      Add Coupon
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className='font-medium'>
                          {coupon.code}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>
                            {TYPE_LABELS[coupon.type] || coupon.type}
                          </Badge>
                        </TableCell>
                        <TableCell className='tabular-nums'>
                          {coupon.type === 'PERCENTAGE'
                            ? `${coupon.value}%`
                            : `৳${formatBDT(coupon.value)}`}
                        </TableCell>
                        <TableCell>
                          {SCOPE_LABELS[coupon.scope] || coupon.scope}
                        </TableCell>
                        <TableCell className='tabular-nums'>
                          {coupon._count?.usages ?? 0}
                          {coupon.maxUses > 0 && ` / ${coupon.maxUses}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={coupon.isActive ? 'default' : 'secondary'}
                            className='text-[10px] uppercase'
                          >
                            {coupon.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {coupon.startsAt
                            ? format(new Date(coupon.startsAt), 'MMM d, yyyy')
                            : 'Always'}
                          {coupon.expiresAt &&
                            ` — ${format(new Date(coupon.expiresAt), 'MMM d, yyyy')}`}
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <Button variant='ghost' size='icon' asChild>
                              <Link
                                to='/dashboard/admin/coupons/$id'
                                params={{ id: coupon.id }}
                              >
                                <Edit className='w-4 h-4' />
                              </Link>
                            </Button>
                            <AlertDialog
                              open={deleteId === coupon.id}
                              onOpenChange={(open) =>
                                setDeleteId(open ? coupon.id : null)
                              }
                            >
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='text-destructive'
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Coupon
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete{' '}
                                    <strong>{coupon.code}</strong>? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={() => setDeleteId(null)}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                  >
                                    {deleteMutation.isPending && (
                                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                                    )}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {data.totalPages > 1 && (
                  <div className='flex items-center justify-between mt-4 pt-4 border-t'>
                    <p className='text-sm text-muted-foreground'>
                      Page {data.page} of {data.totalPages} ({data.total} total)
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        disabled={page >= data.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
