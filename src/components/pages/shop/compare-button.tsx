import { Link } from '@tanstack/react-router';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  addToCompare,
  MAX_COMPARE,
  removeFromCompare,
  useCompareIds,
} from '@/lib/compare';
import { cn } from '@/lib/utils';

export function useToggleCompare(productId: string) {
  const ids = useCompareIds();
  const isCompared = ids.includes(productId);

  const toggle = () => {
    if (isCompared) {
      removeFromCompare(productId);
      toast.success('Removed from compare');
      return;
    }
    const result = addToCompare(productId);
    if (result === 'full') {
      toast.error(`You can compare up to ${MAX_COMPARE} products`);
      return;
    }
    toast.success('Added to compare');
  };

  return { isCompared, toggle };
}

/** Compact icon toggle overlaid on product cards. */
export function CompareIconButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const { isCompared, toggle } = useToggleCompare(productId);

  return (
    <button
      type='button'
      aria-pressed={isCompared}
      aria-label={isCompared ? 'Remove from compare' : 'Add to compare'}
      onClick={toggle}
      className={cn(
        'absolute z-10 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 hover:bg-background',
        isCompared ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        className,
      )}
    >
      <Scale
        className={cn(
          'w-3.5 h-3.5 transition-colors',
          isCompared
            ? 'text-primary'
            : 'text-muted-foreground hover:text-primary',
        )}
      />
    </button>
  );
}

/** Full button for the product detail page. */
export function CompareButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const { isCompared, toggle } = useToggleCompare(productId);

  return (
    <Button
      type='button'
      variant='outline'
      onClick={toggle}
      className={cn('gap-2', className)}
    >
      <Scale className='w-4 h-4' />
      {isCompared ? 'Added to Compare' : 'Compare'}
    </Button>
  );
}

/** Header affordance linking to the comparison page when the list is non-empty. */
export function CompareLink() {
  const ids = useCompareIds();

  if (ids.length === 0) return null;

  return (
    <Button variant='ghost' size='sm' asChild className='gap-1.5'>
      <Link to='/compare' search={{ ids: ids.join(',') }}>
        <Scale className='w-4 h-4' />
        Compare ({ids.length})
      </Link>
    </Button>
  );
}
