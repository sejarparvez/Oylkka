import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Search, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { QueryErrorState } from '@/components/query-state';
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
import { useAdminCustomers } from '@/services/admin-customers';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const ROLE_BADGES: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    label: string;
  }
> = {
  ADMIN: { variant: 'destructive', label: 'Admin' },
  MANAGER: { variant: 'default', label: 'Manager' },
  VENDOR: { variant: 'default', label: 'Vendor' },
  CUSTOMER_SERVICE: { variant: 'secondary', label: 'Support' },
  USER: { variant: 'outline', label: 'User' },
};

export const Route = createFileRoute('/dashboard/admin/customers/')({
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
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [page, setPage] = useState(1);

  const filters = {
    ...(search && { search }),
    ...(roleFilter && { role: roleFilter }),
    ...(bannedFilter === 'true' && { banned: true }),
    ...(bannedFilter === 'false' && { banned: false }),
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useAdminCustomers(filters);

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <Users className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Customers</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Manage registered users and their accounts
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <div className='flex items-center gap-4 flex-wrap'>
              <div className='relative flex-1 min-w-[200px]'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                <Input
                  placeholder='Search by name or email...'
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className='pl-9'
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[150px]'>
                  <SelectValue placeholder='All Roles' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Roles</SelectItem>
                  <SelectItem value='ADMIN'>Admin</SelectItem>
                  <SelectItem value='MANAGER'>Manager</SelectItem>
                  <SelectItem value='VENDOR'>Vendor</SelectItem>
                  <SelectItem value='CUSTOMER_SERVICE'>Support</SelectItem>
                  <SelectItem value='USER'>User</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={bannedFilter}
                onValueChange={(v) => {
                  setBannedFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className='w-[150px]'>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>All Status</SelectItem>
                  <SelectItem value='false'>Active</SelectItem>
                  <SelectItem value='true'>Banned</SelectItem>
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
            ) : isError ? (
              <QueryErrorState
                title='Failed to load customers'
                onRetry={() => refetch()}
              />
            ) : !data?.customers || data.customers.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Users className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No customers found</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  {search || roleFilter || bannedFilter
                    ? 'Try adjusting your filters'
                    : 'No users have registered yet'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customers.map((customer) => {
                      const roleBadge = ROLE_BADGES[customer.role] || {
                        variant: 'outline' as const,
                        label: customer.role,
                      };
                      return (
                        <TableRow key={customer.id}>
                          <TableCell className='font-medium'>
                            <div className='flex items-center gap-2'>
                              {customer.imageUrl && (
                                <img
                                  src={customer.imageUrl}
                                  alt=''
                                  width={28}
                                  height={28}
                                  loading='lazy'
                                  decoding='async'
                                  className='w-7 h-7 rounded-full object-cover'
                                />
                              )}
                              <span className='truncate max-w-[150px]'>
                                {customer.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className='text-sm text-muted-foreground'>
                            {customer.email}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={roleBadge.variant}
                              className='text-[10px] uppercase'
                            >
                              {roleBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className='tabular-nums'>
                            {customer._count.orders}
                          </TableCell>
                          <TableCell>
                            {customer.banned ? (
                              <Badge
                                variant='destructive'
                                className='text-[10px] uppercase'
                              >
                                Banned
                              </Badge>
                            ) : (
                              <Badge
                                variant='default'
                                className='text-[10px] uppercase'
                              >
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className='text-xs text-muted-foreground'>
                            {format(
                              new Date(customer.createdAt),
                              'MMM d, yyyy',
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button variant='outline' size='sm' asChild>
                              <Link
                                to='/dashboard/admin/customers/$id'
                                params={{ id: customer.id }}
                              >
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
