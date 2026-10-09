import { Banknote, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export type PaymentMethodOption = 'BKASH' | 'CASH_ON_DELIVERY' | 'WALLET';

type PaymentOption = {
  value: PaymentMethodOption;
  label: string;
  description: string;
  icon: typeof Smartphone;
  available: boolean;
};

// CONTENT-15: only methods the platform can actually process are offered.
// Nagad and Rocket were listed as "coming soon" placeholders and are removed.
const paymentOptions: PaymentOption[] = [
  {
    value: 'BKASH',
    label: 'bKash',
    description: 'Pay via bKash mobile wallet',
    icon: Smartphone,
    available: true,
  },
  {
    value: 'CASH_ON_DELIVERY',
    label: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: Banknote,
    available: true,
  },
  {
    value: 'WALLET',
    label: 'Wallet',
    description: 'Pay using your Oylkka wallet balance',
    icon: Wallet,
    available: true,
  },
];

type PaymentSelectorProps = {
  selected: PaymentMethodOption;
  onSelect: (value: PaymentMethodOption) => void;
  walletBalance?: number;
  /** Estimated order total — wallet is disabled when the balance is short. */
  orderTotal?: number;
};

export function PaymentSelector({
  selected,
  onSelect,
  walletBalance,
  orderTotal,
}: PaymentSelectorProps) {
  function isAvailable(option: PaymentOption) {
    if (!option.available) return false;
    if (option.value === 'WALLET') {
      return (
        walletBalance === undefined ||
        orderTotal === undefined ||
        walletBalance >= orderTotal
      );
    }
    return true;
  }

  function handleSelect(option: PaymentOption) {
    if (!isAvailable(option)) {
      toast.error('Insufficient wallet balance', {
        description: 'Top up your wallet or choose another payment method.',
      });
      return;
    }
    onSelect(option.value);
  }

  return (
    <div className='grid grid-cols-2 gap-3'>
      {paymentOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = selected === option.value;
        const available = isAvailable(option);
        const walletShort =
          option.value === 'WALLET' &&
          walletBalance !== undefined &&
          !available;

        return (
          <button
            key={option.value}
            type='button'
            onClick={() => handleSelect(option)}
            disabled={!available}
            className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : available
                  ? 'border-border hover:border-primary/50 hover:bg-muted/50'
                  : 'border-border cursor-not-allowed opacity-50'
            }`}
          >
            <Icon className='h-6 w-6' />
            <div>
              <p className='text-sm font-medium'>{option.label}</p>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {available ? option.description : 'Insufficient balance'}
              </p>
              {option.value === 'WALLET' && walletBalance !== undefined && (
                <p
                  className={`text-xs font-medium mt-1 ${walletShort ? 'text-destructive' : 'text-primary'}`}
                >
                  Balance: ৳
                  {walletBalance.toLocaleString('en-BD', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
            {isSelected && (
              <span className='absolute right-2 top-2 h-3 w-3 rounded-full bg-primary' />
            )}
          </button>
        );
      })}
    </div>
  );
}
