import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/faq')({
  component: FaqPage,
});

const faqGroups = [
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

function FaqPage() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return faqGroups;
    const q = search.toLowerCase();
    return faqGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [search]);

  return (
    <div className='min-h-screen bg-background'>
      <Header />

      <div className='border-b border-border'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0}
          >
            <Button
              variant='ghost'
              size='sm'
              asChild
              className='mb-8 gap-2 text-primary'
            >
              <Link to='/'>
                <ArrowLeft className='w-3.5 h-3.5' /> Back to Home
              </Link>
            </Button>
          </motion.div>
          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.08}
          >
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Frequently Asked{' '}
              <span className='italic font-bold text-primary'>Questions</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Find answers to common questions about ordering, shipping,
              returns, and more.
            </p>
          </motion.div>

          <motion.div
            initial='hidden'
            animate='show'
            variants={fadeUp}
            custom={0.14}
            className='mt-8 max-w-md'
          >
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search FAQs…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-9 h-11 rounded-xl'
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <div className='max-w-3xl space-y-12'>
          {filtered.length === 0 ? (
            <motion.div
              initial='hidden'
              animate='show'
              variants={fadeUp}
              custom={0}
              className='text-center py-12'
            >
              <p className='text-sm font-semibold'>No results found</p>
              <p className='text-sm text-muted-foreground mt-1'>
                Try a different search term or browse the categories below.
              </p>
              <Button
                variant='ghost'
                size='sm'
                className='mt-4 text-primary'
                onClick={() => setSearch('')}
              >
                Clear search
              </Button>
            </motion.div>
          ) : (
            filtered.map((group) => (
              <motion.section
                key={group.label}
                initial='hidden'
                whileInView='show'
                viewport={{ once: true, margin: '-80px' }}
                variants={fadeUp}
                custom={0}
              >
                <div className='flex items-center gap-3 mb-4'>
                  <div className='h-px w-8 bg-primary' />
                  <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                    {group.label}
                  </span>
                </div>
                <Accordion type='single' collapsible className='w-full'>
                  {group.items.map((item) => (
                    <AccordionItem key={item.q} value={item.q}>
                      <AccordionTrigger className='text-sm font-medium text-left'>
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className='text-sm leading-relaxed text-muted-foreground'>
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </motion.section>
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
