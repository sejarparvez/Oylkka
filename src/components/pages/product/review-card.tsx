import { Image } from '@unpic/react';
import { BadgeCheck, Star, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PublicReview } from '@/services/product';
import { useToggleHelpfulVoteMutation } from '@/services/product';

type ReviewCardProps = {
  review: PublicReview;
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [showAllImages, setShowAllImages] = useState(false);
  const toggleVote = useToggleHelpfulVoteMutation();
  const displayImages = review.images.slice(
    0,
    showAllImages ? review.images.length : 3,
  );
  const hasMore = review.images.length > 3 && !showAllImages;

  return (
    <div className='rounded-2xl border border-border bg-card p-5'>
      <div className='flex items-start gap-3 mb-3'>
        <div className='w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0 ring-2 ring-border'>
          {review.user.image ? (
            <Image
              src={review.user.image}
              width={40}
              height={40}
              alt={review.user.name}
              layout='fixed'
              className='object-cover w-full h-full'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center bg-primary/10'>
              <span className='text-xs font-bold text-primary'>
                {review.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-sm font-semibold'>{review.user.name}</span>
            {review.verified && (
              <BadgeCheck className='w-3.5 h-3.5 text-primary shrink-0' />
            )}
          </div>
          <div className='flex items-center gap-2 mt-0.5'>
            <div className='flex items-center gap-0.5'>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'w-3 h-3',
                    s <= review.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-muted-foreground',
                  )}
                />
              ))}
            </div>
            <span className='text-xs text-muted-foreground'>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {review.title && (
        <h4 className='text-sm font-semibold mb-1'>{review.title}</h4>
      )}
      <p className='text-sm text-muted-foreground leading-relaxed'>
        {review.content}
      </p>

      {review.images.length > 0 && (
        <div className='flex gap-2 mt-3 overflow-x-auto scrollbar-none'>
          {displayImages.map((img) => (
            <div
              key={img.id}
              className='relative w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border'
            >
              <Image
                src={img.imageUrl}
                width={80}
                height={80}
                alt='Review image'
                layout='fixed'
                className='object-cover w-full h-full'
              />
            </div>
          ))}
          {hasMore && (
            <button
              type='button'
              onClick={() => setShowAllImages(true)}
              className='w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors'
            >
              +{review.images.length - 3}
            </button>
          )}
        </div>
      )}

      <div className='flex items-center gap-3 mt-3 pt-3 border-t border-border'>
        <button
          type='button'
          aria-pressed={review.viewerVoted}
          disabled={toggleVote.isPending}
          onClick={() =>
            toggleVote.mutate({
              productId: review.productId,
              reviewId: review.id,
            })
          }
          className={cn(
            'flex items-center gap-1 text-xs transition-colors disabled:opacity-60',
            review.viewerVoted
              ? 'text-primary font-medium'
              : 'text-muted-foreground hover:text-primary',
          )}
        >
          <ThumbsUp
            className={cn('w-3.5 h-3.5', review.viewerVoted && 'fill-current')}
          />
          <span>{review.helpfulCount}</span>
          <span className='sr-only'>helpful</span>
        </button>
      </div>

      {review.vendorReply && (
        <div className='mt-3 pt-3 border-t border-border bg-muted/30 rounded-lg p-3'>
          <p className='text-xs font-semibold text-primary mb-1'>
            Seller Response
          </p>
          <p className='text-sm text-muted-foreground leading-relaxed'>
            {review.vendorReply}
          </p>
          {review.vendorRepliedAt && (
            <p className='text-xs text-muted-foreground mt-1'>
              {new Date(review.vendorRepliedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
