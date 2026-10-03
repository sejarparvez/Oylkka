import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Copy,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopUpMutation, useWallet } from '@/services/wallet';

export const Route = createFileRoute('/dashboard/wallet')({
  component: WalletPage,
});

function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const topUpMutation = useTopUpMutation();
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('topup');
    if (!result) return;

    if (result === 'success') {
      toast.success('Wallet topped up successfully!');
    } else if (result === 'cancelled') {
      toast.error('Top-up cancelled');
    } else if (result === 'failed') {
      toast.error('Top-up payment failed');
    } else {
      toast.error('Top-up could not be completed');
    }

    params.delete('topup');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );
  }, []);

  const balance = wallet?.balance ?? 0;
  const transactions = wallet?.transactions ?? [];

  function handleCopyId() {
    if (wallet?.id) {
      navigator.clipboard.writeText(wallet.id);
      toast.success('Wallet ID copied');
    }
  }

  function handleTopUp() {
    const amount = Number.parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    topUpMutation.mutate(amount);
    setTopUpAmount('');
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>My Wallet</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Manage your balance and view transaction history
        </p>
      </div>

      {isLoading && (
        <div className='space-y-4'>
          <Skeleton className='h-36 rounded-2xl' />
          <Skeleton className='h-64 rounded-2xl' />
        </div>
      )}

      {!isLoading && (
        <>
          <Card className='rounded-2xl border-border shadow-none'>
            <CardHeader>
              <CardTitle className='text-lg flex items-center gap-2'>
                <WalletIcon className='h-5 w-5' />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div>
                <p className='text-4xl font-bold tabular-nums'>
                  ৳
                  {balance.toLocaleString('en-BD', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  Wallet ID: {wallet?.id.slice(0, 12)}...
                  <button
                    type='button'
                    onClick={handleCopyId}
                    className='inline-flex items-center gap-0.5 ml-1 text-primary hover:underline cursor-pointer'
                  >
                    <Copy className='w-3 h-3' />
                    Copy
                  </button>
                </p>
              </div>

              <div className='flex gap-2'>
                <Input
                  type='number'
                  min='1'
                  step='10'
                  placeholder='Amount (৳)'
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className='w-40'
                />
                <Button
                  onClick={handleTopUp}
                  disabled={topUpMutation.isPending || !topUpAmount}
                  className='gap-2'
                >
                  {topUpMutation.isPending ? (
                    'Processing...'
                  ) : (
                    <>
                      <ArrowUpRight className='w-4 h-4' />
                      Top Up
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-2xl border-border shadow-none'>
            <CardHeader>
              <CardTitle className='text-lg flex items-center gap-2'>
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-10 text-center'>
                  <p className='text-sm text-muted-foreground'>
                    No transactions yet
                  </p>
                </div>
              ) : (
                <div className='space-y-1'>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className='flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors'
                    >
                      <div className='flex items-center gap-3'>
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            tx.type === 'CREDIT'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-red-500/10 text-red-600'
                          }`}
                        >
                          {tx.type === 'CREDIT' ? (
                            <ArrowDown className='w-4 h-4' />
                          ) : (
                            <ArrowUp className='w-4 h-4' />
                          )}
                        </div>
                        <div>
                          <p className='text-sm font-medium'>
                            {tx.description || tx.reference || tx.type}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {format(
                              new Date(tx.createdAt),
                              'MMM d, yyyy h:mm a',
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          tx.type === 'CREDIT'
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'CREDIT' ? '+' : '-'}৳
                        {tx.amount.toLocaleString('en-BD', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
