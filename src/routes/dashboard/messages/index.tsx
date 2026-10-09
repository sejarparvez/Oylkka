import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Inbox, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useConversations } from '@/services/conversations';

export const Route = createFileRoute('/dashboard/messages/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useRouteContext();
  const { data, isLoading } = useConversations();
  const conversations = data?.conversations ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Messages</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Conversations with sellers
        </p>
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
              When you message a seller about an order or product, your
              conversations will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          {conversations.map((convo) => {
            const lastMsg = convo.messages?.[0];
            // Only messages from the other side can mark a conversation
            // unread for this user - your own last message stays isRead=false
            // until the vendor opens it, which used to make the thread look
            // permanently unread (CUST-14).
            const isUnread =
              lastMsg && !lastMsg.isRead && lastMsg.senderId !== user?.id;

            return (
              <Link
                key={convo.id}
                to='/dashboard/messages/$id'
                params={{ id: convo.id }}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-colors',
                  isUnread && 'border-primary/30 bg-primary/5',
                )}
              >
                <div className='w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden'>
                  {convo.shop?.logoUrl ? (
                    <img
                      src={convo.shop.logoUrl}
                      alt={convo.shop.name}
                      width={40}
                      height={40}
                      loading='lazy'
                      decoding='async'
                      className='w-full h-full object-cover'
                    />
                  ) : (
                    <Store className='w-5 h-5 text-muted-foreground' />
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold truncate'>
                      {convo.shop?.name ?? 'Shop'}
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
