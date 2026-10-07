import { Image } from '@unpic/react';
import { Loader2, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ImageFile = {
  id: string;
  file: File;
  preview: string;
};

type ReviewFormProps = {
  productId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

let imageIdCounter = 0;

export function ReviewForm({
  productId,
  open,
  onOpenChange,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readersRef = useRef<FileReader[]>([]);

  const abortReaders = useCallback(() => {
    for (const reader of readersRef.current) {
      reader.abort();
    }
    readersRef.current = [];
  }, []);

  useEffect(() => {
    if (!open) abortReaders();
  }, [open, abortReaders]);

  useEffect(() => {
    return () => abortReaders();
  }, [abortReaders]);

  const reset = () => {
    setRating(0);
    setHoverRating(0);
    setTitle('');
    setContent('');
    setImages([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    abortReaders();
    const selected = Array.from(e.target.files ?? []);
    const remaining = 3 - images.length;
    const toAdd = selected.slice(0, remaining);

    for (const file of toAdd) {
      const id = `img-${++imageIdCounter}`;
      const reader = new FileReader();
      readersRef.current.push(reader);
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          { id, file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (content.length < 10) {
      toast.error('Review must be at least 10 characters');
      return;
    }
    if (content.length > 1000) {
      toast.error('Review must be under 1000 characters');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('rating', String(rating));
      formData.append('title', title);
      formData.append('content', content);
      for (const { file } of images) {
        formData.append('images', file);
      }

      const res = await fetch('/api/product/create-review', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        let message = 'Failed to submit review';
        try {
          const err = await res.json();
          message = err.error ?? message;
        } catch {
          // Non-JSON error body (e.g. a gateway HTML error page).
        }
        throw new Error(message);
      }

      toast.success('Review submitted successfully!');
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to submit review',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>

        <form
          className='space-y-5'
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div>
            <Label className='mb-2 block'>Rating</Label>
            <div className='flex gap-1'>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type='button'
                  className='transition-transform hover:scale-110'
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <Star
                    className={cn(
                      'w-7 h-7',
                      star <= (hoverRating || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-muted-foreground',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor='review-title' className='mb-2 block'>
              Title <span className='text-muted-foreground'>(optional)</span>
            </Label>
            <input
              id='review-title'
              className='flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
              placeholder='Summarize your review'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor='review-content' className='mb-2 block'>
              Review <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='review-content'
              placeholder='Share your experience with this product...'
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              className='min-h-[120px]'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              {content.length}/1000 characters
            </p>
          </div>

          <div>
            <Label className='mb-2 block'>
              Images{' '}
              <span className='text-muted-foreground'>(optional, max 3)</span>
            </Label>
            <div className='flex gap-2 flex-wrap'>
              {images.map((img) => (
                <div
                  key={img.id}
                  className='relative w-20 h-20 rounded-lg overflow-hidden bg-muted ring-1 ring-border'
                >
                  <Image
                    src={img.preview}
                    width={80}
                    height={80}
                    alt='Preview'
                    layout='fixed'
                    className='object-cover w-full h-full'
                  />
                  <button
                    type='button'
                    onClick={() => removeFile(img.id)}
                    className='absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors'
                  >
                    <X className='w-3 h-3 text-white' />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors text-2xl font-light'
                >
                  +
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/webp'
              multiple
              className='hidden'
              onChange={handleFileChange}
            />
          </div>

          <div className='flex gap-3 justify-end pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Submit Review
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
