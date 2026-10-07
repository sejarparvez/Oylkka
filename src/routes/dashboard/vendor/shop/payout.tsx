import { createFileRoute, redirect } from '@tanstack/react-router';
import { BadgeIndianRupee, Loader2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  type PayoutMethod,
  usePayoutDetails,
  useUpdatePayoutDetailsMutation,
} from '@/services/vendor-payout-details';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const METHOD_OPTIONS: { value: PayoutMethod; label: string }[] = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
];

export const Route = createFileRoute('/dashboard/vendor/shop/payout')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = usePayoutDetails();
  const updateMutation = useUpdatePayoutDetailsMutation();

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('BANK');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  useEffect(() => {
    if (data?.payoutMethod) {
      setPayoutMethod(data.payoutMethod);
      setBankName(data.bankName ?? '');
      setBankAccountName(data.bankAccountName ?? '');
      setMobileNumber('');
    }
  }, [data]);

  const handleSave = async () => {
    await updateMutation.mutateAsync(
      payoutMethod === 'BANK'
        ? {
            payoutMethod,
            bankName,
            bankAccountName,
            bankAccountNumber,
          }
        : { payoutMethod, mobileNumber },
    );
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-48' />
        <Card>
          <CardHeader>
            <Skeleton className='h-5 w-32' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-32 w-full' />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className='space-y-6 max-w-2xl'
      initial='hidden'
      animate='show'
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp} custom={0}>
        <div className='flex items-center gap-2'>
          <BadgeIndianRupee className='w-6 h-6' />
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>
              Payout Details
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Where we send your earnings. Saved details are shown masked.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} custom={1}>
        <Card>
          <CardHeader>
            <CardTitle className='text-lg'>Payout Method</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid grid-cols-3 gap-3'>
              {METHOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => setPayoutMethod(opt.value)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    payoutMethod === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {payoutMethod === 'BANK' ? (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='bankName'>Bank Name</Label>
                  <Input
                    id='bankName'
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder='e.g. Dutch-Bangla Bank'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='bankAccountName'>Account Holder Name</Label>
                  <Input
                    id='bankAccountName'
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder='Name as it appears on the account'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='bankAccountNumber'>
                    Account Number / IBAN
                  </Label>
                  <Input
                    id='bankAccountNumber'
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder={
                      data?.bankAccountNumber
                        ? `Saved: ${data.bankAccountNumber}`
                        : 'Account number'
                    }
                  />
                  {data?.bankAccountNumber && !bankAccountNumber && (
                    <p className='text-xs text-muted-foreground'>
                      Leave blank to keep the saved account.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='mobileNumber'>
                    {payoutMethod} Account Number
                  </Label>
                  <Input
                    id='mobileNumber'
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder={
                      data?.payoutMethod === payoutMethod && data.mobileNumber
                        ? `Saved: ${data.mobileNumber}`
                        : '01XXXXXXXXX'
                    }
                  />
                  {data?.payoutMethod === payoutMethod &&
                    data.mobileNumber &&
                    !mobileNumber && (
                      <p className='text-xs text-muted-foreground'>
                        Leave blank to keep the saved number.
                      </p>
                    )}
                </div>
              </div>
            )}

            <p className='flex items-start gap-2 text-xs text-muted-foreground'>
              <Lock className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              Account numbers are stored masked after saving — we only ever
              display the last 4 digits.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeUp} custom={2}>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && (
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          )}
          Save Payout Details
        </Button>
      </motion.div>
    </motion.div>
  );
}
