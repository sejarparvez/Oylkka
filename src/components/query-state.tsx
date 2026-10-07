import { PackageX } from 'lucide-react';
import { Button } from '@/components/ui/button';

type QueryErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

/**
 * Shared failure branch for list/detail queries (FE-22). A failed query must
 * never render as an empty state — it has to be visibly distinguishable from
 * "no data" and it must offer an in-place retry rather than a full reload.
 */
export function QueryErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
      <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
        <PackageX className='w-7 h-7 text-muted-foreground' />
      </div>
      <div>
        <p className='text-sm font-semibold'>{title}</p>
        <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
          {description}
        </p>
      </div>
      {onRetry && (
        <Button size='sm' variant='outline' onClick={onRetry} className='mt-2'>
          Try Again
        </Button>
      )}
    </div>
  );
}
