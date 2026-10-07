import type { ErrorComponentProps } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';

export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  // TanStack signals "route not found" with an isNotFound flag — route it to
  // the 404 affordance instead of the generic failure block.
  if (
    error &&
    typeof error === 'object' &&
    'isNotFound' in error &&
    error.isNotFound === true
  ) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 p-8'>
        <h1 className='text-2xl font-bold'>Page not found</h1>
        <p className='text-muted-foreground text-center max-w-md'>
          The page you are looking for does not exist or has been moved.
        </p>
        <div className='flex gap-2'>
          <Link
            to='/'
            className='text-primary underline-offset-4 hover:underline'
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  // Never render the raw error message — it can leak internals (FE-27).
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 p-8'>
      <h1 className='text-2xl font-bold'>Something went wrong</h1>
      <p className='text-muted-foreground text-center max-w-md'>
        An unexpected error occurred while loading this page. Please try again.
      </p>
      <div className='flex gap-2'>
        <Link
          to='/'
          className='text-primary underline-offset-4 hover:underline'
        >
          Go home
        </Link>
        <button
          type='button'
          onClick={() => reset()}
          className='text-primary underline-offset-4 hover:underline'
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
