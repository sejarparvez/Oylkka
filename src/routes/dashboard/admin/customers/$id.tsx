import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Loader2,
  ShoppingCart,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatBDT } from '@/lib/currency';
import {
  useAdminCustomer,
  useBanCustomerMutation,
  useUpdateCustomerRoleMutation,
} from '@/services/admin-customers';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return { variant: 'secondary' as const, label: 'Pending' };
    case 'CONFIRMED':
      return { variant: 'outline' as const, label: 'Confirmed' };
    case 'PROCESSING':
      return { variant: 'default' as const, label: 'Processing' };
    case 'SHIPPED':
      return { variant: 'default' as const, label: 'Shipped' };
    case 'DELIVERED':
      return { variant: 'default' as const, label: 'Delivered' };
    case 'CANCELLED':
      return { variant: 'destructive' as const, label: 'Cancelled' };
    case 'REFUNDED':
      return { variant: 'destructive' as const, label: 'Refunded' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

export const Route = createFileRoute('/dashboard/admin/customers/$id')({
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
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useAdminCustomer(id);
  const banMutation = useBanCustomerMutation();
  const roleMutation = useUpdateCustomerRoleMutation();

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banExpires, setBanExpires] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleBanToggle = async () => {
    if (!data?.customer) return;
    const currentlyBanned = data.customer.banned;

    if (!currentlyBanned && !banReason.trim()) {
      toast.error('Please provide a reason for the ban');
      return;
    }

    await banMutation.mutateAsync({
      id: data.customer.id,
      banned: !currentlyBanned,
      banReason: currentlyBanned ? undefined : banReason,
      banExpires: currentlyBanned ? undefined : banExpires || undefined,
    });

    setBanDialogOpen(false);
    setBanReason('');
    setBanExpires('');
  };

  const handleRoleChange = async (role: string) => {
    if (!data?.customer) return;
    await roleMutation.mutateAsync({ id: data.customer.id, role });
    setNewRole('');
  };

  if (isLoading) {
    return (
      <div className='space-y-6 max-w-4xl'>
        <Skeleton className='h-8 w-48' />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card>
            <CardContent className='py-8'>
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-10 w-full' />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='py-8'>
              <div className='space-y-4'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className='flex items-center justify-center py-20'>
        <p className='text-muted-foreground'>Customer not found</p>
      </div>
    );
  }

  const { customer, recentOrders, totalSpent } = data;

  return (
    <motion.div
      className='space-y-6 max-w-4xl'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => navigate({ to: '/dashboard/admin/customers' })}
          >
            <ArrowLeft className='w-5 h-5' />
          </Button>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              {customer.name}
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              {customer.email}
            </p>
          </div>
        </div>
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <motion.div variants={fadeUp} custom={1}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Profile</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-3'>
                {customer.imageUrl ? (
                  <img
                    src={customer.imageUrl}
                    alt=''
                    width={48}
                    height={48}
                    loading='lazy'
                    decoding='async'
                    className='w-12 h-12 rounded-full object-cover'
                  />
                ) : (
                  <div className='w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold'>
                    {customer.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className='font-medium'>{customer.name}</p>
                  <p className='text-sm text-muted-foreground'>
                    {customer.email}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 pt-2'>
                <div>
                  <p className='text-xs text-muted-foreground'>Role</p>
                  <Badge
                    variant='outline'
                    className='mt-1 uppercase text-[10px]'
                  >
                    {customer.role}
                  </Badge>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Status</p>
                  {customer.banned ? (
                    <Badge
                      variant='destructive'
                      className='mt-1 uppercase text-[10px]'
                    >
                      Banned
                    </Badge>
                  ) : (
                    <Badge
                      variant='default'
                      className='mt-1 uppercase text-[10px]'
                    >
                      Active
                    </Badge>
                  )}
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>
                    Email Verified
                  </p>
                  <p className='text-sm font-medium mt-1'>
                    {customer.emailVerified ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Joined</p>
                  <p className='text-sm font-medium mt-1'>
                    {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Total Orders</p>
                  <p className='text-sm font-medium mt-1'>
                    {customer._count.orders}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Total Spent</p>
                  <p className='text-sm font-medium mt-1 tabular-nums'>
                    ৳{formatBDT(totalSpent)}
                  </p>
                </div>
              </div>

              {customer.banReason && (
                <div className='pt-2'>
                  <p className='text-xs text-muted-foreground'>Ban Reason</p>
                  <p className='text-sm text-destructive mt-1'>
                    {customer.banReason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Actions</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label>Change Role</Label>
                <div className='flex gap-2'>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className='flex-1'>
                      <SelectValue placeholder='Select role...' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='USER'>User</SelectItem>
                      <SelectItem value='VENDOR'>Vendor</SelectItem>
                      <SelectItem value='MANAGER'>Manager</SelectItem>
                      <SelectItem value='CUSTOMER_SERVICE'>
                        Customer Service
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleRoleChange(newRole)}
                    disabled={!newRole || roleMutation.isPending}
                  >
                    {roleMutation.isPending && (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    )}
                    Update
                  </Button>
                </div>
              </div>

              <div className='pt-2 border-t'>
                <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant={customer.banned ? 'default' : 'destructive'}
                      className='w-full'
                    >
                      {customer.banned ? (
                        <>
                          <CheckCircle className='w-4 h-4 mr-2' />
                          Unban Customer
                        </>
                      ) : (
                        <>
                          <Ban className='w-4 h-4 mr-2' />
                          Ban Customer
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {customer.banned ? 'Unban Customer' : 'Ban Customer'}
                      </DialogTitle>
                      <DialogDescription>
                        {customer.banned
                          ? `Reactivate ${customer.name}'s account?`
                          : `This will prevent ${customer.name} from accessing their account.`}
                      </DialogDescription>
                    </DialogHeader>

                    {!customer.banned && (
                      <div className='space-y-4 py-2'>
                        <div className='space-y-2'>
                          <Label htmlFor='banReason'>Reason *</Label>
                          <Textarea
                            id='banReason'
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder='Why is this customer being banned?'
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='banExpires'>
                            Ban Expiry (optional)
                          </Label>
                          <Input
                            id='banExpires'
                            type='datetime-local'
                            value={banExpires}
                            onChange={(e) => setBanExpires(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        variant='outline'
                        onClick={() => setBanDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant={customer.banned ? 'default' : 'destructive'}
                        onClick={handleBanToggle}
                        disabled={banMutation.isPending}
                      >
                        {banMutation.isPending && (
                          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                        )}
                        {customer.banned ? 'Unban' : 'Ban'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          <Card className='mt-6'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle className='text-lg'>Recent Orders</CardTitle>
              <Button variant='outline' size='sm' asChild>
                <Link to='/dashboard/admin/orders'>
                  <ShoppingCart className='w-4 h-4 mr-2' />
                  All Orders
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className='text-sm text-muted-foreground text-center py-6'>
                  No orders yet
                </p>
              ) : (
                <div className='space-y-2'>
                  {recentOrders.map((order) => {
                    const badge = statusBadge(order.status);
                    return (
                      <Link
                        key={order.id}
                        to='/dashboard/admin/orders/$orderId'
                        params={{ orderId: order.id }}
                        className='flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                      >
                        <div>
                          <p className='text-sm font-medium'>
                            {order.orderNumber}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {format(new Date(order.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className='flex items-center gap-3'>
                          <span className='text-sm font-bold tabular-nums'>
                            ৳{formatBDT(order.total)}
                          </span>
                          <Badge
                            variant={badge.variant}
                            className='text-[10px] uppercase'
                          >
                            {badge.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
