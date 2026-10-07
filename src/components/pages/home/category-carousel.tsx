import { Link } from '@tanstack/react-router';
import { ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { QueryErrorState } from '@/components/query-state';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicCategories } from '@/services/category';

export default function CategoryCarousel() {
  const { data: categories, isLoading, isError, refetch } =
    usePublicCategories();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      api?.scrollNext();
    }, 3000);
  }, [api]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api || categories?.length === 0) return;
    if (isHovered) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
    return stopAutoplay;
  }, [api, isHovered, categories?.length, startAutoplay, stopAutoplay]);

  if (isLoading) return <CategoryCarouselSkeleton />;
  if (isError)
    return (
      <div className='flex justify-center'>
        <QueryErrorState
          title='Failed to load categories'
          onRetry={() => refetch()}
        />
      </div>
    );
  if (!categories || categories.length === 0) return null;

  return (
    <section className='w-full py-16 md:py-20'>
      <div className='container mx-auto px-2 md:px-4'>
        <div className='mb-10 flex items-center gap-3'>
          <div className='h-px w-8 bg-primary' />
          <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
            Browse
          </span>
          <div className='h-px flex-1 bg-border' />
        </div>

        <h2 className='text-3xl md:text-4xl font-bold tracking-tight mb-10'>
          Shop by{' '}
          <span className='italic font-bold text-primary'>Category</span>
          <span className='text-primary'>.</span>
        </h2>

        {/* biome-ignore lint/a11y/useSemanticElements: div needed for carousel context */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role='region'
          aria-roledescription='carousel'
        >
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              loop: true,
              dragFree: true,
            }}
            className='-mx-1'
          >
            <CarouselContent className='-ml-2 md:-ml-4'>
              {categories.map((category) => (
                <CarouselItem
                  key={category.id}
                  className='basis-[45%] pl-2 md:basis-1/3 md:pl-4 lg:basis-1/4'
                >
                  <Link
                    to='/products/category/$slug'
                    params={{ slug: category.slug }}
                    className='group block'
                  >
                    <div className='relative aspect-square overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-lg'>
                      {category.imageUrl ? (
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-110'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5'>
                          <ImageIcon className='h-12 w-12 text-primary/20' />
                        </div>
                      )}

                      <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />

                      <div className='absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'>
                        <h3 className='text-sm font-semibold text-white drop-shadow-sm'>
                          {category.name}
                        </h3>
                        {category.description && (
                          <p className='mt-1 text-xs text-white/80 line-clamp-1 drop-shadow-sm'>
                            {category.description}
                          </p>
                        )}
                      </div>

                      <div className='absolute top-3 left-3 transition-all duration-300 group-hover:opacity-0'>
                        <span className='rounded-lg bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold'>
                          {category.name}
                        </span>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className='hidden md:flex -left-4 h-10 w-10 border-border bg-background/80 backdrop-blur-sm hover:bg-background' />
            <CarouselNext className='hidden md:flex -right-4 h-10 w-10 border-border bg-background/80 backdrop-blur-sm hover:bg-background' />
          </Carousel>

          {/* Dots */}
          {count > 1 && (
            <div className='mt-6 flex items-center justify-center gap-2'>
              {Array.from({ length: count }).map((_, i) => (
                <button
                  type='button'
                  // biome-ignore lint/suspicious/noArrayIndexKey: static dot list
                  key={i}
                  onClick={() => api?.scrollTo(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-primary/20 hover:bg-primary/40'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryCarouselSkeleton() {
  return (
    <section className='w-full py-16 md:py-20'>
      <div className='container mx-auto px-2 md:px-4'>
        <div className='mb-10 flex items-center gap-3'>
          <Skeleton className='h-px w-8' />
          <Skeleton className='h-4 w-16' />
          <Skeleton className='h-px flex-1' />
        </div>
        <Skeleton className='mb-10 h-10 w-64' />
        <div className='flex gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
              key={i}
              className='basis-[45%] md:basis-1/3 lg:basis-1/4'
            >
              <Skeleton className='aspect-square w-full rounded-2xl' />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
