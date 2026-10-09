import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Inbox, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useVendorConversations } from '@/services/conversations';

export const Route = createFileRoute('/dashboard/vendor/shop/messages/')({
  beforeLoad: ({ context }) => {
    if (!context.user?.role || context.user.role !== 'VENDOR') {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useVendorConversations();
  const conversations = data?.conversations ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Messages</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Customer inquiries and conversations
          </p>
        </div>
        {unreadCount > 0 && (
          <span className='text-xs text-primary font-medium'>
            {unreadCount} unread
          </span>
        )}
      </div>

      {isLoading ? (
        <div className='space-y-3'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-24 rounded-2xl' />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
          <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center'>
            <Inbox className='w-7 h-7 text-muted-foreground' />
          </div>
          <div>
            <p className='text-sm font-semibold'>No messages yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              When customers message you about products or orders, their
              conversations will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          {conversations.map((convo) => {
            const lastMsg = convo.messages?.[0];
            const isUnread =
              lastMsg && !lastMsg.isRead && lastMsg.senderId !== 'vendor';

            return (
              <Link
                key={convo.id}
                to='/dashboard/vendor/shop/messages/$id'
                params={{ id: convo.id }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-colors',
                  isUnread && 'border-primary/30 bg-primary/5',
                )}
              >
                <div className='w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden'>
                  {convo.customer?.imageUrl ? (
                    <img
                      src={convo.customer.imageUrl}
                      alt={convo.customer.name}
                      width={40}
                      height={40}
                      loading='lazy'
                      decoding='async'
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <User className='w-5 h-5 text-muted-foreground' />
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold truncate'>
                      {convo.customer?.name ?? 'Customer'}
                    </p>
                    {lastMsg && (
                      <span className='text-[10px] text-muted-foreground shrink-0'>
                        {format(new Date(lastMsg.createdAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                    {convo.subject}
                  </p>
                  {lastMsg && (
                    <p className='text-xs text-muted-foreground line-clamp-1 mt-1.5'>
                      {lastMsg.content}
                    </p>
                  )}
                </div>
                {isUnread && (
                  <div className='w-2 h-2 rounded-full bg-primary shrink-0 mt-2' />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
