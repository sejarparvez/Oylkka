import { useEffect, useRef, useState } from 'react';
import { CompareLink } from '@/components/pages/shop/compare-button';
import { cn } from '@/lib/utils';
import { Route as RootRoute } from '@/routes/__root';
import Cart from './cart';
import DesktopNav from './desktop-nav';
import MobileMenu from './mobile-menu';
import SearchBar from './searchbar';
import { ModeToggle } from './theme-switcher';
import UserMenu from './user-menu';

type HeaderProps = {
  navigation?: boolean;
};

export default function Header({ navigation = true }: HeaderProps) {
  const { user } = RootRoute.useRouteContext();
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDiff = currentScrollY - lastScrollY.current;

      if (scrollDiff > 10 && currentScrollY > 80) {
        setIsScrollHidden(true);
      } else if (scrollDiff < -10 || currentScrollY <= 80) {
        setIsScrollHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'bg-background sticky top-0 z-50 w-full border-b shadow-sm transition-transform duration-300',
        isScrollHidden && '-translate-y-full',
      )}
    >
      <div className='container py-4 md:py-5'>
        <div className='flex items-center justify-between gap-6'>
          {/* Left Section: Mobile Menu Trigger & Logo */}
          <div className='flex-none'>
            <MobileMenu />
          </div>

          {/* Middle Section: Desktop Navigation */}
          {navigation && (
            <div className='hidden flex-1 justify-center md:flex'>
              <DesktopNav />
            </div>
          )}

          {/* Right Section: Search, Theme, Notifications, Cart, User */}
          <div className='flex flex-none items-center justify-end gap-4'>
            {/* Desktop Search Bar */}
            <div className='hidden md:block md:w-70 lg:w-[320px] xl:w-95'>
              <SearchBar />
            </div>
            {/* Removed MobileSearch component */}

            <div className='flex items-center gap-2'>
              {/* Theme Switcher */}
              <div>
                <ModeToggle />
              </div>
              <CompareLink />
              {user && <Cart />}
              <UserMenu user={user} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
