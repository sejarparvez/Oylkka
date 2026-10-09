import { Image } from '@unpic/react';
import {
  BadgeCheck,
  CalendarDays,
  Package,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { PublicShopDetail } from '@/services/shop';

type ShopHeaderProps = {
  shop: PublicShopDetail;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const statVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE, delay },
  }),
};

export function ShopHeader({ shop }: ShopHeaderProps) {
  const memberSince = new Date(shop.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const stats = [
    {
      value: shop.totalSales.toLocaleString(),
      label: 'Sales',
      icon: ShoppingBag,
    },
    {
      value: shop._count.products.toLocaleString(),
      label: 'Products',
      icon: Package,
    },
    {
      value: shop.totalReviews.toLocaleString(),
      label: 'Reviews',
      icon: Star,
    },
    { value: memberSince, label: 'Member Since', icon: CalendarDays },
  ];

  return (
    <div>
      <div className='relative h-52 md:h-72 rounded-2xl overflow-hidden bg-muted'>
        {shop.bannerUrl ? (
          <img
            src={shop.bannerUrl}
            alt={`${shop.name} banner`}
            width={1200}
            height={400}
            loading='eager'
            decoding='async'
            className='object-cover w-full h-full'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center bg-linear-to-br from-primary/5 to-primary/20'>
            <Store className='w-16 h-16 text-muted-foreground/20' />
          </div>
        )}
        <div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent' />
      </div>

      <div className='relative -mt-14 md:-mt-20 flex items-end gap-5 px-5 mb-8'>
        <div className='relative w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-card ring-4 ring-background shadow-xl shrink-0'>
          {shop.logoUrl ? (
            <Image
              src={shop.logoUrl}
              width={140}
              height={140}
              alt={shop.name}
              className='object-cover w-full h-full'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center bg-muted'>
              <Store className='w-10 h-10 text-muted-foreground/50' />
            </div>
          )}
        </div>
        <div className='pb-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h1 className='text-2xl md:text-3xl font-bold tracking-tight text-white'>
              {shop.name}
              <span className='text-primary'>.</span>
            </h1>
            {shop.status === 'ACTIVE' && (
              <div className='flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full'>
                <BadgeCheck className='w-3 h-3' />
                Verified
              </div>
            )}
          </div>
          <div className='flex items-center gap-2 mt-1.5'>
            <div className='flex items-center gap-0.5'>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    s <= Math.round(shop.rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className='text-sm font-semibold'>
              {shop.rating.toFixed(1)}
            </span>
            <span className='text-sm text-muted-foreground'>
              ({shop.totalReviews.toLocaleString()} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden'>
        {stats.map(({ value, label, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial='hidden'
            whileInView='show'
            viewport={{ once: true }}
            variants={statVariants}
            custom={i * 0.05}
            whileHover={{ y: -2 }}
            className='bg-card py-6 px-4 flex flex-col items-center justify-center gap-2 transition-colors hover:bg-primary/2'
          >
            <p className='text-2xl md:text-3xl font-bold tabular-nums text-primary'>
              {value}
            </p>
            <div className='flex items-center gap-1.5'>
              <Icon className='w-3.5 h-3.5 text-muted-foreground' />
              <p className='text-[11px] text-muted-foreground tracking-wide uppercase font-medium'>
                {label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
