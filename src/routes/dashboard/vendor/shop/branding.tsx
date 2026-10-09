import { createFileRoute, redirect } from '@tanstack/react-router';
import { ImageIcon, Loader2, Palette, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyShop, useUpdateShopMutation } from '@/services/shop';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/vendor/shop/branding')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: shop, isLoading } = useMyShop();
  const updateMutation = useUpdateShopMutation();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!shop) return;
    const fd = new FormData();
    fd.append('name', shop.name);
    fd.append('email', shop.email);

    if (logoFile) {
      fd.append('logo', logoFile);
    } else if (logoPreview === null && shop.logoUrl) {
      fd.append('keepExistingLogo', 'false');
    } else {
      fd.append('keepExistingLogo', 'true');
    }

    if (bannerFile) {
      fd.append('banner', bannerFile);
    } else if (bannerPreview === null && shop.bannerUrl) {
      fd.append('keepExistingBanner', 'false');
    } else {
      fd.append('keepExistingBanner', 'true');
    }

    await updateMutation.mutateAsync(fd);
  };

  const logoUrl = logoPreview || shop?.logoUrl || null;
  const bannerUrl = bannerPreview || shop?.bannerUrl || null;

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-48' />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <Card>
            <CardContent className='py-8'>
              <Skeleton className='h-40 w-full' />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='py-8'>
              <Skeleton className='h-40 w-full' />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <Palette className='w-12 h-12 text-muted-foreground mb-4' />
        <h2 className='text-lg font-semibold'>No Shop Found</h2>
        <p className='text-sm text-muted-foreground mt-2'>
          You need to create a shop before customizing branding.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className='space-y-6'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <Palette className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>Branding</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Customize your shop's visual identity
            </p>
          </div>
        </div>
      </motion.div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <motion.div variants={fadeUp} custom={1}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Shop Logo</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-center h-48 rounded-lg border-2 border-dashed bg-muted/30 relative overflow-hidden'>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt='Shop logo'
                    width={400}
                    height={400}
                    loading='lazy'
                    decoding='async'
                    className='max-h-full max-w-full object-contain p-4'
                  />
                ) : (
                  <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                    <ImageIcon className='w-10 h-10' />
                    <span className='text-sm'>No logo uploaded</span>
                  </div>
                )}
              </div>

              <div className='flex items-center gap-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className='w-4 h-4 mr-2' />
                  {shop.logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {(logoFile || shop.logoUrl) && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearLogo}
                    className='text-destructive'
                  >
                    <X className='w-4 h-4 mr-2' />
                    Remove
                  </Button>
                )}
                <input
                  ref={logoInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={handleLogoChange}
                  className='hidden'
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                Recommended: 200x200px. Max 500KB. JPEG, PNG, or WEBP.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Shop Banner</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-center h-48 rounded-lg border-2 border-dashed bg-muted/30 relative overflow-hidden'>
                {bannerUrl ? (
                  <img
                    src={bannerUrl}
                    alt='Shop banner'
                    width={1200}
                    height={300}
                    loading='lazy'
                    decoding='async'
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                    <ImageIcon className='w-10 h-10' />
                    <span className='text-sm'>No banner uploaded</span>
                  </div>
                )}
              </div>

              <div className='flex items-center gap-3'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <Upload className='w-4 h-4 mr-2' />
                  {shop.bannerUrl ? 'Change Banner' : 'Upload Banner'}
                </Button>
                {(bannerFile || shop.bannerUrl) && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearBanner}
                    className='text-destructive'
                  >
                    <X className='w-4 h-4 mr-2' />
                    Remove
                  </Button>
                )}
                <input
                  ref={bannerInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  onChange={handleBannerChange}
                  className='hidden'
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                Recommended: 1200x300px. Max 500KB. JPEG, PNG, or WEBP.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp} custom={3}>
        <div className='flex items-center gap-3'>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            )}
            Save Changes
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
