import { createFileRoute } from '@tanstack/react-router';
import { Loader2, MapPin, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { BD_DISTRICTS } from '@/lib/bd-districts';
import { formatBDT } from '@/lib/currency';
import { useMyShop, useUpdateShopMutation } from '@/services/shop';
import type { ShippingZone } from '@/services/vendor-shipping';
import {
  useCreateShippingZoneMutation,
  useDeleteShippingZoneMutation,
  useShippingZones,
  useUpdateShippingZoneMutation,
} from '@/services/vendor-shipping';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/shipping/')({
  component: RouteComponent,
});

interface ZoneFormData {
  name: string;
  districts: string[];
  baseCost: string;
  perItem: string;
  freeAbove: string;
  estDays: string;
}

const emptyForm: ZoneFormData = {
  name: '',
  districts: [],
  baseCost: '0',
  perItem: '0',
  freeAbove: '',
  estDays: '',
};

function RouteComponent() {
  const { data: shop, isLoading: shopLoading } = useMyShop();
  const { data: zones, isLoading: zonesLoading, refetch } = useShippingZones();
  const createMutation = useCreateShippingZoneMutation();
  const updateMutation = useUpdateShippingZoneMutation();
  const deleteMutation = useDeleteShippingZoneMutation();
  const updateShopMutation = useUpdateShopMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [form, setForm] = useState<ZoneFormData>(emptyForm);
  const [defaultCost, setDefaultCost] = useState('');

  useEffect(() => {
    if (shop?.shippingCost !== undefined) {
      setDefaultCost(String(Number(shop.shippingCost)));
    }
  }, [shop?.shippingCost]);

  const isLoading = shopLoading || zonesLoading;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingZone(null);
  };

  const openEdit = (zone: ShippingZone) => {
    setEditingZone(zone.id);
    setForm({
      name: zone.name,
      districts: zone.districts,
      baseCost: String(zone.baseCost),
      perItem: String(zone.perItem),
      freeAbove: zone.freeAbove != null ? String(zone.freeAbove) : '',
      estDays: zone.estDays ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    if (form.districts.length === 0) {
      toast.error('Select at least one district');
      return;
    }
    const baseCost = Number.parseFloat(form.baseCost);
    if (Number.isNaN(baseCost) || baseCost < 0) {
      toast.error('Base cost must be a non-negative number');
      return;
    }
    const perItem = Number.parseFloat(form.perItem) || 0;
    const freeAbove = form.freeAbove ? Number.parseFloat(form.freeAbove) : null;
    if (freeAbove != null && (Number.isNaN(freeAbove) || freeAbove < 0)) {
      toast.error('Invalid free shipping amount');
      return;
    }

    try {
      if (editingZone) {
        await updateMutation.mutateAsync({
          id: editingZone,
          name: form.name.trim(),
          districts: form.districts,
          baseCost,
          perItem,
          freeAbove,
          estDays: form.estDays.trim() || null,
        });
        toast.success('Shipping zone updated');
      } else {
        await createMutation.mutateAsync({
          name: form.name.trim(),
          districts: form.districts,
          baseCost,
          perItem,
          freeAbove,
          estDays: form.estDays.trim() || null,
        });
        toast.success('Shipping zone created');
      }
      setDialogOpen(false);
      resetForm();
      refetch();
    } catch {
      toast.error('Failed to save shipping zone');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this shipping zone?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Shipping zone deleted');
      refetch();
    } catch {
      toast.error('Failed to delete shipping zone');
    }
  };

  const toggleDistrict = (district: string) => {
    setForm((prev) => ({
      ...prev,
      districts: prev.districts.includes(district)
        ? prev.districts.filter((d) => d !== district)
        : [...prev.districts, district],
    }));
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      <motion.div
        className='flex items-center justify-between'
        variants={fadeUp}
        custom={0}
      >
        <div>
          <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
            <Truck className='w-6 h-6' />
            Shipping Settings
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Manage shipping zones and rates for your shop
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className='gap-2' onClick={resetForm}>
              <Plus className='w-4 h-4' />
              Add Zone
            </Button>
          </DialogTrigger>
          <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Edit Shipping Zone' : 'Add Shipping Zone'}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Enter the shipping zone details.
              </DialogDescription>
            </DialogHeader>
            <form
              className='space-y-4'
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <div>
                <Label htmlFor='zoneName'>Zone Name</Label>
                <Input
                  id='zoneName'
                  placeholder='e.g. Dhaka Metro, All Bangladesh'
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Districts</Label>
                <div className='grid grid-cols-3 gap-1.5 mt-1.5 max-h-48 overflow-y-auto border rounded-lg p-2'>
                  {BD_DISTRICTS.map((d) => (
                    <button
                      key={d}
                      type='button'
                      className={`text-xs px-2 py-1.5 rounded-md border text-left transition-colors ${
                        form.districts.includes(d)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => toggleDistrict(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='baseCost'>Base Cost (BDT)</Label>
                  <Input
                    id='baseCost'
                    type='number'
                    min='0'
                    step='0.01'
                    value={form.baseCost}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        baseCost: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='perItem'>Per Item (BDT)</Label>
                  <Input
                    id='perItem'
                    type='number'
                    min='0'
                    step='0.01'
                    value={form.perItem}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        perItem: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='freeAbove'>Free Shipping Above (BDT)</Label>
                  <Input
                    id='freeAbove'
                    type='number'
                    min='0'
                    step='0.01'
                    placeholder='Optional'
                    value={form.freeAbove}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        freeAbove: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor='estDays'>Est. Delivery</Label>
                  <Input
                    id='estDays'
                    placeholder='e.g. 2-3 business days'
                    value={form.estDays}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        estDays: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <DialogClose asChild>
                  <Button type='button' variant='outline'>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type='submit' disabled={isPending}>
                  {isPending && (
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  )}
                  {editingZone ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg flex items-center gap-2'>
              <MapPin className='w-5 h-5' />
              Shipping Zones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : !zones || zones.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-12 text-center'>
                <Truck className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No shipping zones yet</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Add a shipping zone to set delivery rates by district
                </p>
              </div>
            ) : (
              <div className='rounded-lg border overflow-hidden'>
                <div className='grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b'>
                  <div>Name</div>
                  <div className='text-center'>Districts</div>
                  <div className='text-right'>Base</div>
                  <div className='text-right'>Per Item</div>
                  <div className='text-right'>Free Above</div>
                  <div className='text-center'>Days</div>
                  <div className='text-center'>Active</div>
                  <div />
                </div>
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className='grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] gap-2 p-3 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors'
                  >
                    <div className='font-medium text-sm truncate'>
                      {zone.name}
                    </div>
                    <div className='text-center'>
                      <Badge variant='secondary' className='text-xs'>
                        {zone.districts.length}
                      </Badge>
                    </div>
                    <div className='text-right text-sm'>
                      ৳{formatBDT(zone.baseCost)}
                    </div>
                    <div className='text-right text-sm text-muted-foreground'>
                      {zone.perItem > 0 ? `৳${formatBDT(zone.perItem)}` : '-'}
                    </div>
                    <div className='text-right text-sm text-muted-foreground'>
                      {zone.freeAbove != null
                        ? `৳${formatBDT(zone.freeAbove)}`
                        : '-'}
                    </div>
                    <div className='text-center text-sm text-muted-foreground'>
                      {zone.estDays ?? '-'}
                    </div>
                    <div className='flex justify-center'>
                      <Switch
                        checked={zone.isActive}
                        onCheckedChange={(checked) => {
                          updateMutation.mutate(
                            { id: zone.id, isActive: checked },
                            {
                              onSuccess: () => refetch(),
                            },
                          );
                        }}
                      />
                    </div>
                    <div className='flex items-center gap-1 justify-end'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='w-8 h-8'
                        onClick={() => openEdit(zone)}
                      >
                        <Pencil className='w-4 h-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='w-8 h-8'
                        onClick={() => handleDelete(zone.id)}
                      >
                        <Trash2 className='w-4 h-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>
              Default Shipping (Fallback)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground mb-3'>
              If no matching zone is found for a customer&apos;s district, the
              shop&apos;s default shipping cost will be used.
            </p>
            <form
              className='flex items-end gap-3'
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.append('shippingCost', defaultCost);
                updateShopMutation.mutate(fd);
              }}
            >
              <div className='space-y-2'>
                <Label htmlFor='defaultCost'>Default cost (BDT)</Label>
                <Input
                  id='defaultCost'
                  type='number'
                  min={0}
                  max={100000}
                  className='w-36'
                  value={defaultCost}
                  onChange={(e) => setDefaultCost(e.target.value)}
                />
              </div>
              <Button
                type='submit'
                variant='outline'
                disabled={
                  updateShopMutation.isPending ||
                  !defaultCost ||
                  Number(defaultCost) < 0 ||
                  Number(defaultCost) === Number(shop?.shippingCost)
                }
              >
                {updateShopMutation.isPending && (
                  <Loader2 className='w-3.5 h-3.5 mr-2 animate-spin' />
                )}
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
