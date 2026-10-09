import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { RichText } from '@/components/rich-text';
import { Button } from '@/components/ui/button';
import { useContentBlock } from '@/services/admin-content';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

export const Route = createFileRoute('/terms')({
  component: TermsPage,
});

const sections = [
  {
    title: 'Acceptance of Terms',
    content:
      'By accessing or using Oylkka ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.',
    isList: false,
  },
  {
    title: 'Definitions',
    isList: true,
    items: [
      ['Buyer', 'A user who purchases products on the Platform.'],
      ['Seller/Vendor', 'A user who lists and sells products on the Platform.'],
      ['Platform', 'The Oylkka marketplace website and related services.'],
    ],
  },
  {
    title: 'User Accounts',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate, current, and complete information during registration.',
    isList: false,
  },
  {
    title: 'Vendor Terms',
    content:
      'Vendors agree to list accurate product descriptions, maintain stock levels, fulfill orders promptly, and comply with all applicable laws. Oylkka reserves the right to remove listings or suspend accounts that violate these terms.',
    isList: false,
  },
  {
    title: 'Payments & Fees',
    content:
      'All payments are processed through our integrated payment gateways. Transaction fees and commission structures are disclosed separately to vendors. Buyers pay the listed price plus applicable shipping charges.',
    isList: false,
  },
  {
    title: 'Shipping & Returns',
    content:
      'Shipping timelines and return policies are set by individual vendors unless otherwise stated. Oylkka facilitates communication between buyers and sellers for return requests but is not directly responsible for fulfillment.',
    isList: false,
  },
  {
    title: 'Prohibited Activities',
    isList: true,
    items: [
      'Listing counterfeit or unauthorized products',
      'Engaging in fraudulent transactions',
      'Manipulating prices, reviews, or ratings',
      'Violating any applicable laws or regulations',
    ],
  },
  {
    title: 'Limitation of Liability',
    content:
      'Oylkka acts as a marketplace intermediary and is not liable for disputes between buyers and sellers. Our liability is limited to the maximum extent permitted by law.',
    isList: false,
  },
  {
    title: 'Changes to Terms',
    content:
      'We may update these terms from time to time. Continued use of the Platform after changes constitutes acceptance of the new terms.',
    isList: false,
  },
  {
    title: 'Contact',
    content:
      'For questions about these terms, please contact our support team.',
    isList: false,
  },
];

function TermsPage() {
  // CONTENT-11: admins can override this page via a published ContentBlock;
  // a missing block (404) falls back to the built-in copy below.
  const { data: cmsBlockData } = useContentBlock('terms');
  const cmsBlock = cmsBlockData?.block;

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
                <ArrowLeft className='w-3.5 h-3.5' />
                Back to Home
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
              Terms of{' '}
              <span className='italic font-bold text-primary'>Service</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3'>
              Last updated: May 22, 2026
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
