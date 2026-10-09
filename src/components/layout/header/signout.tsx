import { useRouter } from '@tanstack/react-router';
import { Power } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
// 1. Import the server function you showed me
import { signOut } from '@/lib/auth.functions';
import { cn } from '@/lib/utils';

export function SignOut({ className }: { className?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // 2. Call the Server Function directly
      // This sends a POST request to your server, which runs auth.api.signOut
      await signOut();

      // 3. Sync the UI
      // Force all loaders (like the one in __root.tsx) to re-run
      await router.invalidate();

      // 4. Send them home
      await router.navigate({ to: '/', replace: true });
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <div
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 text-sm group cursor-pointer hover:bg-destructive hover:text-white rounded-sm transition-colors',
            className,
          )}
        >
          <Power className='mr-2 h-4 w-4 text-destructive group-hover:text-white' />
          Sign Out
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be signed out and your server session will be cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant='destructive' onClick={handleSignOut}>
              <Power />
              Sign Out
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
