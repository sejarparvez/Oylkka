import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Heart, Store } from 'lucide-react';
import { motion } from 'motion/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowedShops, useToggleFollowMutation } from '@/services/extra';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/dashboard/followed-shops')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: follows, isLoading, isError, refetch } = useFollowedShops();
  const toggleMutation = useToggleFollowMutation();

  const handleUnfollow = async (shopId: string) => {
    await toggleMutation.mutateAsync(shopId);
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
          <div>
            <h1 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
              <Heart className='w-6 h-6' />
              Followed Shops
            </h1>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Shops you follow</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-3'>
                {[1, 2].map((i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : isError ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Store className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>Failed to load</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Could not load followed shops. Please try again.
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetch()}
                  className='mt-4'
                >
                  Try Again
                </Button>
              </div>
            ) : !follows || follows.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-16 text-center'>
                <Store className='w-10 h-10 text-muted-foreground mb-3' />
                <p className='text-sm font-semibold'>No followed shops</p>
                <p className='text-sm text-muted-foreground mt-1'>
                  Follow shops to see their updates here.
                </p>
                <Button asChild className='mt-4' size='sm'>
                  <Link to='/shops'>Browse Shops</Link>
                </Button>
              </div>
            ) : (
              <div className='space-y-2'>
                {follows.map((f) => (
                  <div
                    key={f.id}
                    className='flex items-center justify-between p-3 rounded-lg border'
                  >
                    <div className='flex items-center gap-3'>
                      {f.shop.logoUrl ? (
                        <img
                          src={f.shop.logoUrl}
                          alt={f.shop.name}
                          width={40}
                          height={40}
                          loading='lazy'
                          decoding='async'
                          className='w-10 h-10 rounded-lg object-cover'
                        />
                      ) : (
                        <div className='w-10 h-10 rounded-lg bg-muted flex items-center justify-center'>
                          <Store className='w-5 h-5 text-muted-foreground' />
                        </div>
                      )}
                      <div>
                        <Link
                          to='/shop/$slug'
                          params={{ slug: f.shop.slug }}
                          className='text-sm font-medium hover:underline'
                        >
                          {f.shop.name}
                        </Link>
                      </div>
                    </div>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleUnfollow(f.shopId)}
                      disabled={toggleMutation.isPending}
                    >
                      Unfollow
                    </Button>
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
