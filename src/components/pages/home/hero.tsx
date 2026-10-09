import { Link } from '@tanstack/react-router';
import { Image } from '@unpic/react';
import Autoplay from 'embla-carousel-autoplay';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { useHeroBanner } from '@/services/banner';

export default function HeroSection() {
  const { isPending, data = [], isError } = useHeroBanner();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const autoplayPlugin = useMemo(
    () => Autoplay({ delay: 8000, stopOnInteraction: true }),
    [],
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (isPending) return <HeroSkeleton />;
  if (isError) return <HeroError />;
  if (data.length === 0) return null;

  return (
    <section className='relative w-full overflow-hidden'>
      <Carousel
        setApi={setApi}
        plugins={[autoplayPlugin]}
        opts={{ loop: true }}
        className='w-full'
      >
        <CarouselContent>
          {data.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className='relative h-[40vh] w-full md:h-[70vh] lg:h-[91vh]'>
                {/* Background image + overlay */}
                <div className='absolute inset-0 overflow-hidden'>
                  <Image
                    src={slide.imageUrl || '/placeholder.svg'}
                    alt={slide.title}
                    width={1600}
                    height={900}
                    loading='eager'
                    decoding='async'
                    className='h-full w-full object-cover object-center'
                  />
                  <div
                    className={cn(
                      'absolute inset-0',
                      slide.alignment === 'LEFT'
                        ? 'bg-linear-to-r from-black/90 via-black/20 to-transparent'
                        : slide.alignment === 'CENTER'
                          ? 'bg-linear-to-r from-black/60 via-black/20 to-black/60'
                          : 'bg-linear-to-l from-black/90 via-black/40 to-transparent',
                    )}
                    aria-hidden='true'
                  />
                </div>

                {/* Slide content */}
                <div className='relative z-10 flex h-full items-center'>
                  <div
                    className={cn(
                      'container mx-auto flex px-2 md:px-0',
                      slide.alignment === 'LEFT'
                        ? 'justify-start'
                        : slide.alignment === 'CENTER'
                          ? 'justify-center text-center'
                          : 'justify-end',
                    )}
                  >
                    <div className='max-w-md space-y-2 md:max-w-lg md:space-y-4 lg:max-w-xl'>
                      {slide.bannerTag && (
                        <Badge className='hidden md:block text-[0.675rem]'>
                          {slide.bannerTag}
                        </Badge>
                      )}
                      <h2 className='font-heading text-xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl'>
                        {slide.title}
                      </h2>
                      <p className=' md:font-medium text-white md:text-2xl'>
                        {slide.subTitle}
                      </p>
                      <p className='text-sm text-white/90 md:text-lg hidden md:block line-clamp-3'>
                        {slide.description}
                      </p>
                      <div
                        className={cn(
                          'flex flex-wrap gap-3 pt-2',
                          slide.alignment === 'CENTER' && 'justify-center',
                        )}
                      >
                        {slide.primaryActionText && slide.primaryActionLink && (
                          <Button asChild size='lg'>
                            <Link to={slide.primaryActionLink}>
                              {slide.primaryActionText}
                            </Link>
                          </Button>
                        )}
                        {slide.secondaryActionText &&
                          slide.secondaryActionLink && (
                            <Button
                              asChild
                              variant='outline'
                              size='lg'
                              className='border-white/20 bg-white/10 text-white hover:bg-white/20'
                            >
                              <Link to={slide.secondaryActionLink}>
                                {slide.secondaryActionText}
                              </Link>
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Dot indicators */}
        <div className='absolute right-0 bottom-4 left-0 z-20 flex justify-center gap-2'>
          {data.map((_, index) => (
            <button
              type='button'
              // biome-ignore lint/suspicious/noArrayIndexKey: fine for dots
              key={index}
              className={cn(
                'h-2 rounded-full transition-all',
                index === current
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/80',
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className='relative h-[40vh] w-full md:h-[70vh] lg:h-[91vh]'>
      <div className='bg-muted absolute inset-0 animate-pulse' />
      <div className='relative z-10 flex h-full items-center'>
        <div className='container mx-auto px-2 md:px-0'>
          <div className='max-w-md space-y-2 md:max-w-lg md:space-y-4 lg:max-w-xl'>
            <div className='bg-muted-foreground/20 h-6 w-24 rounded' />
            <div className='bg-muted-foreground/30 h-10 w-3/4 rounded' />
            <div className='bg-muted-foreground/30 h-8 w-2/3 rounded' />
            <div className='space-y-2'>
              <div className='bg-muted-foreground/20 h-4 w-full rounded' />
              <div className='bg-muted-foreground/20 h-4 w-5/6 rounded' />
              <div className='bg-muted-foreground/20 h-4 w-4/6 rounded' />
            </div>
            <div className='flex gap-3 pt-2'>
              <div className='bg-muted-foreground/30 h-10 w-32 rounded' />
              <div className='bg-muted-foreground/20 h-10 w-32 rounded' />
            </div>
          </div>
        </div>
      </div>
      <div className='absolute right-0 bottom-4 left-0 z-20 flex justify-center gap-2'>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className='bg-muted-foreground/30 h-2 w-2 rounded-full'
          />
        ))}
      </div>
    </div>
  );
}

function HeroError() {
  return (
    <div className='w-full p-6'>
      <Alert variant='destructive'>
        <AlertCircle className='h-4 w-4' />
        <AlertTitle>Failed to load</AlertTitle>
        <AlertDescription>
          We couldn't load the hero banner. Please try again later.
        </AlertDescription>
      </Alert>
    </div>
  );
}
