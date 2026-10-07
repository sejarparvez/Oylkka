import { ChevronDown, Loader2, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicProductReviews } from '@/services/product';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import { ReviewSummary } from './review-summary';

type ProductReviewsProps = {
  productId: string;
  totalReviewCount: number;
  ratingBreakdown: Record<number, number>;
};

export function ProductReviews({
  productId,
  totalReviewCount,
  ratingBreakdown,
}: ProductReviewsProps) {
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const { data, isLoading, isError, refetch } = usePublicProductReviews(
    productId,
    page,
  );

  useEffect(() => {
    if (data) setTotalPages(data.totalPages);
  }, [data]);

  const loadedPages = Array.from({ length: page }, (_, i) => i + 1);
  const hasReviews = page > 1 || (data?.reviews.length ?? 0) > 0;
  const hasMore = page < totalPages || (page > 1 && isError);

  const handleLoadMore = () => {
    if (isError) {
      refetch();
    } else {
      setPage((p) => p + 1);
    }
  };

  const avgRating =
    totalReviewCount > 0
      ? Object.entries(ratingBreakdown).reduce(
          (sum, [star, count]) => sum + Number(star) * count,
          0,
        ) / totalReviewCount
      : 0;

  return (
    <div className='space-y-8'>
      <ReviewSummary
        avgRating={avgRating}
        totalReviewCount={totalReviewCount}
        ratingBreakdown={ratingBreakdown}
      />

      <div className='flex justify-center'>
        <Button onClick={() => setFormOpen(true)}>Write a Review</Button>
      </div>

      <ReviewForm
        productId={productId}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => refetch()}
      />

      {isLoading && page === 1 && (
        <div className='space-y-4'>
          {[0, 1, 2].map((i) => (
            <ReviewSkeleton key={`skel-${i}`} />
          ))}
        </div>
      )}

      {isError && (
        <p className='text-sm text-muted-foreground text-center py-8'>
          Failed to load reviews.
        </p>
      )}

      {!isLoading && !isError && !hasReviews && (
        <div className='flex flex-col items-center justify-center py-12 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <MessageCircle className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No reviews yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              Be the first to share your thoughts on this product.
            </p>
          </div>
        </div>
      )}

      {hasReviews && (
        <motion.div
          initial='hidden'
          animate='show'
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.06 } },
          }}
          className='space-y-4'
        >
          {loadedPages.map((p) => (
            <ReviewListPage key={p} productId={productId} page={p} />
          ))}
        </motion.div>
      )}

      {isLoading && page > 1 && (
        <div className='flex justify-center pt-2'>
          <Loader2 className='w-4 h-4 animate-spin text-muted-foreground' />
        </div>
      )}

      {hasMore && (
        <div className='flex justify-center pt-2'>
          <Button
            variant='outline'
            size='sm'
            className='gap-2'
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            <ChevronDown className='w-4 h-4' />
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewListPage({
  productId,
  page,
}: {
  productId: string;
  page: number;
}) {
  const { data } = usePublicProductReviews(productId, page);

  return (
    <>
      {data?.reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </>
  );
}

function ReviewSkeleton() {
  return (
    <div className='rounded-2xl border border-border p-5'>
      <div className='flex items-start gap-3 mb-3'>
        <Skeleton className='w-9 h-9 rounded-full shrink-0' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-3 w-24' />
        </div>
      </div>
      <Skeleton className='h-3 w-full mb-2' />
      <Skeleton className='h-3 w-3/4 mb-2' />
      <Skeleton className='h-3 w-1/2' />
      <div className='flex gap-2 mt-3'>
        {[0, 1, 2].map((i) => (
          <Skeleton key={`img-skel-${i}`} className='w-16 h-16 rounded-lg' />
        ))}
      </div>
    </div>
  );
}
