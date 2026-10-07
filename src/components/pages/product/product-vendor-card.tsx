import { useNavigate } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import { ArrowRight, BadgeCheck, Star, Store } from 'lucide-react';
import { motion } from 'motion/react';

type VendorCardShop = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  rating: number;
  totalReviews: number;
  totalSales: number;
  createdAt: string;
};

type ProductVendorCardProps = {
  shop: VendorCardShop;
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export function ProductVendorCard({ shop }: ProductVendorCardProps) {
  const navigate = useNavigate();
  const memberSince = new Date(shop.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className='group rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:bg-primary/[0.02] transition-colors duration-300 flex items-center gap-4 cursor-pointer'
      onClick={() =>
        navigate({ to: '/shop/$slug', params: { slug: shop.slug } })
      }
    >
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
          <h3 className='text-sm font-semibold truncate'>{shop.name}</h3>
          {shop.status === 'ACTIVE' && (
            <div className='flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full'>
              <BadgeCheck className='w-3 h-3' />
              Verified
            </div>
          )}
        </div>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Member since {memberSince} · {shop.totalSales.toLocaleString()} sales
        </p>
        <div className='flex items-center gap-2 mt-2'>
          <div className='h-px w-4 bg-primary/40 group-hover:w-6 transition-all duration-300' />
          <Star className='w-3 h-3 text-amber-400 fill-amber-400' />
          <span className='text-[11px] text-muted-foreground font-medium'>
            {shop.rating.toFixed(1)}
          </span>
          <span className='text-[11px] text-muted-foreground'>
            ({shop.totalReviews.toLocaleString()})
          </span>
        </div>
      </div>

      <ArrowRight className='w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0' />
    </motion.div>
  );
}
