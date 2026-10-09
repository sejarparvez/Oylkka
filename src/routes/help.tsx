import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  LifeBuoy,
  PackageSearch,
  RefreshCw,
  Search,
  Store,
  Truck,
} from 'lucide-react';
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
import { faqGroups } from '@/lib/faq';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE, delay },
  }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const helpTopics = [
  {
    title: 'Track an Order',
    description: 'Follow your delivery from dispatch to doorstep.',
    icon: PackageSearch,
    to: '/tracking',
  },
  {
    title: 'Shipping Info',
    description: 'Delivery zones, rates and timelines.',
    icon: Truck,
    to: '/shipping',
  },
  {
    title: 'Returns & Refunds',
    description: 'Start a return or check our policy.',
    icon: RefreshCw,
    to: '/returns',
  },
  {
    title: 'Full FAQ',
    description: 'Answers to the questions we hear most.',
    icon: HelpCircle,
    to: '/faq',
  },
  {
    title: 'Contact Support',
    description: 'Send us a message and we will help.',
    icon: LifeBuoy,
    to: '/contact',
  },
  {
    title: 'Become a Vendor',
    description: 'Open your shop and start selling.',
    icon: Store,
    to: '/dashboard/become-vendor/apply',
  },
];

export const Route = createFileRoute('/help')({
  component: HelpPage,
});

function HelpPage() {
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
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Support
              </span>
            </div>
            <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight'>
              Help <span className='italic font-bold text-primary'>Center</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Answers, guides and the fastest way to reach a human when you need
              one.
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
                placeholder='Search help articles…'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className='pl-9 h-11 rounded-xl'
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <motion.div
          initial='hidden'
          animate='show'
          variants={stagger}
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        >
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <motion.div key={topic.title} variants={fadeUp} custom={0}>
                <Link
                  to={topic.to}
                  className='group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]'
                >
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
                    <Icon className='h-5 w-5 text-primary' />
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <h2 className='text-sm font-semibold'>{topic.title}</h2>
                      <ArrowRight className='h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary' />
                    </div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {topic.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <div className='mt-16 max-w-3xl'>
          <div className='flex items-center gap-3 mb-6'>
            <div className='h-px w-8 bg-primary' />
            <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
              Frequently Asked Questions
            </span>
          </div>

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
                Try a different search term, or{' '}
                <Link to='/contact' className='text-primary underline'>
                  contact support
                </Link>
                .
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
            <div className='space-y-12'>
              {filtered.map((group) => (
                <section key={group.label}>
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
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
