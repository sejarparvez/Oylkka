import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ShareProductProps = {
  slug: string;
};

export function ShareProduct({ slug }: ShareProductProps) {
  // `window` must never be touched in the render body — this component is
  // rendered during SSR (FE-01). Seed with a path-relative URL so server and
  // first client render agree, then upgrade to the absolute origin after mount.
  const [url, setUrl] = useState(`/product/${slug}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/product/${slug}`);
  }, [slug]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error('Failed to copy share link:', error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' className='text-muted-foreground'>
          <Share2 className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share Product</DialogTitle>
          <DialogDescription className='sr-only'>
            Share this product with others.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue='link'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='link'>
              <Copy className='mr-2 h-4 w-4' />
              Copy Link
            </TabsTrigger>
            <TabsTrigger value='qr'>
              <QrCode className='mr-2 h-4 w-4' />
              QR Code
            </TabsTrigger>
          </TabsList>
          <TabsContent value='link' className='space-y-3'>
            <div className='rounded-lg bg-muted p-3'>
              <p className='text-sm break-all text-muted-foreground'>{url}</p>
            </div>
            <Button
              onClick={handleCopy}
              className='w-full gap-2'
              variant='outline'
            >
              <Check className={cn('h-4 w-4', copied && 'text-green-500')} />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </TabsContent>
          <TabsContent value='qr' className='flex justify-center py-4'>
            <div className='rounded-xl border bg-white p-4'>
              <QRCodeSVG value={url} size={200} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
