import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import Footer from '#/components/layout/footer';
import Header from '#/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/auth-client';

export const Route = createFileRoute('/reset-password')({
  validateSearch: (
    search: Record<string, string | undefined>,
  ): { token?: string; email?: string } => ({
    token: search.token,
    email: search.email,
  }),
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { token, email } = Route.useSearch();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error: resetError } = await resetPassword({
        newPassword: password,
        token,
      });

      if (resetError) {
        const message = resetError.message?.toLowerCase() || '';
        if (message.includes('invalid') || message.includes('expired')) {
          setError(
            'This reset link is invalid or expired. Please request a new one.',
          );
        } else if (message.includes('password')) {
          setError(resetError.message ?? null);
        } else {
          setError(resetError.message ?? 'Failed to reset password.');
        }
        return;
      }

      toast.success('Password reset successfully!', {
        description: 'You can now sign in with your new password.',
      });

      if (email) {
        fetch('/api/auth/send-password-reset-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }).catch(() => {});
      }

      navigate({ to: '/auth/signin' });
    } catch {
      toast.error('Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <Header />
        <div className='container flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] items-center justify-center py-12'>
          <Card className='w-full max-w-md'>
            <CardContent className='flex flex-col items-center gap-4 p-8 text-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20'>
                <AlertTriangle className='h-8 w-8 text-amber-600 dark:text-amber-400' />
              </div>
              <h1 className='text-2xl font-bold'>Invalid Link</h1>
              <p className='text-muted-foreground text-balance text-sm'>
                This reset link is invalid or has expired.
              </p>
              <Button size='lg' asChild>
                <Link to='/auth/forgot-password'>Request a new reset link</Link>
              </Button>
              <Button variant='outline' size='lg' asChild>
                <Link to='/auth/signin'>Back to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className='container flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] items-center justify-center py-12'>
        <Card className='w-full max-w-md'>
          <CardContent className='p-6 md:p-8'>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className='flex flex-col items-center gap-2 text-center'>
                  <h1 className='text-2xl font-bold'>Reset your password</h1>
                  <p className='text-muted-foreground text-balance text-sm'>
                    Enter your new password below.
                  </p>
                </div>

                {error && (
                  <div className='rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300'>
                    {error}
                    {error.includes('expired') && (
                      <Link
                        to='/auth/forgot-password'
                        className='ml-1 underline underline-offset-2'
                      >
                        Request a new one.
                      </Link>
                    )}
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor='password'>New Password</FieldLabel>
                  <div className='relative'>
                    <Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      disabled={isLoading}
                      className='pr-10'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                      <span className='sr-only'>
                        {showPassword ? 'Hide' : 'Show'} password
                      </span>
                    </Button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor='confirmPassword'>
                    Confirm Password
                  </FieldLabel>
                  <div className='relative'>
                    <Input
                      id='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete='new-password'
                      disabled={isLoading}
                      className='pr-10'
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='absolute right-0 top-0 h-full px-3 hover:bg-transparent'
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                      <span className='sr-only'>
                        {showConfirmPassword ? 'Hide' : 'Show'} password
                      </span>
                    </Button>
                  </div>
                </Field>

                <Field>
                  <Button type='submit' disabled={isLoading} className='w-full'>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </Field>

                <FieldDescription className='text-center'>
                  <Link
                    to='/auth/signin'
                    className='text-sm underline underline-offset-4 hover:text-primary'
                  >
                    Back to sign in
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
}
