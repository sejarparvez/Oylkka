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

export const Route = createFileRoute('/faq')({
  component: FaqPage,
});

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
