import { Link } from '@tanstack/react-router';
import axios from 'axios';
import {
  BadgeCheck,
  ChevronRight,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { motion, useInView } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { RETURN_WINDOW_DAYS } from '@/lib/constants';
import { useSubscribeMutation } from '@/services/newsletter';
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

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

// FE-20: the return-window claim is built from the public SiteSetting reader
// in `Footer()` instead of a module-level constant, so it stays in sync with
// the policy pages and the PDP trust block.
// CONTENT-09: claims here must be provable. "100% vetted sellers" was not —
// shops go through an approval step before listing, so that is what we say.
const trustBadgesBase = [
  { icon: ShieldCheck, label: 'Secure Payment', sub: 'SSL encrypted checkout' },
  {
    icon: BadgeCheck,
    label: 'Approved Sellers',
    sub: 'Reviewed before listing',
  },
  { icon: Truck, label: 'Fast Delivery', sub: 'Nationwide coverage' },
] as const;

const shopLinks = [
  { label: 'All Products', to: '/products' },
  { label: 'Categories', to: '/categories' },
  { label: 'Special Offers', to: '/deals' },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Bestsellers', to: '/bestsellers' },
  { label: 'FAQs', to: '/faq' },
];

const companyLinks = [
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms & Conditions', to: '/terms' },
];

const supportLinks = [
  { label: 'Help Center', to: '/help' },
  { label: 'Shipping Info', to: '/shipping' },
  { label: 'Returns & Exchanges', to: '/returns' },
  { label: 'Order Tracking', to: '/tracking' },
];

const NavLinks = ({ links }: { links: { label: string; to: string }[] }) => (
  <ul className='space-y-2.5'>
    {links.map((link) => (
      <li key={link.label}>
        <Link
          to={link.to}
          className='relative flex group text-sm text-muted-foreground transition-colors duration-200 hover:text-primary'
        >
          <ChevronRight className='mr-2 h-4 w-0 opacity-0 transition-all group-hover:w-4 group-hover:opacity-100' />{' '}
          <span className='relative'>
            {link.label}
            <span className='absolute bottom-0 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full' />
          </span>
        </Link>
      </li>
    ))}
  </ul>
);

const EyebrowHeader = ({
  label,
  ruleWidth = 'w-4',
}: {
  label: string;
  ruleWidth?: string;
}) => (
  <div className='mb-4 flex items-center gap-2'>
    <div className={`h-px ${ruleWidth} bg-primary`} />
    <span className='text-[10px] font-semibold tracking-[0.18em] uppercase text-primary'>
      {label}
    </span>
  </div>
);

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const subscribe = useSubscribeMutation();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    subscribe.mutate(
      { email: trimmed },
      {
        onSuccess: () => {
          toast.success('Subscribed! Watch your inbox for the best deals.');
          setEmail('');
        },
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? (error.response?.data?.error ?? error.message)
            : 'Failed to subscribe';
          toast.error(message);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className='flex gap-2 md:gap-3 flex-row'>
      <div className='group relative flex-1'>
        <Input
          type='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder='your@email.com'
          aria-label='Email address'
          className='h-11 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/50'
        />
      </div>
      <Button
        type='submit'
        disabled={subscribe.isPending}
        className='h-11 gap-2 whitespace-nowrap px-6 transition-transform duration-200 hover:scale-[1.02]'
      >
        <Send className='h-4 w-4' />
        <span className='hidden md:block'>
          {subscribe.isPending ? 'Subscribing…' : 'Subscribe'}
        </span>
      </Button>
    </form>
  );
}

function NewsletterSection({ inView }: { inView: boolean }) {
  return (
    <div className='relative border-b border-border'>
      <div className='container py-10'>
        <motion.div
          initial='hidden'
          animate={inView ? 'show' : 'hidden'}
          variants={stagger}
          className='grid items-center gap-8 md:grid-cols-2'
        >
          <motion.div className='space-y-3' variants={fadeUp} custom={0}>
            <div className='flex items-center gap-3'>
              <div className='h-px w-8 bg-primary' />
              <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                Newsletter
              </span>
            </div>
            <h3 className='text-2xl font-bold leading-tight tracking-tight md:text-3xl'>
              Get the best{' '}
              <span className='italic font-bold text-primary'>deals</span>
              <span className='text-primary'>.</span>
            </h3>
            <p className='max-w-sm text-sm leading-relaxed text-muted-foreground'>
              New arrivals, seasonal offers, and product updates — straight to
              your inbox.
            </p>
          </motion.div>
          <motion.div variants={fadeUp} custom={0.08}>
            <NewsletterForm />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function TrustBadgeStrip({
  inView,
  trustBadges,
}: {
  inView: boolean;
  trustBadges: Array<{
    icon: React.ElementType;
    label: string;
    sub: string;
  }>;
}) {
  return (
    <div className='border-b border-border'>
      <div className='container'>
        <motion.div
          initial='hidden'
          animate={inView ? 'show' : 'hidden'}
          variants={stagger}
          className='grid grid-cols-2 divide-x divide-y divide-border md:grid-cols-4 md:divide-y-0'
        >
          {trustBadges.map(({ icon: Icon, label, sub }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              custom={0}
              className='flex items-center gap-3 px-5 py-5'
            >
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10'>
                <Icon className='h-4.5 w-4.5 text-primary' />
              </div>
              <div>
                <p className='text-sm font-semibold'>{label}</p>
                <p className='mt-0.5 text-xs text-muted-foreground'>{sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <motion.a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={label}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      className='flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
    >
      {children}
    </motion.a>
  );
}

type SocialLink = {
  href: string | undefined;
  label: string;
  icon: React.ReactNode;
};

export default function Footer() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  // FE-20: single source of truth for the return-window claim.
  const { data: publicSettings } = usePublicSettings();
  const returnWindowDays =
    publicSettings?.return_window_days ?? String(RETURN_WINDOW_DAYS);
  const trustBadges = useMemo(
    () => [
      ...trustBadgesBase,
      {
        icon: RefreshCw,
        label: 'Easy Returns',
        sub: `${returnWindowDays}-day return policy`,
      },
    ],
    [returnWindowDays],
  );

  const platformName = publicSettings?.platform_name ?? 'Oylkka';
  const socials = useMemo(
    () =>
      (
        [
          {
            href: publicSettings?.social_facebook,
            label: 'Facebook',
            icon: (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'
              >
                <path d='M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' />
              </svg>
            ),
          },
          {
            href: publicSettings?.social_instagram,
            label: 'Instagram',
            icon: (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'
              >
                <rect width='20' height='20' x='2' y='2' rx='5' ry='5' />
                <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
                <line x1='17.5' x2='17.51' y1='6.5' y2='6.5' />
              </svg>
            ),
          },
          {
            href: publicSettings?.social_twitter,
            label: 'Twitter (X)',
            icon: (
              <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                aria-hidden='true'
              >
                <path d='M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z' />
              </svg>
            ),
          },
        ] as SocialLink[]
      ).filter((social): social is SocialLink & { href: string } =>
        Boolean(social.href),
      ),
    [publicSettings],
  );

  return (
    <footer className='relative overflow-hidden bg-background text-foreground'>
      <div ref={sectionRef} className='relative'>
        <NewsletterSection inView={inView} />
        <TrustBadgeStrip inView={inView} trustBadges={trustBadges} />
      </div>

      <div className='relative container py-16'>
        <motion.div
          initial='hidden'
          animate={inView ? 'show' : 'hidden'}
          variants={stagger}
          className='grid grid-cols-2 gap-8 md:gap-12 lg:grid-cols-5'
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className='col-span-2 lg:col-span-2'
          >
            <Link to='/' className='mb-6 flex items-center gap-2.5'>
              <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-primary'>
                <ShoppingBag className='h-4 w-4 text-primary-foreground' />
              </div>
              <span className='text-lg font-bold tracking-tight'>
                {platformName}
              </span>
            </Link>
            <p className='mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground'>
              Discover quality products at unbeatable prices. We&apos;re
              committed to providing exceptional shopping experiences with fast
              shipping, secure checkout, and premium customer support.
            </p>

            {socials.length > 0 && (
              <div>
                <p className='mb-3 text-sm font-medium'>Follow Us</p>
                <div className='flex items-center gap-3'>
                  {socials.map((social) => (
                    <SocialIcon
                      key={social.label}
                      href={social.href}
                      label={social.label}
                    >
                      {social.icon}
                    </SocialIcon>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={0.06}>
            <EyebrowHeader label='Shop' />
            <NavLinks links={shopLinks} />
          </motion.div>

          <motion.div variants={fadeUp} custom={0.1}>
            <EyebrowHeader label='Company' />
            <NavLinks links={companyLinks} />
          </motion.div>
          <motion.div variants={fadeUp} custom={0.14}>
            <EyebrowHeader label='Support' />
            <NavLinks links={supportLinks} />
          </motion.div>
        </motion.div>
      </div>

      <div className='relative border-t border-border'>
        <div className='container py-6'>
          <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.3 }}
              className='flex items-center gap-2 text-xs text-muted-foreground'
            >
              &copy; {new Date().getFullYear()} {platformName}. All rights
              reserved.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE, delay: 0.36 }}
              className='flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground'
            >
              <span className='h-1 w-1 rounded-full bg-primary/50' />
              <span>Secure Checkout</span>
              <span className='ml-1 h-1 w-1 rounded-full bg-primary/50' />
              <span>Approved Sellers</span>
              <span className='ml-1 h-1 w-1 rounded-full bg-primary/50' />
              <span>{returnWindowDays}-Day Returns</span>
              <span className='ml-1 h-1 w-1 rounded-full bg-primary/50' />
              <span>Nationwide Delivery</span>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
}
