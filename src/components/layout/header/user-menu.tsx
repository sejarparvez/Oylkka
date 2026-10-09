import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Ticket,
  UserIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { useUnreadMessageCount } from '@/services/conversations';
import { SignOut } from './signout';

// Define the shape of your user based on your Root context
interface UserDropDownProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export default function UserDropDown({ user }: UserDropDownProps) {
  // Hooks must run before the signed-in early return below.
  const { data: unreadCount = 0 } = useUnreadMessageCount({
    enabled: !!user,
  });

  // If no user, show the Sign In button using TanStack Link
  if (!user) {
    return (
      <Link to='/auth/signin'>
        <Button size='sm'>Sign In</Button>
      </Link>
    );
  }

  return (
    <div className='pl-2'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className='relative'>
            <Avatar className='border-primary/20 hover:border-primary/40 h-9 w-9 cursor-pointer border-2 transition-all'>
              <AvatarImage
                src={user.image || '/placeholder.svg'}
                alt={user.name || 'User avatar'}
              />
              <AvatarFallback className='bg-primary/10 text-primary'>
                {getInitials(user.name || 'U')}
              </AvatarFallback>
            </Avatar>
            {unreadCount > 0 && (
              <Badge className='absolute -right-2 -top-2 h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-bold'>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className='w-56'
          align='end'
          forceMount
          sideOffset={8}
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>{user.name}</p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Navigation Items using 'to' instead of 'href' */}
          <DropdownMenuItem asChild>
            <Link
              to='/dashboard'
              className='flex w-full cursor-pointer items-center'
            >
              <LayoutDashboard className='text-primary/70 mr-2 h-4 w-4' />
              Dashboard
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              to='/dashboard/messages'
              className='flex w-full cursor-pointer items-center justify-between'
            >
              <div className='flex items-center gap-2'>
                <MessageSquare className='text-primary/70 mr-2 h-4 w-4' />
                Messages
              </div>
              {unreadCount > 0 && (
                <Badge className='ml-2 px-2 py-0.5 text-xs font-bold'>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              to='/dashboard/vouchers'
              className='flex w-full cursor-pointer items-center'
            >
              <Ticket className='text-primary/70 mr-2 h-4 w-4' />
              My Vouchers
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              to='/dashboard/my-account'
              className='flex w-full cursor-pointer items-center'
            >
              <Settings className='text-primary/70 mr-2 h-4 w-4' />
              Edit Account
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              to='/dashboard/my-account'
              className='flex w-full cursor-pointer items-center'
            >
              <UserIcon className='text-primary/70 mr-2 h-4 w-4' />
              Account Details
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Your custom SignOut component */}
          <SignOut />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
