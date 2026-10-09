import { LifeBuoy, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { usePublicSettings } from '@/services/public-settings';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export default function TrustStrip() {
  const { data: settings } = usePublicSettings();
  const returnWindow =
    settings?.return_window_days ?? String(RETURN_WINDOW_DAYS);

  const items = [
    {
      icon: ShieldCheck,
      label: 'Secure Payments',
      subtitle: 'bKash, cards & verified gateways',
    },
    {
      icon: Truck,
      label: 'Nationwide Delivery',
      subtitle: 'Fast courier across Bangladesh',
    },
    {
      icon: RefreshCw,
      label: 'Easy Returns',
      subtitle: `${returnWindow}-day return window`,
    },
    {
      icon: LifeBuoy,
      label: 'Dedicated Support',
      subtitle: 'We help you before and after',
    },
  ];

  return (
    <section className='border-b border-border'>
      <div className='container mx-auto px-2 md:px-4'>
        <motion.div
          initial='hidden'
          whileInView='show'
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeUp}
          custom={0}
          className='grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0'
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className='flex items-center gap-3 px-4 py-6 md:px-6'
              >
                <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
                  <Icon className='h-4 w-4 text-primary' />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold leading-tight'>
                    {item.label}
                  </p>
                  <p className='mt-0.5 text-xs text-muted-foreground line-clamp-2'>
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
