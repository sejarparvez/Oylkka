import { Link } from '@tanstack/react-router';
import {
  BadgeCheck,
  ChevronDown,
  Heart,
  House,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Mail,
  Menu,
  Package,
  Percent,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tags,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Route as RootRoute } from '@/routes/__root';
import { usePublicCategories } from '@/services/category';
import SearchBar from './searchbar';
import { SignOut } from './signout';
import { ModeToggle } from './theme-switcher';

function NavLink({
  to,
  icon: Icon,
  children,
  badge,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      params={{} as never}
      search={{} as never}
      onClick={onClick}
      className='group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:translate-x-0.5 hover:bg-primary/5 hover:text-primary'
    >
      <Icon className='h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary' />
      <span className='flex-1'>{children}</span>
      {badge}
    </Link>
  );
}

function SubLink({
  to,
  children,
  onClick,
  params,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
  params?: Record<string, string>;
}) {
  return (
    <Link
      to={to}
      params={params as never}
      onClick={onClick}
      className='block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:text-primary'
    >
      {children}
    </Link>
  );
}

function CollapsibleSection({
  label,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className='border-b border-border/50 last:border-b-0'>
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-primary/5 hover:text-primary'
      >
        <Icon className='h-4 w-4 shrink-0 text-muted-foreground' />
        <span className='flex-1 text-left'>{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className='overflow-hidden'
          >
            <div className='ml-4 space-y-0.5 border-l-2 border-primary/20 pb-2 pl-4'>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionEyebrow({ label }: { label: string }) {
  return (
    <div className='flex items-center gap-3 px-3 pb-2 pt-5'>
      <div className='h-px w-8 bg-primary' />
      <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
        {label}
      </span>
    </div>
  );
}

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = RootRoute.useRouteContext();
  const { data: categories } = usePublicCategories();
  const closeSheet = () => setIsOpen(false);

  return (
    <div className='flex items-center'>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='m-0 w-fit pr-2 md:hidden'
            aria-label='Open menu'
          >
            <Menu className='h-5 w-5' />
          </Button>
        </SheetTrigger>
        <SheetContent
          side='left'
          showCloseButton={false}
          className='flex w-75 flex-col border-r bg-background p-0 sm:w-100'
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {/* Header */}
          <SheetHeader className='flex flex-row items-center justify-between border-b px-4 py-4'>
            <SheetTitle className='flex items-center gap-2.5'>
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary'>
                <ShoppingBag className='h-4 w-4 text-primary-foreground' />
              </div>
              <span className='text-lg font-bold tracking-tight'>Oylkka</span>
            </SheetTitle>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={closeSheet}
              aria-label='Close menu'
            >
              <X className='h-4 w-4' />
            </Button>
          </SheetHeader>

          {/* Search */}
          <div className='px-3 pt-3'>
            <SearchBar className='h-9 w-full' onSearchSubmit={closeSheet} />
          </div>

          {/* Navigation */}
          <ScrollArea className='flex-1 px-3 pb-4'>
            {/* Main Links */}
            <div className='space-y-0.5'>
              <NavLink to='/' icon={House} onClick={closeSheet}>
                Home
              </NavLink>
              <NavLink to='/new-arrivals' icon={Sparkles} onClick={closeSheet}>
                New Arrivals
              </NavLink>
              <NavLink to='/deals' icon={Percent} onClick={closeSheet}>
                Sale
              </NavLink>
            </div>

            {/* Shop */}
            <SectionEyebrow label='Shop' />
            <div className='space-y-0.5'>
              <CollapsibleSection label='Categories' icon={Tags} defaultOpen>
                <SubLink to='/products' onClick={closeSheet}>
                  All Products
                </SubLink>
                {(categories ?? []).map((category) => (
                  <SubLink
                    key={category.slug}
                    to='/products/category/$slug'
                    params={{ slug: category.slug }}
                    onClick={closeSheet}
                  >
                    {category.name}
                  </SubLink>
                ))}
              </CollapsibleSection>
            </div>

            {/* Support */}
            <SectionEyebrow label='Support' />
            <div className='space-y-0.5'>
              <NavLink to='/faq' icon={LifeBuoy} onClick={closeSheet}>
                FAQ
              </NavLink>
              <NavLink to='/shipping' icon={Truck} onClick={closeSheet}>
                Shipping
              </NavLink>
              <NavLink to='/returns' icon={BadgeCheck} onClick={closeSheet}>
                Returns
              </NavLink>
              <NavLink to='/contact' icon={Mail} onClick={closeSheet}>
                Contact Us
              </NavLink>
            </div>

            {/* Account */}
            <SectionEyebrow label='Account' />
            <div className='space-y-0.5'>
              {user ? (
                <>
                  <NavLink
                    to='/dashboard'
                    icon={LayoutDashboard}
                    onClick={closeSheet}
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to='/dashboard/orders'
                    icon={Package}
                    onClick={closeSheet}
                  >
                    My Orders
                  </NavLink>
                  <NavLink
                    to='/dashboard/wishlist'
                    icon={Heart}
                    onClick={closeSheet}
                  >
                    Wishlist
                  </NavLink>
                  <NavLink
                    to='/dashboard/my-account'
                    icon={Settings}
                    onClick={closeSheet}
                  >
                    Settings
                  </NavLink>
                  <SignOut className='px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/5 hover:text-primary' />
                </>
              ) : (
                <>
                  <NavLink to='/auth/signin' icon={LogIn} onClick={closeSheet}>
                    Sign In
                  </NavLink>
                  <NavLink
                    to='/auth/signup'
                    icon={UserPlus}
                    onClick={closeSheet}
                  >
                    Create Account
                  </NavLink>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Bottom Bar */}
          <div className='border-t border-border px-4 py-3'>
            <div className='flex items-center justify-between'>
              <ModeToggle />
              <div className='flex items-center gap-1.5 text-[10px] text-muted-foreground'>
                <ShieldCheck className='h-3 w-3' />
                <span>Secure</span>
                <span className='h-1 w-1 rounded-full bg-primary/50' />
                <BadgeCheck className='h-3 w-3' />
                <span>Verified</span>
                <span className='h-1 w-1 rounded-full bg-primary/50' />
                <Truck className='h-3 w-3' />
                <span>Fast</span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logo */}
      <Link to='/' className='flex items-center gap-2.5'>
        <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-primary'>
          <ShoppingBag className='h-4 w-4 text-primary-foreground' />
        </div>
        <h1 className='text-lg font-bold tracking-tight'>Oylkka</h1>
      </Link>
    </div>
  );
}
