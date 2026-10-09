import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import Footer from '#/components/layout/footer';
import Header from '#/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signIn } from '@/lib/auth-client';

export const Route = createFileRoute('/auth/signin')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RouteComponent,
});

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationLink, setShowVerificationLink] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { data, error } = await signIn.email({
        email: values.email,
        password: values.password,
      });

      // AUTH-08: a 2FA-enabled account is not fully signed in yet. The
      // twoFactorClient redirect handler sends the user to the verify step.
      if (
        !error &&
        (data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect
      ) {
        return;
      }

      if (error) {
        if (error.status === 401) {
          toast.error('Invalid credentials', {
            description: 'Please check your email and password.',
          });
          setError('email', { type: 'manual', message: ' ' });
          setError('password', {
            type: 'manual',
            message: 'Invalid email or password',
          });
        } else if (error.status === 404) {
          toast.error('Account not found', {
            description: 'No account found with this email address.',
          });
          setError('email', {
            type: 'manual',
            message: 'No account found with this email',
          });
        } else if (error.status === 403) {
          toast.error('Email Not Verified', {
            description: 'Please verify your email address before logging in.',
          });
          setShowVerificationLink(true);
        } else {
          toast.error('Login failed', {
            description:
              error.message || 'Something went wrong. Please try again.',
          });
        }
        return;
      }

      toast.success('Welcome back!', {
        description: 'Redirecting you to Dashboard...',
      });
      navigate({ to: '/dashboard' });
    } catch (err) {
      toast.error('Unexpected error', {
        description: 'An unexpected error occurred. Please try again.',
      });
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSocialLogin(provider: 'google') {
    setIsLoading(true);
    try {
      await signIn.social({
        provider,
        callbackURL: '/dashboard',
        errorCallbackURL: '/auth/error',
      });
      toast.success(
        `Redirecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        {
          description:
            'Please complete the sign-in process in the pop-up or new tab.',
          duration: 2000,
        },
      );
    } catch (err) {
      toast.error(
        `Sign-in Failed via ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
        {
          description:
            'There was an issue initiating the connection. Please check your network and try again.',
        },
      );
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error(`${provider} signup error:`, err);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <>
      <Header />
      <div className='container flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] items-center justify-center py-12'>
        <div className='flex w-full max-w-3xl flex-col gap-6'>
          <Card className='overflow-hidden p-0'>
            <CardContent className='grid p-0 md:grid-cols-2'>
              <form className='p-6 md:p-8' onSubmit={handleSubmit(onSubmit)}>
                <FieldGroup>
                  <div className='flex flex-col items-center gap-2 text-center'>
                    <h1 className='text-2xl font-bold'>Welcome Back</h1>
                    <p className='text-muted-foreground text-balance'>
                      Sign in to your oylkka account to continue
                    </p>
                  </div>

                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor='email'>Email</FieldLabel>
                    <Input
                      id='email'
                      type='email'
                      placeholder='you@example.com'
                      autoComplete='email'
                      disabled={isLoading}
                      aria-invalid={!!errors.email}
                      {...register('email')}
                    />
                    {errors.email && (
                      <FieldError>{errors.email.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.password}>
                    <div className='flex items-center'>
                      <FieldLabel htmlFor='password'>Password</FieldLabel>
                      <Link
                        to='/auth/forgot-password'
                        className='ml-auto text-sm underline-offset-2 hover:underline'
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='current-password'
                        disabled={isLoading}
                        aria-invalid={!!errors.password}
                        className='pr-10'
                        {...register('password')}
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
                          {showPassword ? 'Hide password' : 'Show password'}
                        </span>
                      </Button>
                    </div>
                    {errors.password && (
                      <FieldError>{errors.password.message}</FieldError>
                    )}
                  </Field>

                  {showVerificationLink && (
                    <div className='bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 flex gap-3 items-baseline'>
                      <Info className='h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
                      <span className='text-xs text-blue-700 dark:text-blue-300 mt-1'>
                        Don't receive the verification email?
                      </span>
                      <Link
                        to='/auth/verify'
                        search={{ error: 'lost-verification-email' }}
                        className='text-primary font-bold text-sm whitespace-nowrap shrink-0'
                      >
                        Resend Link
                      </Link>
                    </div>
                  )}

                  <Field>
                    <Button
                      type='submit'
                      disabled={isLoading}
                      className='w-full'
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </Field>

                  <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
                    <span className='text-muted-foreground'>
                      or continue with
                    </span>
                  </FieldSeparator>

                  <Field className='grid grid-cols-1 gap-4'>
                    <Button
                      variant='outline'
                      type='button'
                      onClick={() => handleSocialLogin('google')}
                      disabled={isLoading}
                    >
                      <svg
                        className='mr-2 h-4 w-4'
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                      >
                        <title>Google</title>
                        <path
                          d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
                          fill='currentColor'
                        />
                      </svg>
                      Sign in with Google
                    </Button>
                  </Field>

                  <FieldDescription className='text-center'>
                    Don&apos;t have an account?{' '}
                    <Link
                      to='/auth/signup'
                      className='font-medium underline underline-offset-4 hover:text-primary'
                    >
                      Sign up
                    </Link>
                  </FieldDescription>
                </FieldGroup>
              </form>

              <div className='bg-muted relative hidden md:block overflow-hidden'>
                <div className='absolute inset-0 h-full w-full bg-gradient-to-br from-primary/20 via-primary/5 to-background dark:from-primary/10 dark:via-primary/5 dark:to-background' />
              </div>
            </CardContent>
          </Card>

          <FieldDescription className='px-6 text-center text-xs'>
            By clicking continue, you agree to our{' '}
            <Link
              to='/terms'
              className='underline underline-offset-4 hover:text-primary'
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to='/privacy'
              className='underline underline-offset-4 hover:text-primary'
            >
              Privacy Policy
            </Link>
            .
          </FieldDescription>
        </div>
      </div>
      <Footer />
    </>
  );
}
