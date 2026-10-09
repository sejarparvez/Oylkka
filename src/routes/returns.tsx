import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { usePublicSettings } from '@/services/public-settings';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/returns')({
  component: ReturnsPage,
});

function ReturnsPage() {
  const { user } = Route.useRouteContext();

  // FE-20 (CONTENT-09): the return-window claim must match the PDP trust block
  // and admin policy — read it from the public SiteSetting reader.
  const { data: publicSettings } = usePublicSettings();
  const returnWindowDays =
    publicSettings?.return_window_days ?? String(RETURN_WINDOW_DAYS);

  const sections = useMemo(
    () => [
      {
        title: 'Return Policy',
        content: `We want you to be completely satisfied with your purchase. If you are not happy with an item, you may return it within ${returnWindowDays} days of delivery for a refund or exchange, subject to the conditions below.`,
      },
      {
        title: 'Conditions for Returns',
        isList: true,
        items: [
          'Items must be unused and in their original condition',
          'Original packaging must be intact',
          'All tags, labels, and accessories must be included',
          'Proof of purchase (order number) is required',
          `Return request must be submitted within ${returnWindowDays} days of delivery`,
        ],
      },
      {
        title: 'Non-Returnable Items',
        isList: true,
        items: [
          'Personal care and hygiene products',
          'Digital/downloadable products',
          'Custom or made-to-order items',
          'Perishable goods and food items',
          'Gift cards and vouchers',
        ],
      },
      {
        title: 'Return Process',
        isList: true,
        items: [
          'Log in to your account and go to Orders',
          'Select the item you wish to return and click Request Return',
          'Choose a reason and provide any necessary details',
          'Wait for approval — we typically respond within 24 hours',
          'Once approved, ship the item back using the provided label',
        ],
      },
      {
        title: 'Refund Timeline',
        content:
          'Once we receive and inspect your return, refunds are processed within 5-7 business days. The refund will be issued to your original payment method. For cash on delivery orders, refunds are processed via bank transfer or bKash.',
      },
      {
        title: 'Exchanges',
        content:
          'If you need a different size, color, or variant, please initiate a return and place a new order. This ensures the fastest possible processing time for your exchange.',
      },
      {
        title: 'Return Shipping',
        content:
          'If the return is due to a defect, error, or damage from shipping, we will provide a prepaid return label at no cost to you. For all other returns, the buyer is responsible for return shipping costs.',
      },
    ],
    [returnWindowDays],
  );

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
              Return &{' '}
              <span className='italic font-bold text-primary'>Refund</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Our policies to ensure a hassle-free return experience.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <div className='max-w-3xl space-y-16'>
          {/* CUST-07: state the sign-in requirement before any effort. */}
          <motion.aside
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
            className='flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between'
          >
            <div className='flex items-start gap-3'>
              <LogIn className='mt-0.5 h-5 w-5 shrink-0 text-primary' />
              <div>
                <p className='text-sm font-semibold'>
                  {user
                    ? 'Returns are requested from your account'
                    : 'An account is required to request a return'}
                </p>
                <p className='text-sm text-muted-foreground mt-1'>
                  {user
                    ? 'Open your order from the Orders page and click Request Return.'
                    : `Returns are self-service and tied to your order history. Sign in (or create an account) first — it only takes a moment, and you'll find Request Return on any eligible order.`}
                </p>
              </div>
            </div>
            {user ? (
              <Button asChild size='sm' className='shrink-0'>
                <Link to='/dashboard/orders'>Go to Orders</Link>
              </Button>
            ) : (
              <div className='flex shrink-0 gap-2'>
                <Button asChild size='sm'>
                  <Link to='/auth/signin'>Sign In</Link>
                </Button>
                <Button asChild size='sm' variant='outline'>
                  <Link to='/auth/signup'>Create Account</Link>
                </Button>
              </div>
            )}
          </motion.aside>

          {sections.map((section, i) => (
            <motion.section
              key={section.title}
              initial='hidden'
              whileInView='show'
              viewport={{ once: true, margin: '-80px' }}
              variants={fadeUp}
              custom={0}
            >
              <div className='flex items-center gap-3 mb-4'>
                <div className='h-px w-8 bg-primary' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                  Section {i + 1}
                </span>
              </div>
              <h2 className='text-2xl md:text-3xl font-bold leading-tight tracking-tight mb-6'>
                {section.title}
                <span className='text-primary'>.</span>
              </h2>
              {section.isList && section.items ? (
                <ul className='space-y-3'>
                  {section.items.map((item) => {
                    const label = Array.isArray(item) ? item[0] : item;
                    return (
                      <li
                        key={label}
                        className='flex items-start gap-3 text-sm leading-relaxed text-muted-foreground'
                      >
                        <span className='w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5' />
                        {Array.isArray(item) ? (
                          <span>
                            <strong className='text-foreground'>
                              {item[0]}
                            </strong>{' '}
                            — {item[1]}
                          </span>
                        ) : (
                          <span>{item}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className='text-sm leading-relaxed text-muted-foreground'>
                  {section.content}
                </p>
              )}
            </motion.section>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
