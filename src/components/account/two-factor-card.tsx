import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { twoFactor } from '@/lib/auth-client';

type Step = 'idle' | 'password' | 'confirm';

export function TwoFactorCard({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [step, setStep] = useState<Step>('idle');
  const [mode, setMode] = useState<'enable' | 'disable'>('enable');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [totpURI, setTotpURI] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  function reset() {
    setStep('idle');
    setPassword('');
    setCode('');
    setTotpURI('');
    setBackupCodes([]);
  }

  async function startEnable(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      toast.error('Enter your password');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await twoFactor.enable({ password });
      if (error || !data) {
        toast.error(error?.message || 'Could not start 2FA setup');
        return;
      }
      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setStep('confirm');
      setPassword('');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmEnable(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await twoFactor.verifyTotp({ code: code.trim() });
      if (error) {
        toast.error(error.message || 'Invalid code');
        return;
      }
      setIsEnabled(true);
      reset();
      toast.success('Two-factor authentication enabled');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmDisable(event: React.FormEvent) {
    event.preventDefault();
    if (!password) {
      toast.error('Enter your password');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await twoFactor.disable({ password });
      if (error) {
        toast.error(error.message || 'Could not disable 2FA');
        return;
      }
      setIsEnabled(false);
      reset();
      toast.success('Two-factor authentication disabled');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className='rounded-2xl border-border shadow-none'>
      <CardHeader>
        <CardTitle className='text-lg flex items-center gap-2'>
          <ShieldCheck className='h-5 w-5' />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-sm font-medium'>Two-factor authentication</p>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {isEnabled
                ? 'Enabled — you will be asked for a code at sign-in.'
                : 'Add a second step to protect your account.'}
            </p>
          </div>
          {step === 'idle' && (
            <Button
              variant={isEnabled ? 'outline' : 'default'}
              size='sm'
              className='gap-2'
              onClick={() => {
                setMode(isEnabled ? 'disable' : 'enable');
                setStep('password');
              }}
            >
              {isEnabled ? (
                <ShieldOff className='h-4 w-4' />
              ) : (
                <ShieldCheck className='h-4 w-4' />
              )}
              {isEnabled ? 'Disable' : 'Enable'}
            </Button>
          )}
        </div>

        {step === 'password' && mode === 'enable' && (
          <form onSubmit={startEnable}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='tfa-password'>Confirm password</FieldLabel>
                <Input
                  id='tfa-password'
                  type='password'
                  autoComplete='current-password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <FieldDescription>
                  Required before changing two-factor settings.
                </FieldDescription>
              </Field>
              <div className='flex gap-2'>
                <Button type='submit' disabled={isLoading} className='gap-2'>
                  {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                  Continue
                </Button>
                <Button type='button' variant='ghost' onClick={reset}>
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {step === 'password' && mode === 'disable' && (
          <form onSubmit={confirmDisable}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='tfa-disable-password'>
                  Confirm password
                </FieldLabel>
                <Input
                  id='tfa-disable-password'
                  type='password'
                  autoComplete='current-password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </Field>
              <div className='flex gap-2'>
                <Button
                  type='submit'
                  variant='destructive'
                  disabled={isLoading}
                  className='gap-2'
                >
                  {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                  Disable 2FA
                </Button>
                <Button type='button' variant='ghost' onClick={reset}>
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}

        {step === 'confirm' && (
          <div className='space-y-4'>
            <div className='flex flex-col items-center gap-3 sm:flex-row sm:items-start'>
              <div className='rounded-lg border bg-white p-2'>
                {totpURI ? (
                  <QRCodeSVG value={totpURI} size={160} />
                ) : (
                  <div className='h-40 w-40' />
                )}
              </div>
              <div className='text-sm text-muted-foreground space-y-2'>
                <p>
                  Scan this QR code with an authenticator app (Google
                  Authenticator, Authy, 1Password).
                </p>
                {backupCodes.length > 0 && (
                  <details>
                    <summary className='cursor-pointer font-medium text-foreground'>
                      Save your backup codes
                    </summary>
                    <div className='mt-2 grid grid-cols-2 gap-1 font-mono text-xs'>
                      {backupCodes.map((backupCode) => (
                        <span key={backupCode}>{backupCode}</span>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <form onSubmit={confirmEnable}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor='tfa-code'>
                    Enter the 6-digit code
                  </FieldLabel>
                  <Input
                    id='tfa-code'
                    inputMode='numeric'
                    autoComplete='one-time-code'
                    maxLength={6}
                    placeholder='000000'
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>
                <div className='flex gap-2'>
                  <Button type='submit' disabled={isLoading} className='gap-2'>
                    {isLoading && <Loader2 className='h-4 w-4 animate-spin' />}
                    Verify and enable
                  </Button>
                  <Button type='button' variant='ghost' onClick={reset}>
                    Cancel
                  </Button>
                </div>
              </FieldGroup>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
