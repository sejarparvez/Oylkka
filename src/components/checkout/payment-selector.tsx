import { Banknote, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export type PaymentMethodOption =
  | 'BKASH'
  | 'CASH_ON_DELIVERY'
  | 'NAGAD'
  | 'ROCKET'
  | 'WALLET';

type PaymentOption = {
  value: PaymentMethodOption;
  label: string;
  description: string;
  icon: typeof Smartphone;
  available: boolean;
  comingSoon?: boolean;
};

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
    value: 'NAGAD',
    label: 'Nagad',
    description: 'Pay via Nagad mobile wallet',
    icon: Smartphone,
    available: false,
    comingSoon: true,
  },
  {
    value: 'ROCKET',
    label: 'Rocket',
    description: 'Pay via Rocket mobile wallet',
    icon: CreditCard,
    available: false,
    comingSoon: true,
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
      if (option.value === 'WALLET') {
        toast.error('Insufficient wallet balance', {
          description: 'Top up your wallet or choose another payment method.',
        });
      } else {
        toast.error(`${option.label} is not available yet`, {
          description: 'Please check back later.',
        });
      }
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
                {!available
                  ? option.comingSoon
                    ? 'Coming soon'
                    : 'Insufficient balance'
                  : option.description}
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
            {option.comingSoon && (
              <span className='absolute right-2 top-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground'>
                Soon
              </span>
            )}
            {isSelected && (
              <span className='absolute right-2 top-2 h-3 w-3 rounded-full bg-primary' />
            )}
          </button>
        );
      })}
    </div>
  );
}
