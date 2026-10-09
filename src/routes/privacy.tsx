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

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
});

const sections = [
  {
    title: 'Information We Collect',
    content:
      'We collect information you provide directly: name, email address, phone number, shipping address, payment information. We also automatically collect usage data, device information, and cookies to improve our service.',
    isList: false,
  },
  {
    title: 'How We Use Your Information',
    isList: true,
    items: [
      'Process and fulfill your orders',
      'Communicate about your account and transactions',
      'Improve and personalize the Platform',
      'Send marketing communications (with your consent)',
      'Prevent fraud and ensure security',
    ],
  },
  {
    title: 'Information Sharing',
    content:
      'We share your information with vendors to fulfill orders. We may also share data with payment processors, shipping partners, and as required by law. We do not sell your personal information to third parties.',
    isList: false,
  },
  {
    title: 'Data Security',
    content:
      'We implement industry-standard security measures including SSL encryption, secure data storage, and regular security audits to protect your information.',
    isList: false,
  },
  {
    title: 'Your Rights',
    content:
      'You have the right to access, correct, or delete your personal data. You can manage your account settings or contact us to exercise these rights.',
    isList: false,
  },
  {
    title: 'Cookies',
    content:
      'We use cookies and similar tracking technologies to enhance your experience, analyze usage, and support our marketing efforts. You can control cookie preferences in your browser settings.',
    isList: false,
  },
  {
    title: 'Third-Party Services',
    content:
      'Our Platform may contain links to third-party services. We are not responsible for their privacy practices. We encourage you to review their privacy policies.',
    isList: false,
  },
  {
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy periodically. We will notify you of material changes through the Platform or via email.',
    isList: false,
  },
  {
    title: 'Contact Us',
    content:
      'If you have questions about this Privacy Policy, please contact our support team.',
    isList: false,
  },
];

function PrivacyPage() {
  // CONTENT-11: admins can override this page via a published ContentBlock;
  // a missing block (404) falls back to the built-in copy below.
  const { data: cmsBlockData } = useContentBlock('privacy');
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
              Privacy{' '}
              <span className='italic font-bold text-primary'>Policy</span>
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
                    {section.items.map((item) => (
                      <li
                        key={item}
                        className='flex items-start gap-3 text-sm leading-relaxed text-muted-foreground'
                      >
                        <span className='w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5' />
                        {item}
                      </li>
                    ))}
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
