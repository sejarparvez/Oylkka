import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';

import { ShopForm } from '@/components/forms/shop-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBDT } from '@/lib/currency';
import { useVendorProducts, type VendorProduct } from '@/services/product';
import { useMyShop } from '@/services/shop';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } },
};

export const Route = createFileRoute('/dashboard/vendor/shop/')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

const statusConfig: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    label: string;
  }
> = {
  PENDING: { variant: 'secondary', label: 'Pending Approval' },
  ACTIVE: { variant: 'default', label: 'Active' },
  SUSPENDED: { variant: 'destructive', label: 'Suspended' },
  REJECTED: { variant: 'destructive', label: 'Rejected' },
};

function RouteComponent() {
  const navigate = useNavigate();
  const { data: shop, isLoading, isError } = useMyShop();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return <ShopSkeleton />;
  }

  if (isError || !shop) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
          <Store className='w-7 h-7 text-muted-foreground' />
        </div>
        <div>
          <p className='text-sm font-semibold'>No shop found</p>
          <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
            You need to open a shop before you can manage it.
          </p>
        </div>
        <Button
          className='rounded-xl h-10 gap-2 mt-2'
          onClick={() => navigate({ to: '/dashboard/become-vendor/apply' })}
        >
          <Store className='w-4 h-4' />
          Open a Shop
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[shop.status] ?? {
    variant: 'outline' as const,
    label: shop.status,
  };

  return (
    <div className='space-y-6'>
      <motion.div
        initial='hidden'
        animate='show'
        variants={fadeUp}
        custom={0}
        className='flex flex-col sm:flex-row sm:items-end justify-between gap-4'
      >
        <div>
          <div className='flex items-center gap-3 mb-3'>
            <div className='h-px w-8 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              Vendor
            </span>
          </div>
          <h1 className='text-2xl md:text-3xl font-bold tracking-tight leading-tight'>
            Shop <span className='italic font-bold text-primary'>Profile</span>
            <span className='text-primary'>.</span>
          </h1>
        </div>
        <div className='flex items-center gap-2 self-start sm:self-auto'>
          {!isEditing && (
            <>
              <Button
                variant='outline'
                className='rounded-xl h-10 gap-2 text-muted-foreground'
                onClick={() => window.open(`/shop/${shop.slug}`, '_blank')}
              >
                <ExternalLink className='w-4 h-4' />
                View Public Page
              </Button>
              <Button
                className='rounded-xl h-10 gap-2'
                onClick={() => setIsEditing(true)}
              >
                <Pencil className='w-4 h-4' />
                Edit Shop
              </Button>
            </>
          )}
          {isEditing && (
            <Button
              variant='ghost'
              className='rounded-xl h-10 gap-2 text-primary'
              onClick={() => setIsEditing(false)}
            >
              <ArrowLeft className='w-4 h-4' />
              Back to Profile
            </Button>
          )}
        </div>
      </motion.div>

      {isEditing ? (
        <ShopForm
          mode='edit'
          shopId={shop.id}
          onSuccess={() => setIsEditing(false)}
          defaultValues={{
            name: shop.name,
            description: shop.description ?? '',
            email: shop.email,
            phone: shop.phone ?? '',
            website: shop.website ?? '',
            addressLine1: shop.addressLine1 ?? '',
            addressLine2: shop.addressLine2 ?? '',
            city: shop.city ?? '',
            state: shop.state ?? '',
            country: shop.country ?? '',
            postalCode: shop.postalCode ?? '',
            existingLogoUrl: shop.logoUrl ?? undefined,
            existingBannerUrl: shop.bannerUrl ?? undefined,
          }}
        />
      ) : (
        <motion.div
          initial='hidden'
          animate='show'
          variants={gridVariants}
          className='space-y-6'
        >
          <ShopIdentityCard shop={shop} statusInfo={statusInfo} />
          <ShopStatsStrip shop={shop} />
          <div className='grid gap-5 md:grid-cols-3'>
            <ShopInfoCard shop={shop} />
            <ShopContactCard shop={shop} />
            <ShopAddressCard shop={shop} />
          </div>
          <ShopProductsGrid />
        </motion.div>
      )}
    </div>
  );
}

function ShopSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-start sm:items-end justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-8 w-48' />
        </div>
        <div className='flex gap-2'>
          <Skeleton className='h-10 w-36 rounded-xl' />
          <Skeleton className='h-10 w-28 rounded-xl' />
        </div>
      </div>
      <Skeleton className='h-56 w-full rounded-2xl' />
      <div className='grid grid-cols-2 md:grid-cols-4 gap-0 rounded-2xl border border-border overflow-hidden'>
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <div key={i} className='py-8 px-6 flex flex-col items-center gap-3'>
            <Skeleton className='h-8 w-16' />
            <Skeleton className='h-3 w-20' />
          </div>
        ))}
      </div>
      <div className='grid gap-5 md:grid-cols-3'>
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
          <Skeleton key={i} className='h-44 rounded-2xl' />
        ))}
      </div>
      <div>
        <Skeleton className='h-4 w-24 mb-4' />
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={i}
              className='rounded-2xl border border-border overflow-hidden'
            >
              <Skeleton className='aspect-square w-full' />
              <div className='p-3 space-y-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-5 w-12' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopIdentityCard({
  shop,
  statusInfo,
}: {
  shop: {
    bannerUrl: string | null;
    logoUrl: string | null;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    rating: number;
    totalReviews: number;
    totalSales: number;
  };
  statusInfo: {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    label: string;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div variants={cardVariants}>
      <Card className='rounded-2xl border-border p-0 shadow-none overflow-hidden'>
        <div className='relative h-56 md:h-96 overflow-hidden bg-linear-to-r from-primary/5 via-primary/10 to-primary/5'>
          {shop.bannerUrl ? (
            <>
              <img
                src={shop.bannerUrl}
                alt='Shop banner'
                className='w-full h-full object-cover'
              />
              <div className='absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent' />
            </>
          ) : (
            <div className='w-full h-full flex items-center justify-center'>
              <div className='flex flex-col items-center gap-2 text-muted-foreground/40'>
                <ImageIcon className='w-12 h-12' />
                <span className='text-xs font-medium tracking-wide uppercase'>
                  No Banner
                </span>
              </div>
            </div>
          )}
        </div>

        <CardContent ref={ref} className='relative px-6 pb-6'>
          <div className='flex items-end gap-5 -mt-10 md:-mt-14 mb-4'>
            <div className='relative w-28 h-28 rounded-2xl overflow-hidden bg-card shrink-0 ring-4 ring-background shadow-lg'>
              {shop.logoUrl ? (
                <img
                  src={shop.logoUrl}
                  alt={shop.name}
                  className='w-full h-full object-cover'
                />
              ) : (
                <div className='w-full h-full flex items-center justify-center bg-muted'>
                  <Store className='w-10 h-10 text-muted-foreground/50' />
                </div>
              )}
            </div>

            <div className='flex-1 min-w-0 pb-1'>
              <div className='flex items-center gap-3 flex-wrap'>
                <h2 className='text-2xl md:text-3xl font-bold tracking-tight truncate'>
                  {shop.name}
                </h2>
                <Badge
                  variant={statusInfo.variant}
                  className='text-[10px] font-semibold tracking-[0.12em] uppercase'
                >
                  {statusInfo.label}
                </Badge>
              </div>

              <div className='flex items-center gap-4 mt-1.5'>
                <div className='flex items-center gap-1.5'>
                  <Star className='w-4 h-4 text-amber-400 fill-amber-400' />
                  <span className='text-sm font-semibold tabular-nums'>
                    {shop.rating.toFixed(1)}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    ({shop.totalReviews.toLocaleString()} reviews)
                  </span>
                </div>
                <div className='w-px h-4 bg-border' />
                <span className='text-sm text-muted-foreground'>
                  {shop.totalSales.toLocaleString()} sales
                </span>
              </div>
            </div>
          </div>

          {shop.description && (
            <p className='text-sm leading-relaxed text-muted-foreground max-w-2xl'>
              {shop.description}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ShopStatsStrip({
  shop,
}: {
  shop: {
    totalSales: number;
    totalOrders: number;
    rating: number;
    totalReviews: number;
  };
}) {
  const stats = [
    {
      value: `৳${formatBDT(shop.totalSales)}`,
      label: 'Total Sales',
      icon: ShoppingCart,
    },
    {
      value: shop.totalOrders.toLocaleString(),
      label: 'Orders',
      icon: Package,
    },
    { value: shop.rating.toFixed(1), label: 'Rating', icon: Star },
    {
      value: shop.totalReviews.toLocaleString(),
      label: 'Reviews',
      icon: ShoppingBag,
    },
  ];

  return (
    <motion.div variants={cardVariants}>
      <div className='rounded-2xl border border-border bg-card overflow-hidden'>
        <div className='grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border'>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className='py-8 px-6 flex flex-col items-center justify-center gap-2'
            >
              <p className='text-3xl md:text-4xl font-bold tabular-nums text-primary'>
                {stat.value}
              </p>
              <div className='flex items-center gap-1.5'>
                <stat.icon className='w-3.5 h-3.5 text-muted-foreground' />
                <p className='text-xs text-muted-foreground tracking-wide uppercase font-medium'>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ShopInfoCard({
  shop,
}: {
  shop: {
    name: string;
    slug: string;
    email: string;
    phone: string | null;
    website: string | null;
    createdAt: string;
  };
}) {
  return (
    <ShopInfoCardShell icon={Building2} label='Shop Info'>
      <ShopInfoRow icon={BadgeCheck} label='Slug' value={shop.slug} />
      <ShopInfoRow
        icon={Globe}
        label='Website'
        value={shop.website ?? 'Not set'}
      />
      <ShopInfoRow
        icon={Building2}
        label='Member since'
        value={new Date(shop.createdAt).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}
      />
    </ShopInfoCardShell>
  );
}

function ShopContactCard({
  shop,
}: {
  shop: {
    email: string;
    phone: string | null;
  };
}) {
  return (
    <ShopInfoCardShell icon={Phone} label='Contact'>
      <ShopInfoRow icon={Mail} label='Email' value={shop.email} />
      <ShopInfoRow icon={Phone} label='Phone' value={shop.phone ?? 'Not set'} />
    </ShopInfoCardShell>
  );
}

function ShopAddressCard({
  shop,
}: {
  shop: {
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
  };
}) {
  const hasAddress = shop.addressLine1 || shop.city || shop.country;

  return (
    <ShopInfoCardShell icon={MapPin} label='Address'>
      {hasAddress ? (
        <div className='space-y-1 text-sm text-muted-foreground'>
          {shop.addressLine1 && <p>{shop.addressLine1}</p>}
          {shop.addressLine2 && <p>{shop.addressLine2}</p>}
          <p>
            {[shop.city, shop.state, shop.postalCode]
              .filter(Boolean)
              .join(', ')}
          </p>
          {shop.country && <p>{shop.country}</p>}
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>Not set</p>
      )}
    </ShopInfoCardShell>
  );
}

function ShopProductsGrid() {
  const navigate = useNavigate();
  const { data: products, isLoading } = useVendorProducts();

  const displayed = products?.slice(0, 4) ?? [];

  return (
    <motion.div variants={cardVariants}>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-3'>
          <div className='h-px w-8 bg-primary' />
          <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
            Products
          </span>
        </div>
        <Button
          variant='ghost'
          className='text-primary gap-1 px-0 h-auto'
          onClick={() => navigate({ to: '/dashboard/vendor/products' })}
        >
          View All
          <ArrowRight className='w-3.5 h-3.5' />
        </Button>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
              key={i}
              className='rounded-2xl border border-border overflow-hidden'
            >
              <Skeleton className='aspect-square w-full' />
              <div className='p-3 space-y-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-5 w-12' />
              </div>
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className='rounded-2xl border border-border bg-card p-8 flex flex-col items-center justify-center gap-3 text-center'>
          <div className='w-12 h-12 rounded-xl bg-muted flex items-center justify-center'>
            <Package className='w-5 h-5 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No products yet</p>
            <p className='text-xs text-muted-foreground mt-1 max-w-xs'>
              Add your first product to showcase in your shop.
            </p>
          </div>
          <Button
            size='sm'
            className='rounded-xl gap-1.5 mt-1'
            onClick={() => navigate({ to: '/dashboard/vendor/products/add' })}
          >
            <Plus className='w-3.5 h-3.5' />
            Add Product
          </Button>
        </div>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
          {displayed.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ProductCard({ product }: { product: VendorProduct }) {
  const statusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { variant: 'default' as const, label: 'Active' };
      case 'DRAFT':
        return { variant: 'secondary' as const, label: 'Draft' };
      case 'ARCHIVED':
        return { variant: 'outline' as const, label: 'Archived' };
      case 'OUT_OF_STOCK':
        return { variant: 'destructive' as const, label: 'Out of Stock' };
      default:
        return { variant: 'outline' as const, label: status };
    }
  };

  const { variant, label } = statusBadge(product.status);

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className='group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-black/5 transition-shadow duration-300'
    >
      <div className='relative aspect-square overflow-hidden bg-muted'>
        {product.images?.[0]?.imageUrl ? (
          <img
            src={product.images[0].imageUrl}
            alt={product.productName}
            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <Package className='w-8 h-8 text-muted-foreground/50' />
          </div>
        )}
      </div>
      <div className='p-3 space-y-1.5'>
        <h3 className='text-sm font-semibold leading-snug line-clamp-2'>
          {product.productName}
        </h3>
        <p className='text-base font-bold tabular-nums'>
          ৳{formatBDT(product.price)}
        </p>
        <Badge
          variant={variant}
          className='text-[10px] font-semibold tracking-[0.12em] uppercase'
        >
          {label}
        </Badge>
      </div>
    </motion.div>
  );
}

function ShopInfoCardShell({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={cardVariants}>
      <Card className='rounded-2xl border-border shadow-none h-full'>
        <CardContent className='p-5'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
              <Icon className='w-3.5 h-3.5 text-primary' />
            </div>
            <div className='h-px w-4 bg-primary' />
            <span className='text-[10px] font-semibold tracking-[0.18em] uppercase text-primary'>
              {label}
            </span>
          </div>
          <div className='space-y-3'>{children}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ShopInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className='flex items-start gap-3 group'>
      <div className='w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5'>
        <Icon className='w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200' />
      </div>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className='text-sm font-medium truncate'>{value}</p>
      </div>
    </div>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      <rect width='18' height='18' x='3' y='3' rx='2' ry='2' />
      <circle cx='9' cy='9' r='2' />
      <path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' />
    </svg>
  );
}
