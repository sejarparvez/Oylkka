import { Check, LayoutGrid, Loader2, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { checkSlugUnique } from '@/actions/check-slug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TagsInput } from '@/components/ui/tags-input';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/slug';
import { useVendorCategories } from '@/services/product';

import type { ProductFormValues } from './product-form-type';

interface BasicInformationCardProps {
  productId?: string;
}

export function BasicInformationCard({ productId }: BasicInformationCardProps) {
  const { data: productCategories, isPending, isError } = useVendorCategories();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ProductFormValues>();
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    isUnique: boolean | null;
    suggestions: string[];
  }>({ isUnique: null, suggestions: [] });

  const slugCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastCheckedSlug = useRef<string>('');
  const slugEditedRef = useRef(false);

  useEffect(() => {
    slugEditedRef.current = false;
    lastCheckedSlug.current = '';
    setSlugStatus({ isUnique: null, suggestions: [] });
  }, [productId]);

  const productName = useWatch({ control, name: 'productName' });
  const slug = useWatch({ control, name: 'slug' });
  const tags = useWatch({ control, name: 'tags' });
  const category = useWatch({ control, name: 'category' });

  const checkSlug = async (slugToCheck: string) => {
    if (!slugToCheck || slugToCheck === lastCheckedSlug.current) return;
    lastCheckedSlug.current = slugToCheck;
    setIsCheckingSlug(true);

    try {
      const result = await checkSlugUnique({
        data: { slug: slugToCheck, productId },
      });
      setSlugStatus({
        isUnique: result.isUnique,
        suggestions: result.suggestions || [],
      });
    } catch (error) {
      // biome-ignore lint/suspicious/noConsole: this is fine
      console.error('Failed to check slug uniqueness:', error);
    } finally {
      setIsCheckingSlug(false);
    }
  };

  useEffect(() => {
    if (!slugEditedRef.current && productName) {
      const newSlug = slugify(productName);
      setValue('slug', newSlug, { shouldValidate: true });
    }
  }, [productName, setValue]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is fine
  useEffect(() => {
    if (!slug || isCheckingSlug) return;
    if (slug === lastCheckedSlug.current) return;

    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }

    slugCheckTimeoutRef.current = setTimeout(() => {
      checkSlug(slug);
    }, 500);

    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, [slug, isCheckingSlug]);

  const applySuggestion = (suggestion: string) => {
    setValue('slug', suggestion, { shouldValidate: true });
    setSlugStatus({ isUnique: true, suggestions: [] });
  };

  const groupedCategories = (() => {
    if (!productCategories) return { parents: [], children: [] };
    const parents = productCategories.filter((c) => !c.parentId);
    const children = productCategories.filter((c) => c.parentId);
    return { parents, children };
  })();

  return (
    <Card>
      <CardHeader className='flex flex-row items-center gap-2'>
        <LayoutGrid className='h-5 w-5' />
        <span className='text-lg font-semibold'>Basic Information</span>
      </CardHeader>
      <CardContent className='grid gap-6'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field data-invalid={!!errors.productName}>
            <FieldLabel htmlFor='productName'>Product Name *</FieldLabel>
            <Input
              id='productName'
              placeholder='Product Name'
              {...register('productName')}
            />
            {errors.productName && (
              <FieldError>{errors.productName.message}</FieldError>
            )}
          </Field>
          <Field data-invalid={!!errors.slug}>
            <FieldLabel htmlFor='slug'>Product Slug *</FieldLabel>
            <div className='relative w-full'>
              <Input
                id='slug'
                placeholder='product-slug'
                value={slug || ''}
                onChange={(e) => {
                  slugEditedRef.current = true;
                  setValue('slug', e.target.value, { shouldValidate: true });
                }}
                className={
                  slugStatus.isUnique === true
                    ? 'border-green-500 pr-8'
                    : slugStatus.isUnique === false
                      ? 'border-red-500 pr-8'
                      : 'pr-8'
                }
              />
              {isCheckingSlug && (
                <div className='absolute top-1/2 right-2 -translate-y-1/2'>
                  <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
                </div>
              )}
              {!isCheckingSlug && slugStatus.isUnique === true && (
                <div className='absolute top-1/2 right-2 -translate-y-1/2'>
                  <Check className='h-4 w-4 text-green-500' />
                </div>
              )}
              {!isCheckingSlug && slugStatus.isUnique === false && (
                <div className='absolute top-1/2 right-2 -translate-y-1/2'>
                  <XCircle className='h-4 w-4 text-red-500' />
                </div>
              )}
            </div>
            {!isCheckingSlug && slugStatus.isUnique === false && (
              <div className='text-sm'>
                <p className='text-red-500'>
                  This slug is already taken. Try one of these:
                </p>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {slugStatus.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => applySuggestion(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {errors.slug && <FieldError>{errors.slug.message}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor='description'>Description *</FieldLabel>
          <Textarea
            id='description'
            placeholder='Describe your product in detail'
            rows={4}
            {...register('description')}
          />
          {errors.description && (
            <FieldError>{errors.description.message}</FieldError>
          )}
        </Field>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6'>
          <Field data-invalid={!!errors.category}>
            <FieldLabel>Category *</FieldLabel>
            {isPending ? (
              <Skeleton className='h-8 w-full' />
            ) : isError ? (
              <div>Error</div>
            ) : (
              <Select
                onValueChange={(val) => setValue('category', val)}
                value={category}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select your product category' />
                </SelectTrigger>
                <SelectContent>
                  {groupedCategories.parents.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  {groupedCategories.children.length > 0 && (
                    <>
                      <div className='px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'>
                        Subcategories
                      </div>
                      {groupedCategories.children.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            )}
            {errors.category && (
              <FieldError>{errors.category.message}</FieldError>
            )}
          </Field>
          <Field data-invalid={!!errors.brand}>
            <FieldLabel htmlFor='brand'>Brand</FieldLabel>
            <Input
              id='brand'
              placeholder='Brand name (optional)'
              {...register('brand')}
            />
            {errors.brand && <FieldError>{errors.brand.message}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={!!errors.tags}>
          <FieldLabel>Enter your product tags.</FieldLabel>
          <TagsInput
            value={tags}
            onValueChange={(val) =>
              setValue('tags', val, { shouldValidate: true })
            }
            placeholder='Type a tag and press Enter...'
          />
          <FieldDescription>
            Type a tag and press Enter to add it
          </FieldDescription>
          {errors.tags && <FieldError>{errors.tags.message}</FieldError>}
        </Field>
      </CardContent>
    </Card>
  );
}
