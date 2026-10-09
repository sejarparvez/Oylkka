import { Image } from '@unpic/react';
import { ChevronLeft, ChevronRight, Maximize2, Package, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';

type GalleryImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  order: number;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  productName: string;
  discountPercent: number | null;
};

export function ProductGallery({
  images,
  productName,
  discountPercent,
}: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [magnify, setMagnify] = useState(false);
  const [magnifyPos, setMagnifyPos] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive((p) => Math.min(p, Math.max(images.length - 1, 0)));
  }, [images]);

  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[active] : null;

  const goNext = useCallback(
    () => setActive((p) => (p + 1) % images.length),
    [images.length],
  );
  const goPrev = useCallback(
    () => setActive((p) => (p - 1 + images.length) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, goNext, goPrev]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    setMagnifyPos({
      x: ((e.clientX - left) / width) * 100,
      y: ((e.clientY - top) / height) * 100,
    });
  };

  if (!hasImages || !activeImage) {
    return (
      <div className='aspect-square rounded-2xl bg-muted flex items-center justify-center'>
        <Package className='w-12 h-12 text-muted-foreground/50' />
      </div>
    );
  }

  const img = activeImage;

  return (
    <div className='space-y-4'>
      {/** biome-ignore lint/a11y/noStaticElementInteractions: this is fine */}
      <div
        ref={imageContainerRef}
        className='relative block aspect-square w-full rounded-2xl overflow-hidden bg-muted cursor-zoom-in text-left'
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setMagnify(true)}
        onMouseLeave={() => setMagnify(false)}
      >
        <Image
          src={img.imageUrl}
          width={800}
          height={800}
          alt={img.altText ?? productName}
          className='object-cover w-full h-full transition-opacity duration-300'
        />

        {magnify && (
          <span
            className='pointer-events-none absolute inset-0 z-10'
            style={{
              backgroundImage: `url(${img.imageUrl})`,
              backgroundPosition: `${magnifyPos.x}% ${magnifyPos.y}%`,
              backgroundSize: '250%',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}

        {discountPercent && (
          <Badge className='absolute top-4 left-4 z-20 bg-red-500'>
            -{discountPercent}%
          </Badge>
        )}

        <Button
          type='button'
          variant='secondary'
          size='icon'
          aria-label='Open image viewer'
          onClick={() => setLightboxOpen(true)}
          className='absolute right-4 bottom-4 z-20 opacity-80 hover:opacity-100'
        >
          <Maximize2 className='w-4 h-4' />
        </Button>
      </div>

      <Carousel className='w-full'>
        <CarouselContent>
          {images.map((img, i) => (
            <CarouselItem key={img.id} className='basis-1/5 pl-4'>
              <button
                type='button'
                onClick={() => setActive(i)}
                className={cn(
                  'relative w-full aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                  active === i
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent',
                )}
              >
                <Image
                  src={img.imageUrl}
                  width={120}
                  height={120}
                  alt={img.altText ?? `${productName} thumbnail ${i + 1}`}
                  className='object-cover w-full h-full'
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='left-0' />
        <CarouselNext className='right-0' />
      </Carousel>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-50 bg-black/90 flex items-center justify-center'
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type='button'
              onClick={() => setLightboxOpen(false)}
              className='absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10'
            >
              <X className='w-5 h-5' />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className='absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10'
                >
                  <ChevronLeft className='w-5 h-5' />
                </button>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className='absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors z-10'
                >
                  <ChevronRight className='w-5 h-5' />
                </button>
              </>
            )}

            <motion.div
              key={active}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className='w-full max-w-4xl max-h-[90vh] px-4'
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={activeImage.imageUrl}
                width={1200}
                height={1200}
                alt={activeImage.altText ?? productName}
                className='object-contain w-full h-full rounded-2xl'
              />
            </motion.div>

            <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2'>
              {images.map((img, i) => (
                <button
                  key={img.id}
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive(i);
                  }}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === active ? 'bg-white w-6' : 'bg-white/40',
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
