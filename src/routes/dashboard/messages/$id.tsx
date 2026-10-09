import { createFileRoute, Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ChevronLeft, ImagePlus, Loader2, Send, Store, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  useConversationDetail,
  useMarkAsReadMutation,
  useMessages,
  useSendMessageMutation,
} from '@/services/conversations';

export const Route = createFileRoute('/dashboard/messages/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id: conversationId } = Route.useParams();
  const { data: convoData, isLoading: convoLoading } =
    useConversationDetail(conversationId);
  const { data: msgData, isLoading: msgsLoading } = useMessages(conversationId);
  const sendMutation = useSendMessageMutation();
  const markReadMutation = useMarkAsReadMutation();

  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = Route.useRouteContext();

  const conversation = convoData?.conversation;
  const messages = msgData?.messages ?? [];
  const shop = conversation?.shop;

  useEffect(() => {
    if (conversationId) {
      markReadMutation.mutate({
        conversationId,
        role: 'customer',
      });
    }
  }, [conversationId, markReadMutation.mutate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is fine
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend() {
    if (!content.trim() && !imageFile) {
      toast.error('Please enter a message or attach an image');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('content', content.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }
      await sendMutation.mutateAsync(formData);
      setContent('');
      removeImage();
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsUploading(false);
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
          <Link to='/dashboard/messages'>Back to Messages</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-[calc(100vh-12rem)]'>
      {/* Header */}
      <div className='flex items-center gap-3 pb-4 border-b border-border'>
        <Button variant='ghost' size='icon' asChild className='shrink-0'>
          <Link to='/dashboard/messages'>
            <ChevronLeft className='w-4 h-4' />
          </Link>
        </Button>
        <div className='w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden'>
          {shop?.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt={shop.name}
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
          <p className='text-sm font-semibold'>{shop?.name ?? 'Shop'}</p>
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
              No messages yet. Start the conversation!
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
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {conversation.status === 'OPEN' ? (
        <div className='border-t border-border pt-4 space-y-3'>
          {imagePreview && (
            <div className='relative w-20 h-20 rounded-lg overflow-hidden border border-border'>
              <img
                src={imagePreview}
                alt='Preview'
                width={80}
                height={80}
                loading='lazy'
                decoding='async'
                className='w-full h-full object-cover'
              />
              <button
                type='button'
                onClick={removeImage}
                className='absolute top-0.5 right-0.5 w-5 h-5 bg-background/80 rounded-full flex items-center justify-center'
              >
                <X className='w-3 h-3' />
              </button>
            </div>
          )}
          <div className='flex items-end gap-2'>
            <div className='flex-1'>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder='Type your message...'
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
            <input
              type='file'
              ref={fileInputRef}
              accept='image/*'
              className='hidden'
              onChange={handleImageSelect}
            />
            <Button
              variant='outline'
              size='icon'
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <ImagePlus className='w-4 h-4' />
            </Button>
            <Button
              size='icon'
              onClick={handleSend}
              disabled={
                isUploading ||
                sendMutation.isPending ||
                (!content.trim() && !imageFile)
              }
            >
              {isUploading || sendMutation.isPending ? (
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
