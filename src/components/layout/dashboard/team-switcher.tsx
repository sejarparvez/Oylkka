import { Link } from '@tanstack/react-router';
import { ShoppingBag } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' asChild>
          <Link to='/'>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
              <ShoppingBag className='size-4' />
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <h1 className='text-2xl font-extrabold tracking-tight md:text-3xl'>
                <span className='text-primary'>Oyl</span>kka
              </h1>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
