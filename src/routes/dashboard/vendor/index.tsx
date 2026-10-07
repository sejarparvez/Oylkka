import { createFileRoute, Link } from '@tanstack/react-router';
import {
  BadgeCheck,
  Image as ImageIcon,
  MapPin,
  Package,
  Store,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useVendorProducts } from '@/services/product';
import { useMyShop } from '@/services/shop';
import { usePayoutDetails } from '@/services/vendor-payout-details';
import { useShippingZones } from '@/services/vendor-shipping';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: shop } = useMyShop();
  const { data: zones } = useShippingZones();
  const { data: payout } = usePayoutDetails();
  const { data: products } = useVendorProducts();

  const steps = [
    {
      key: 'profile',
      icon: Store,
      title: 'Complete your shop profile',
      description:
        'Add a description, phone number and address so customers know who they are buying from.',
      done: Boolean(
        shop?.description && shop?.phone && (shop?.addressLine1 || shop?.city),
      ),
      href: '/dashboard/vendor/shop' as const,
      action: 'Edit profile',
    },
    {
      key: 'branding',
      icon: ImageIcon,
      title: 'Upload your logo and banner',
      description: 'Shops with branding get more trust and more clicks.',
      done: Boolean(shop?.logoUrl && shop?.bannerUrl),
      href: '/dashboard/vendor/shop/branding' as const,
      action: 'Add branding',
    },
    {
      key: 'shipping',
      icon: MapPin,
      title: 'Set up shipping zones',
      description:
        'Define delivery rates by district. Without zones, orders use your default flat rate.',
      done: Boolean(zones && zones.length > 0),
      href: '/dashboard/vendor/shipping' as const,
      action: 'Add zones',
    },
    {
      key: 'payout',
      icon: Wallet,
      title: 'Add payout details',
      description:
        'Tell us where to send your money — bank account, bKash or Nagad.',
      done: Boolean(payout?.payoutMethod),
      href: '/dashboard/vendor/shop/payout' as const,
      action: 'Add payout details',
    },
    {
      key: 'product',
      icon: Package,
      title: 'List your first product',
      description: 'You are live once your first product is published.',
      done: Boolean(products && products.length > 0),
      href: '/dashboard/vendor/products/add' as const,
      action: 'Add product',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const progress = Math.round((completed / steps.length) * 100);
  const allDone = completed === steps.length;

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <BadgeCheck className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Vendor Onboarding
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              {allDone
                ? 'Everything is set up. Your shop is ready to sell.'
                : `${completed} of ${steps.length} steps complete — finish these to get the most out of your shop.`}
            </p>
          </div>
        </div>
        <div className='mt-4 max-w-md h-2 rounded-full bg-muted overflow-hidden'>
          <div
            className='h-full bg-primary rounded-full transition-all duration-500'
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1} className='space-y-3'>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors ${
                step.done
                  ? 'border-border bg-card'
                  : 'border-primary/30 bg-primary/[0.03]'
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  step.done
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className='h-5 w-5' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <p className='text-sm font-semibold'>{step.title}</p>
                  {step.done && (
                    <span className='flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary'>
                      <BadgeCheck className='h-3 w-3' />
                      Done
                    </span>
                  )}
                </div>
                <p className='text-sm text-muted-foreground mt-1'>
                  {step.description}
                </p>
              </div>
              {!step.done && (
                <Link
                  to={step.href}
                  className='shrink-0 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors'
                >
                  {step.action}
                </Link>
              )}
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
