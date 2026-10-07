import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
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
import { twoFactor } from '@/lib/auth-client';

export const Route = createFileRoute('/auth/two-factor')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error('Enter your verification code');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = useBackupCode
        ? await twoFactor.verifyBackupCode({ code: trimmed, trustDevice })
        : await twoFactor.verifyTotp({ code: trimmed, trustDevice });

      if (error) {
        toast.error(error.message || 'Invalid verification code');
        return;
      }

      toast.success('Verified', { description: 'Redirecting you...' });
      navigate({ to: '/dashboard' });
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className='container flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] items-center justify-center py-12'>
        <Card className='w-full max-w-md'>
          <CardContent className='p-8'>
            <form onSubmit={onSubmit}>
              <FieldGroup>
                <div className='flex flex-col items-center gap-2 text-center'>
                  <div className='flex h-14 w-14 items-center justify-center rounded-full bg-muted'>
                    <ShieldCheck className='h-7 w-7' />
                  </div>
                  <h1 className='text-2xl font-bold'>Two-step verification</h1>
                  <p className='text-muted-foreground text-balance'>
                    {useBackupCode
                      ? 'Enter one of your saved backup codes to continue.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                <Field>
                  <FieldLabel htmlFor='code'>
                    {useBackupCode ? 'Backup code' : 'Verification code'}
                  </FieldLabel>
                  <Input
                    id='code'
                    inputMode={useBackupCode ? 'text' : 'numeric'}
                    autoComplete='one-time-code'
                    placeholder={useBackupCode ? 'XXXXX-XXXXX' : '000000'}
                    maxLength={useBackupCode ? 14 : 6}
                    autoFocus
                    disabled={isLoading}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>

                <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <input
                    type='checkbox'
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    disabled={isLoading}
                  />
                  Trust this device for 30 days
                </label>

                <Button type='submit' disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <KeyRound className='h-4 w-4' />
                  )}
                  Verify
                </Button>

                <FieldDescription className='text-center'>
                  <button
                    type='button'
                    className='underline underline-offset-4'
                    onClick={() => {
                      setUseBackupCode((v) => !v);
                      setCode('');
                    }}
                  >
                    {useBackupCode
                      ? 'Use authenticator code'
                      : 'Use a backup code'}
                  </button>
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
