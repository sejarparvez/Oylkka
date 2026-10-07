import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { BD_DISTRICTS } from '@/lib/bd-districts';
import {
  type UserAddress,
  useAddresses,
  useCreateAddressMutation,
  useDeleteAddressMutation,
  useUpdateAddressMutation,
} from '@/services/address';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const emptyForm = {
  label: 'Home',
  name: '',
  phone: '',
  address: '',
  upzila: '',
  district: '',
  postalCode: '',
  isDefault: false,
};

export const Route = createFileRoute('/dashboard/addresses')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: addresses, isLoading } = useAddresses();
  const createMutation = useCreateAddressMutation();
  const updateMutation = useUpdateAddressMutation();
  const deleteMutation = useDeleteAddressMutation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openEdit = (a: UserAddress) => {
    setEditing(a.id);
    setForm({
      label: a.label,
      name: a.name,
      phone: a.phone,
      address: a.address,
      upzila: a.upzila,
      district: a.district,
      postalCode: a.postalCode ?? '',
      isDefault: a.isDefault,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!form.name) missing.push('Full Name');
    if (!form.phone) missing.push('Phone');
    if (!form.address) missing.push('Address');
    if (!form.upzila) missing.push('Upzila / Thana');
    if (!form.district) missing.push('District');
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-3'>
          <Button variant='ghost' size='icon' asChild className='shrink-0'>
            <Link to='/dashboard'>
              <ArrowLeft className='w-4 h-4' />
            </Link>
          </Button>
          <div className='flex-1'>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
              <MapPin className='w-6 h-6' />
              My Addresses
            </h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className='gap-2' size='sm' onClick={resetForm}>
                <Plus className='w-4 h-4' />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-lg'>
              <DialogHeader>
                <DialogTitle>
                  {editing ? 'Edit Address' : 'Add Address'}
                </DialogTitle>
              </DialogHeader>
              <form
                className='space-y-3'
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <Label>Label</Label>
                    <select
                      className='flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm'
                      value={form.label}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, label: e.target.value }))
                      }
                    >
                      <option value='Home'>Home</option>
                      <option value='Work'>Work</option>
                      <option value='Other'>Other</option>
                    </select>
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Upzila / Thana</Label>
                    <Input
                      required
                      value={form.upzila}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, upzila: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    required
                    value={form.address}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, address: e.target.value }))
                    }
                  />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <Label>District</Label>
                    <select
                      required
                      className='flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm'
                      value={form.district}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, district: e.target.value }))
                      }
                    >
                      <option value=''>Select district</option>
                      {BD_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      value={form.postalCode}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, postalCode: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={form.isDefault}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, isDefault: v }))
                    }
                  />
                  <Label>Set as default</Label>
                </div>
                <div className='flex justify-end gap-2 pt-2'>
                  <DialogClose asChild>
                    <Button variant='outline' type='button'>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type='submit'
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    ) : null}
                    {editing ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Saved Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2].map((i) => (
                  <Skeleton key={i} className='h-24 w-full' />
                ))}
              </div>
            ) : !addresses || addresses.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <MapPin className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No saved addresses</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Save addresses for faster checkout.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {addresses.map((a) => (
                  <div key={a.id} className='rounded-lg border p-4'>
                    <div className='flex items-start justify-between'>
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='text-sm font-semibold'>
                            {a.label}
                          </span>
                          {a.isDefault && (
                            <Badge variant='secondary' className='text-[10px]'>
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className='text-sm mt-1'>{a.name}</p>
                        <p className='text-sm text-muted-foreground'>
                          {a.address}, {a.upzila}, {a.district}
                          {a.postalCode ? ` - ${a.postalCode}` : ''}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {a.phone}
                        </p>
                      </div>
                      <div className='flex items-center gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => openEdit(a)}
                        >
                          <Pencil className='w-4 h-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className='w-4 h-4 text-destructive' />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
