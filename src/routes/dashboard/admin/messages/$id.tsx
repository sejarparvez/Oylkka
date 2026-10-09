import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ChevronLeft, Loader2, Send, Store } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useAdminConversationDetail,
  useAdminSendMessageMutation,
  useMessages,
} from '@/services/conversations';

export const Route = createFileRoute('/dashboard/admin/messages/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: conversationId } = Route.useParams();
  const { data: convoData, isLoading: convoLoading } =
    useAdminConversationDetail(conversationId);
  const { data: msgData, isLoading: msgsLoading } = useMessages(conversationId);
  const sendMutation = useAdminSendMessageMutation();

  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = Route.useRouteContext();

  const conversation = convoData?.conversation;
  const messages = msgData?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  async function handleSend() {
    if (!content.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await sendMutation.mutateAsync({
        conversationId,
        content: content.trim(),
      });
      setContent('');
    } catch {
      toast.error('Failed to send message');
    }
  }

  if (convoLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-32' />
        <Skeleton className='h-16 rounded-2xl' />
        <Skeleton className='flex-1 rounded-2xl' />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-4 text-center'>
        <p className='text-sm font-semibold'>Conversation not found</p>
        <Button size='sm' asChild>
          <Link to='/dashboard/admin/messages'>Back</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-12rem)]'>
      {/* Header */}
      <div className='flex items-center gap-3 pb-4 border-b border-border'>
        <Button variant='ghost' size='icon' asChild className='shrink-0'>
          <Link to='/dashboard/admin/messages'>
            <ChevronLeft className='w-4 h-4' />
          </Link>
        </Button>
        <div className='w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden'>
          {conversation.shop?.logoUrl ? (
            <img
              src={conversation.shop.logoUrl}
              alt={conversation.shop.name}
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
        <div className='min-w-0'>
          <p className='text-sm font-semibold'>
            {conversation.shop?.name ?? 'Shop'}
            <span className='text-xs text-muted-foreground font-normal mx-1.5'>
              with
            </span>
            {conversation.customer?.name ?? 'Customer'}
          </p>
          <p className='text-xs text-muted-foreground truncate'>
            {conversation.subject}
          </p>
        </div>
        {conversation.status === 'CLOSED' && (
          <span className='text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto'>
            Closed
          </span>
        )}
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto py-4 space-y-4'>
        {msgsLoading ? (
          <div className='space-y-3'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-16 w-3/4 rounded-2xl' />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-center'>
            <p className='text-sm text-muted-foreground'>
              No messages in this conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[80%]',
                  isMine ? 'ml-auto items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm',
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md',
                  )}
                >
                  <p className='whitespace-pre-wrap break-words'>
                    {msg.content}
                  </p>
                  {msg.imageUrl && (
                    <a
                      href={msg.imageUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block mt-2 rounded-lg overflow-hidden'
                    >
                      <img
                        src={msg.imageUrl}
                        alt='Attached'
                        loading='lazy'
                        decoding='async'
                        className='max-w-full h-auto rounded-lg'
                      />
                    </a>
                  )}
                </div>
                <span className='text-[10px] text-muted-foreground mt-1'>
                  {format(new Date(msg.createdAt), 'h:mm a')}
                  <span className='ml-2'>{msg.sender.name}</span>
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {conversation.status === 'OPEN' ? (
        <div className='border-t border-border pt-4'>
          <div className='flex items-end gap-2'>
            <div className='flex-1'>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='Reply as admin...'
                rows={2}
                className='resize-none min-h-[2.5rem]'
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <Button
              size='icon'
              onClick={handleSend}
              disabled={sendMutation.isPending || !content.trim()}
            >
              {sendMutation.isPending ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <Send className='w-4 h-4' />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className='border-t border-border pt-4 text-center'>
          <p className='text-xs text-muted-foreground'>
            This conversation is closed.
          </p>
        </div>
      )}
    </div>
  );
}
