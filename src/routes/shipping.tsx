import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { useContentBlock } from '@/services/admin-content';
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

export const Route = createFileRoute('/shipping')({
  component: ShippingPage,
});

function ShippingPage() {
  const { data: publicSettings } = usePublicSettings();
  // CONTENT-11: admins can override this page via a published ContentBlock;
  // a missing block (404) falls back to the built-in copy below.
  const { data: cmsBlockData } = useContentBlock('shipping');
  const cmsBlock = cmsBlockData?.block;

  // FE-20 (CONTENT-08): the rates and windows below must match the PDP trust
  // block and the footer — derive them from the public SiteSetting reader.
  const standardDeliveryFee = publicSettings?.standard_delivery_fee ?? '60';
  const expressDeliveryFee = publicSettings?.express_delivery_fee ?? '150';
  const freeShippingThreshold =
    publicSettings?.free_shipping_threshold ?? '500';
  const processingDays = publicSettings?.processing_days ?? '1-2';
  const standardDeliveryDays = publicSettings?.standard_delivery_days ?? '5-7';
  const expressDeliveryDays = publicSettings?.express_delivery_days ?? '2-3';

  const sections = useMemo(
    () => [
      {
        title: 'Shipping Zones',
        content: `We deliver across all 64 districts of Bangladesh. Most orders arrive within ${standardDeliveryDays} business days; express delivery is available in select areas within ${expressDeliveryDays} business days.`,
      },
      {
        title: 'Shipping Rates',
        isList: true,
        items: [
          [
            'Standard Delivery',
            `৳${standardDeliveryFee} — ${standardDeliveryDays} business days`,
          ],
          [
            'Express Delivery',
            `৳${expressDeliveryFee} — ${expressDeliveryDays} business days`,
          ],
          ['Free Shipping', `On orders over ৳${freeShippingThreshold}`],
        ],
      },
      {
        title: 'Processing Time',
        content: `Orders are processed within ${processingDays} business days (excluding weekends and holidays). During peak seasons, processing may take longer. You will receive a confirmation email once your order ships.`,
      },
      {
        title: 'Order Tracking',
        content:
          'Every shipment includes a tracking number sent to your registered email. You can also track your order in real-time from your Account Dashboard under Orders.',
      },
      {
        title: 'Shipping Restrictions',
        isList: true,
        items: [
          'Certain oversized items may have additional shipping charges',
          'Fragile items are shipped with extra packaging — signature may be required',
          'Some remote areas may experience extended delivery times',
          'Cash on Delivery is available in select zones only',
        ],
      },
      {
        title: 'Lost or Damaged Shipments',
        content:
          'If your package arrives damaged or is lost in transit, please contact our support team within 48 hours of the expected delivery date. We will initiate an investigation and provide a resolution within 5-7 business days.',
      },
      {
        title: 'International Shipping',
        content:
          'We currently do not offer international shipping. We are working on expanding our services globally and will announce updates when available.',
      },
    ],
    [
      standardDeliveryFee,
      expressDeliveryFee,
      freeShippingThreshold,
      processingDays,
      standardDeliveryDays,
      expressDeliveryDays,
    ],
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
              Shipping{' '}
              <span className='italic font-bold text-primary'>Policy</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Everything you need to know about delivery, rates, and tracking.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <div className='max-w-3xl space-y-16'>
          {cmsBlock ? (
            <div className='prose prose-sm prose-gray dark:prose-invert max-w-none'>
              <RichText content={cmsBlock.content} />
            </div>
          ) : (
            sections.map((section, i) => (
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
            ))
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
