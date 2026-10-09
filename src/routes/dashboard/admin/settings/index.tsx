import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import apiClient from '@/lib/api-client';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/admin/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient
      .get<{ settings: Record<string, string> }>('/api/admin/settings/list')
      .then((r) => setSettings(r.data.settings))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.post('/api/admin/settings/update', { settings });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
        className='flex items-center gap-2'
      >
        <Settings className='w-6 h-6' />
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>
            Platform Settings
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Configure global platform settings
          </p>
        </div>
      </motion.div>
      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>General</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-4'>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : (
              <div className='space-y-4'>
                <div>
                  <Label>Platform Name</Label>
                  <Input
                    value={settings.platform_name ?? ''}
                    onChange={(e) => update('platform_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Support Email</Label>
                  <Input
                    type='email'
                    value={settings.support_email ?? ''}
                    onChange={(e) => update('support_email', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Min Order Amount (BDT)</Label>
                  <Input
                    type='number'
                    value={settings.min_order_amount ?? '0'}
                    onChange={(e) => update('min_order_amount', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Default Commission Rate (%)</Label>
                  <Input
                    type='number'
                    step='0.1'
                    value={settings.default_commission ?? ''}
                    onChange={(e) =>
                      update('default_commission', e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Max Shipping Cost (BDT)</Label>
                  <Input
                    type='number'
                    value={settings.max_shipping ?? ''}
                    onChange={(e) => update('max_shipping', e.target.value)}
                  />
                </div>
                <div className='flex justify-end'>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && (
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    )}
                    Save Settings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* FE-20: the public policy claims surfaced on the PDP, /shipping,
          /returns and the footer. Serving them from SiteSetting keeps every
          public page in agreement instead of five hardcoded copies. */}
      <motion.div variants={fadeUp} custom={2}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>
              Shipping &amp; Returns Claims
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div>
                <Label>Free Shipping Threshold (BDT)</Label>
                <Input
                  type='number'
                  value={settings.free_shipping_threshold ?? '500'}
                  onChange={(e) =>
                    update('free_shipping_threshold', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Return Window (days)</Label>
                <Input
                  type='number'
                  value={settings.return_window_days ?? '30'}
                  onChange={(e) => update('return_window_days', e.target.value)}
                />
              </div>
              <div>
                <Label>Standard Delivery Fee (BDT)</Label>
                <Input
                  type='number'
                  value={settings.standard_delivery_fee ?? '60'}
                  onChange={(e) =>
                    update('standard_delivery_fee', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Express Delivery Fee (BDT)</Label>
                <Input
                  type='number'
                  value={settings.express_delivery_fee ?? '150'}
                  onChange={(e) =>
                    update('express_delivery_fee', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Processing Time (business days, e.g. 1-2)</Label>
                <Input
                  value={settings.processing_days ?? '1-2'}
                  onChange={(e) => update('processing_days', e.target.value)}
                />
              </div>
              <div>
                <Label>Standard Delivery Time (e.g. 5-7)</Label>
                <Input
                  value={settings.standard_delivery_days ?? '5-7'}
                  onChange={(e) =>
                    update('standard_delivery_days', e.target.value)
                  }
                />
              </div>
              <div>
                <Label>Express Delivery Time (e.g. 2-3)</Label>
                <Input
                  value={settings.express_delivery_days ?? '2-3'}
                  onChange={(e) =>
                    update('express_delivery_days', e.target.value)
                  }
                />
              </div>
              <div className='flex justify-end'>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
                  Save Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
