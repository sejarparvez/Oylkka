import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Inbox, Store, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAdminConversations } from '@/services/conversations';

export const Route = createFileRoute('/dashboard/admin/messages/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = useAdminConversations();
  const conversations = data?.conversations ?? [];

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>Conversations</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          All customer-vendor conversations
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
            <p className='text-sm font-semibold'>No conversations yet</p>
            <p className='text-sm text-muted-foreground mt-1 max-w-xs'>
              All customer-vendor conversations will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className='space-y-2'>
          {conversations.map((convo) => {
            const lastMsg = convo.messages?.[0];

            return (
              <Link
                key={convo.id}
                to='/dashboard/admin/messages/$id'
                params={{ id: convo.id }}
                className='flex items-start gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-accent/50 transition-colors'
              >
                <div className='flex flex-col items-center gap-1'>
                  <div className='w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden'>
                    {convo.shop?.logoUrl ? (
                      <img
                        src={convo.shop.logoUrl}
                        alt={convo.shop.name}
                        width={36}
                        height={36}
                        loading='lazy'
                        decoding='async'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <Store className='w-4 h-4 text-muted-foreground' />
                    )}
                  </div>
                  <div className='w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden -mt-1'>
                    {convo.customer?.imageUrl ? (
                      <img
                        src={convo.customer.imageUrl}
                        alt={convo.customer.name}
                        width={20}
                        height={20}
                        loading='lazy'
                        decoding='async'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <User className='w-2.5 h-2.5 text-muted-foreground' />
                    )}
                  </div>
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-sm font-semibold truncate'>
                      {convo.shop?.name ?? 'Shop'}
                      <span className='text-xs text-muted-foreground font-normal mx-1.5'>
                        with
                      </span>
                      {convo.customer?.name ?? 'Customer'}
                    </p>
                    {lastMsg && (
                      <span className='text-[10px] text-muted-foreground shrink-0'>
                        {format(new Date(lastMsg.createdAt), 'MMM d')}
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
                  <div className='flex items-center gap-2 mt-1.5'>
                    <span className='text-[10px] text-muted-foreground'>
                      {convo._count?.messages ?? 0} messages
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full',
                        convo.status === 'OPEN'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {convo.status}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
