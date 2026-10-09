import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowLeft,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
  Send,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { toast } from 'sonner';
import Footer from '@/components/layout/footer';
import Header from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useContactMutation } from '@/services/contact';
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

export const Route = createFileRoute('/contact')({
  component: ContactPage,
});

function ContactPage() {
  // CONTENT-03: identity comes from SiteSetting, not hardcoded literals.
  // Rows with no configured value are omitted rather than shown as placeholders.
  const { data: settings } = usePublicSettings();
  const contactInfo = [
    { icon: MapPin, label: 'Address', value: settings?.support_address },
    { icon: PhoneCall, label: 'Phone', value: settings?.support_phone },
    { icon: Mail, label: 'Email', value: settings?.support_email },
    { icon: Clock, label: 'Hours', value: settings?.support_hours },
  ].filter((info) => Boolean(info.value));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const contact = useContactMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await contact.mutateAsync({
        name,
        email,
        subject: subject || undefined,
        message,
      });
      toast.success('Message sent! We will get back to you soon.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error) {
      const apiError = error as { response?: { data?: { error?: string } } };
      toast.error(
        apiError.response?.data?.error ??
          'Failed to send message. Please try again later.',
      );
    }
  };

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
              Contact <span className='italic font-bold text-primary'>Us</span>
              <span className='text-primary'>.</span>
            </h1>
            <p className='text-sm text-muted-foreground mt-3 max-w-2xl'>
              Have a question, feedback, or need help? We are here for you.
            </p>
          </motion.div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24'>
        <div className='grid md:grid-cols-5 gap-12'>
          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className='md:col-span-2 space-y-6'
          >
            {contactInfo.map((info) => (
              <motion.div
                key={info.label}
                variants={fadeUp}
                custom={0}
                className='flex items-start gap-4'
              >
                <div className='w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0'>
                  <info.icon className='w-5 h-5 text-primary' />
                </div>
                <div>
                  <p className='text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground'>
                    {info.label}
                  </p>
                  <p className='text-sm font-medium mt-0.5'>{info.value}</p>
                </div>
              </motion.div>
            ))}

            <motion.div variants={fadeUp} custom={0} className='pt-4'>
              <div className='flex items-center gap-3 mb-3'>
                <div className='h-px w-8 bg-primary' />
                <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
                  Follow Us
                </span>
              </div>
              <p className='text-sm text-muted-foreground'>
                Stay connected on social media for the latest deals and updates.
              </p>
            </motion.div>
          </motion.div>

          <motion.div
            initial='hidden'
            whileInView='show'
            viewport={{ once: true, margin: '-80px' }}
            variants={fadeUp}
            custom={0}
            className='md:col-span-3'
          >
            <div className='rounded-2xl border border-border bg-card p-6 md:p-8'>
              <div className='flex items-center gap-3 mb-6'>
                <MessageSquare className='w-5 h-5 text-primary' />
                <h2 className='text-lg font-bold'>Send us a message</h2>
              </div>

              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='grid sm:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <label
                      htmlFor='name'
                      className='text-xs font-medium text-muted-foreground'
                    >
                      Name <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      id='name'
                      placeholder='Your name'
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <label
                      htmlFor='email'
                      className='text-xs font-medium text-muted-foreground'
                    >
                      Email <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      id='email'
                      type='email'
                      placeholder='your@email.com'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <label
                    htmlFor='subject'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    Subject
                  </label>
                  <Input
                    id='subject'
                    placeholder='How can we help?'
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className='space-y-2'>
                  <label
                    htmlFor='message'
                    className='text-xs font-medium text-muted-foreground'
                  >
                    Message <span className='text-destructive'>*</span>
                  </label>
                  <Textarea
                    id='message'
                    placeholder='Tell us more about your inquiry…'
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type='submit'
                  className='gap-2'
                  disabled={contact.isPending}
                >
                  <Send className='w-4 h-4' />
                  {contact.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
