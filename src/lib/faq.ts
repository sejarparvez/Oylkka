import { RETURN_WINDOW_DAYS } from '@/lib/constants';

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  label: string;
  items: FaqItem[];
}

export const faqGroups: FaqGroup[] = [
  {
    label: 'Orders',
    items: [
      {
        q: 'How do I place an order?',
        a: 'Browse products, add items to your cart, and proceed to checkout. You can pay via bKash, credit card, or cash on delivery.',
      },
      {
        q: 'Can I cancel my order?',
        a: 'Yes, you can cancel an order before it is processed. Visit your Orders page and click Cancel if the option is available.',
      },
      {
        q: 'How do I track my order?',
        a: 'Once your order ships, you will receive a tracking number via email. You can also track it from your Orders dashboard.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept bKash, credit/debit cards, and cash on delivery for select areas.',
      },
    ],
  },
  {
    label: 'Shipping',
    items: [
      {
        q: 'How long does delivery take?',
        a: 'Delivery typically takes 3-7 business days within major cities and 5-10 business days for remote areas.',
      },
      {
        q: 'Do you offer free shipping?',
        a: 'Free shipping is available on orders over ৳2,000. Some vendors may also offer free shipping on their products.',
      },
      {
        q: 'Can I change my shipping address?',
        a: 'You can update your shipping address before the order is processed. Contact support for assistance.',
      },
      {
        q: 'Do you ship internationally?',
        a: 'Currently, we only ship within Bangladesh. International shipping is not yet available.',
      },
    ],
  },
  {
    label: 'Returns & Refunds',
    items: [
      {
        q: 'What is your return policy?',
        a: `We accept returns within ${RETURN_WINDOW_DAYS} days of delivery for defective or incorrect items. Products must be unused and in original packaging.`,
      },
      {
        q: 'How do I request a return?',
        a: 'Go to your Orders page, select the order, and click Request Return. Fill in the reason and submit.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 5-7 business days after we receive and inspect the returned item.',
      },
      {
        q: 'Who pays for return shipping?',
        a: 'If the item is defective or incorrect, we cover the return shipping. Otherwise, the buyer is responsible.',
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        q: 'How do I create an account?',
        a: 'Click Sign In and select Create Account. You can register with your email or use Google/Facebook login.',
      },
      {
        q: 'I forgot my password. What should I do?',
        a: 'Click Forgot Password on the sign-in page and follow the instructions to reset it.',
      },
      {
        q: 'How do I become a vendor?',
        a: 'Go to your Dashboard and click Become a Vendor. Fill in your shop details and submit for review.',
      },
      {
        q: 'Is my personal information secure?',
        a: 'Yes, we use SSL encryption and follow industry best practices to protect your data.',
      },
    ],
  },
  {
    label: 'Payments',
    items: [
      {
        q: 'Is bKash payment secure?',
        a: 'Yes, bKash payments are processed through their secure gateway. We do not store your bKash credentials.',
      },
      {
        q: 'When will my card be charged?',
        a: 'Your card is charged immediately when you place the order. If the order is cancelled, the refund is processed within 5-7 business days.',
      },
      {
        q: 'Do you offer installment payments?',
        a: 'Installment options are not currently available but we are working on adding this feature.',
      },
    ],
  },
];
