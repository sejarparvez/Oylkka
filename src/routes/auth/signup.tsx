import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router';
import { Eye, EyeOff } from 'lucide-react';
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
import { signIn, signUp } from '@/lib/auth-client';

export const Route = createFileRoute('/auth/signup')({
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: RouteComponent,
});

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);
    try {
      // --- Pre-check: is this email already taken? ---
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        if (checkData.provider === 'google') {
          toast.error('Google account found', {
            description:
              'This email is linked to a Google account. Sign in with Google instead.',
          });
          setError('email', {
            type: 'manual',
            message: 'Linked to a Google account — sign in with Google',
          });
        } else {
          toast.error('Email already registered', {
            description:
              'An account with this email already exists. Please sign in.',
          });
          setError('email', {
            type: 'manual',
            message: 'Email already registered',
          });
        }
        return;
      }

      // --- Proceed with Better Auth signup ---
      const { error } = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.status === 422) {
          const message = error.message?.toLowerCase() || '';
          if (message.includes('email')) {
            toast.error('Email already registered', {
              description: 'An account with this email already exists.',
            });
            setError('email', {
              type: 'manual',
              message: 'Email already registered',
            });
          } else if (message.includes('password')) {
            toast.error('Weak password', {
              description: 'Password must be at least 6 characters long.',
            });
            setError('password', {
              type: 'manual',
              message: 'Password too weak',
            });
          } else {
            toast.error('Registration failed', {
              description: error.message || 'Please check your information.',
            });
          }
        } else {
          toast.error('Registration failed', {
            description:
              error.message || 'Something went wrong. Please try again.',
          });
        }
        return;
      }

      toast.success('Verification email sent', {
        description:
          'If this is a new account, check your inbox for a verification link.',
      });
      navigate({ to: '/auth/signin' });
    } catch (err) {
      toast.error('Unexpected error', {
        description: 'An unexpected error occurred. Please try again.',
      });
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error('Signup error:', err);
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
                    <h1 className='text-2xl font-bold'>Create Account</h1>
                    <p className='text-muted-foreground text-balance'>
                      Sign up to get started
                    </p>
                  </div>

                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor='name'>Name</FieldLabel>
                    <Input
                      id='name'
                      type='text'
                      placeholder='John Doe'
                      autoComplete='name'
                      disabled={isLoading}
                      aria-invalid={!!errors.name}
                      {...register('name')}
                    />
                    {errors.name && (
                      <FieldError>{errors.name.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor='email'>Email</FieldLabel>
                    <Input
                      id='email'
                      type='email'
                      placeholder='john@example.com'
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
                    <FieldLabel htmlFor='password'>Password</FieldLabel>
                    <div className='relative'>
                      <Input
                        id='password'
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='new-password'
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
                        tabIndex={-1}
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

                  <Field data-invalid={!!errors.confirmPassword}>
                    <FieldLabel htmlFor='confirmPassword'>
                      Confirm Password
                    </FieldLabel>
                    <div className='relative'>
                      <Input
                        id='confirmPassword'
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete='new-password'
                        disabled={isLoading}
                        aria-invalid={!!errors.confirmPassword}
                        className='pr-10'
                        {...register('confirmPassword')}
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
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                        <span className='sr-only'>
                          {showConfirmPassword
                            ? 'Hide password'
                            : 'Show password'}{' '}
                          confirm password
                        </span>
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <FieldError>{errors.confirmPassword.message}</FieldError>
                    )}
                  </Field>

                  <Field>
                    <Button
                      type='submit'
                      disabled={isLoading}
                      className='w-full'
                    >
                      {isLoading ? 'Creating Account' : 'Create Account'}
                    </Button>
                  </Field>

                  <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
                    <span className='text-xs text-muted-foreground'>
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
                      Continue with Google
                    </Button>
                  </Field>

                  <FieldDescription className='text-center'>
                    Already have an account?{' '}
                    <Link
                      to='/auth/signin'
                      className='font-medium underline underline-offset-4 hover:text-primary'
                    >
                      Sign In
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
