import { Link } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { ArrowRight, BadgeCheck, MapPin, Star, Store } from 'lucide-react';
import { motion } from 'motion/react';
import type { PublicShopListShop } from '@/services/shop';

type ShopCardProps = {
  shop: PublicShopListShop;
};

export function ShopCard({ shop }: ShopCardProps) {
  return (
    <Link to='/shop/$slug' params={{ slug: shop.slug }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
          },
        }}
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className='group rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-lg hover:shadow-black/5 transition-all duration-300 cursor-pointer'
      >
        {/* Logo + Name + Verified badge */}
        <div className='flex items-center gap-4 mb-3'>
          <div className='relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 ring-2 ring-border group-hover:ring-primary/30 transition-all duration-300'>
            {shop.logoUrl ? (
              <Image
                src={shop.logoUrl}
                width={80}
                height={80}
                alt={shop.name}
                layout='fixed'
                className='object-cover w-full h-full'
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center bg-muted'>
                <Store className='w-6 h-6 text-muted-foreground/50' />
              </div>
            )}
          </div>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2'>
              <h3 className='text-sm font-semibold truncate group-hover:text-primary transition-colors'>
                {shop.name}
              </h3>
              {shop.status === 'ACTIVE' && (
                <span className='flex items-center gap-0.5 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-full shrink-0'>
                  <BadgeCheck className='w-2.5 h-2.5' />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <div className='flex items-center gap-3 mt-1.5'>
              <div className='flex items-center gap-1'>
                <Star className='w-3 h-3 text-amber-400 fill-amber-400' />
                <span className='text-xs text-muted-foreground font-medium'>
                  {shop.rating.toFixed(1)}
                </span>
                <span className='text-xs text-muted-foreground'>
                  ({shop.totalReviews.toLocaleString()})
                </span>
              </div>
              {shop.city && (
                <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                  <MapPin className='w-3 h-3' />
                  {shop.city}
                  {shop.country && `, ${shop.country}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description (2-line clamp) */}
        {shop.description && (
          <p className='text-xs text-muted-foreground/80 leading-relaxed line-clamp-2 mb-3'>
            {shop.description}
          </p>
        )}

        {/* Bottom: animated rule + stats + arrow */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='h-px w-4 bg-primary/40 group-hover:w-6 transition-all duration-300' />
            <span className='text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/60'>
              {shop._count.products.toLocaleString()} products
            </span>
            <span className='w-1 h-1 rounded-full bg-muted-foreground/30' />
            <span className='text-[10px] text-muted-foreground tabular-nums'>
              {shop.totalSales.toLocaleString()} sales
            </span>
          </div>
          <ArrowRight className='w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 shrink-0' />
        </div>
      </motion.div>
    </Link>
  );
}

export function ShopCardSkeleton() {
  return (
    <div className='rounded-2xl border border-border bg-card p-5'>
      <div className='flex items-center gap-4 mb-3'>
        <div className='w-14 h-14 rounded-xl bg-muted animate-pulse shrink-0' />
        <div className='flex-1 space-y-2'>
          <div className='h-4 w-2/3 bg-muted animate-pulse rounded' />
          <div className='h-3 w-1/2 bg-muted animate-pulse rounded' />
        </div>
      </div>
      <div className='h-8 w-full bg-muted animate-pulse rounded mb-3' />
      <div className='flex items-center gap-2'>
        <div className='h-3 w-16 bg-muted animate-pulse rounded' />
        <div className='h-3 w-14 bg-muted animate-pulse rounded' />
      </div>
    </div>
  );
}
