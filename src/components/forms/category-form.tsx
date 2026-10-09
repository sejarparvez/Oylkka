import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Layers, Tag, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import type * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/slug';
import {
  CategoryFormSchema,
  EditCategoryFormSchema,
} from '@/schemas/category-schema';
import {
  useCategories,
  useCreateCategoryMutation,
  useEditCategoryMutation,
} from '@/services/category';

type CategoryFormProps =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      categoryId: string;
      defaultValues: z.infer<typeof EditCategoryFormSchema> & {
        existingImageUrl?: string;
      };
    };

function SectionBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className='space-y-5'>
      <div className='flex items-center gap-3 pb-3 border-b border-border'>
        <div className='w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0'>
          <Icon className='w-3.5 h-3.5 text-primary' />
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-px w-4 bg-primary' />
          <span className='text-[10px] font-semibold tracking-[0.18em] uppercase text-primary'>
            {label}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function CategoryForm(props: CategoryFormProps) {
  const isEdit = props.mode === 'edit';
  const [imagePreview, setImagePreview] = useState<string | null>(
    isEdit ? (props.defaultValues.existingImageUrl ?? null) : null,
  );
  const [keepImage, setKeepImage] = useState<boolean>(true);
  const [slugPreview, setSlugPreview] = useState<string>('');

  const schema = isEdit ? EditCategoryFormSchema : CategoryFormSchema;
  type FormValues = z.input<typeof CategoryFormSchema> &
    z.input<typeof EditCategoryFormSchema>;

  const { data: allCategories } = useCategories();

  const parentOptions = allCategories?.filter(
    (cat) => !isEdit || cat.id !== props.categoryId,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // Two schemas (create/edit) share one form; the resolver union can't be
    // narrowed to FormValues, so assert the resolver rather than the form.
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: (isEdit
      ? props.defaultValues
      : {
          name: '',
          description: '',
          parentId: undefined,
          featured: false,
          order: 0,
          image: undefined,
        }) as FormValues,
  });

  const imageValue = watch('image');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val);
    if (!isEdit) {
      setSlugPreview(slugify(val));
    }
  };

  const createMutation = useCreateCategoryMutation();
  const editMutation = useEditCategoryMutation();
  const isPending = isEdit ? editMutation.isPending : createMutation.isPending;

  const onSubmit = async (values: FormValues) => {
    if (isEdit) {
      await editMutation.mutateAsync({
        ...values,
        featured: values.featured ?? false,
        order: Number(values.order ?? 0),
        id: props.categoryId,
        keepExistingImage: keepImage,
      });
    } else {
      await createMutation.mutateAsync({
        ...values,
        featured: values.featured ?? false,
        order: Number(values.order ?? 0),
      });
      reset();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
      setSlugPreview('');
    }
  };

  const handleReset = () => {
    reset();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      if (isEdit) {
        setImagePreview(props.defaultValues.existingImageUrl ?? null);
        setKeepImage(true);
      } else {
        setImagePreview(null);
        setSlugPreview('');
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) {
      setValue('image', files);
      if (imagePreview && !keepImage) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(URL.createObjectURL(files[0]));
      if (isEdit) setKeepImage(false);
    } else {
      setValue('image', null);
      if (imagePreview && !isEdit) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    }
  };

  const handleImageClear = () => {
    setValue('image', null);
    if (imagePreview && isEdit) {
      setImagePreview(props.defaultValues.existingImageUrl ?? null);
      setKeepImage(true);
    } else if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  return (
    <div className='max-w-4xl mx-auto container'>
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='h-px w-8 bg-primary' />
          <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
            Admin
          </span>
        </div>
        <h1 className='text-3xl md:text-4xl font-bold tracking-tight leading-tight'>
          {isEdit ? 'Edit' : 'Create'}{' '}
          <span className='italic font-bold text-primary'>Category</span>
          <span className='text-primary'>.</span>
        </h1>
        <p className='text-sm text-muted-foreground mt-2 leading-relaxed'>
          {isEdit
            ? 'Update your category details and settings.'
            : 'Organize your products by creating a new category.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        <FieldGroup>
          <div className='grid gap-6 md:grid-cols-2'>
            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Tag} label='Category Info'>
                  <div className='space-y-4'>
                    <Field data-invalid={!!errors.name}>
                      <FieldLabel htmlFor='name'>Name</FieldLabel>
                      <Input
                        id='name'
                        placeholder='Enter category name'
                        aria-invalid={!!errors.name}
                        {...register('name')}
                        onChange={handleNameChange}
                      />
                      <FieldDescription>
                        {isEdit
                          ? 'Changing the name will regenerate the slug'
                          : slugPreview
                            ? `Slug: ${slugPreview}`
                            : 'The public name for this category'}
                      </FieldDescription>
                      {errors.name && (
                        <FieldError>{errors.name.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.description}>
                      <FieldLabel htmlFor='description'>Description</FieldLabel>
                      <Textarea
                        id='description'
                        placeholder='Describe this category (optional)'
                        className='min-h-24 resize-y'
                        aria-invalid={!!errors.description}
                        {...register('description')}
                      />
                      <FieldDescription>
                        Brief description of what this category contains
                      </FieldDescription>
                      {errors.description && (
                        <FieldError>{errors.description.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.parentId}>
                      <FieldLabel htmlFor='parentId'>
                        Parent Category
                      </FieldLabel>
                      <Select
                        onValueChange={(val) =>
                          setValue('parentId', val === 'none' ? undefined : val)
                        }
                        defaultValue={
                          isEdit
                            ? (props.defaultValues.parentId ?? 'none')
                            : 'none'
                        }
                      >
                        <SelectTrigger
                          id='parentId'
                          aria-invalid={!!errors.parentId}
                        >
                          <SelectValue placeholder='No parent (top-level)' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='none'>
                            No parent (top-level)
                          </SelectItem>
                          {parentOptions?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Make this a subcategory of an existing category
                      </FieldDescription>
                      {errors.parentId && (
                        <FieldError>{errors.parentId.message}</FieldError>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Layers} label='Settings'>
                  <div className='space-y-4'>
                    <Field>
                      <div className='flex items-center justify-between'>
                        <div>
                          <FieldLabel htmlFor='featured'>Featured</FieldLabel>
                          <FieldDescription>
                            Show this category in featured sections
                          </FieldDescription>
                        </div>
                        <Switch
                          id='featured'
                          defaultChecked={
                            isEdit ? props.defaultValues.featured : false
                          }
                          onCheckedChange={(val) => setValue('featured', val)}
                        />
                      </div>
                    </Field>

                    <Field data-invalid={!!errors.order}>
                      <FieldLabel htmlFor='order'>Sort Order</FieldLabel>
                      <Input
                        id='order'
                        type='number'
                        min={0}
                        placeholder='0'
                        aria-invalid={!!errors.order}
                        {...register('order')}
                      />
                      <FieldDescription>
                        Lower numbers appear first
                      </FieldDescription>
                      {errors.order && (
                        <FieldError>{errors.order.message}</FieldError>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>
          </div>

          <Card className='rounded-2xl border-border shadow-none'>
            <CardContent className='p-6'>
              <SectionBlock icon={ImageIcon} label='Category Image'>
                <div className='grid gap-6 md:grid-cols-2 items-start'>
                  <Field data-invalid={!!errors.image}>
                    <FieldLabel htmlFor='image'>Upload Image</FieldLabel>
                    <div className='flex items-center gap-2'>
                      <Input
                        id='image'
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        className='cursor-pointer'
                        onChange={handleImageChange}
                      />
                      {imageValue && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={handleImageClear}
                          className='h-8 w-8 shrink-0'
                        >
                          <X className='w-3.5 h-3.5' />
                        </Button>
                      )}
                    </div>
                    <FieldDescription>
                      {isEdit
                        ? 'Leave empty to keep the current image'
                        : 'Optional. Accepted: JPEG, PNG, WebP'}
                    </FieldDescription>
                    {errors.image && (
                      <FieldError>{String(errors.image.message)}</FieldError>
                    )}
                  </Field>

                  <div
                    className={`
                      relative flex aspect-video items-center justify-center rounded-xl border
                      overflow-hidden transition-colors duration-200
                      ${
                        imagePreview
                          ? 'border-primary/30 bg-muted/30'
                          : 'border-dashed border-border bg-muted/30'
                      }
                    `}
                  >
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt='Category preview'
                        width={600}
                        height={600}
                        loading='lazy'
                        decoding='async'
                        className='max-h-full max-w-full object-contain'
                      />
                    ) : (
                      <div className='flex flex-col items-center gap-2 text-center px-4'>
                        <div className='w-9 h-9 rounded-xl bg-muted flex items-center justify-center'>
                          <Upload className='w-4 h-4 text-muted-foreground' />
                        </div>
                        <p className='text-xs text-muted-foreground'>
                          Image preview will appear here
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                {isEdit && keepImage && imagePreview && (
                  <p className='text-xs text-muted-foreground mt-2'>
                    Currently showing existing image. Select a new file to
                    replace it.
                  </p>
                )}
              </SectionBlock>
            </CardContent>
          </Card>

          <div className='flex flex-col gap-3 sm:flex-row pt-2'>
            <Button
              type='button'
              variant='outline'
              className='sm:flex-1 rounded-xl h-11'
              onClick={handleReset}
            >
              {isEdit ? 'Reset Changes' : 'Reset Form'}
            </Button>
            <Button
              type='submit'
              disabled={isPending}
              className='sm:flex-1 rounded-xl h-11 gap-2'
            >
              <Tag className='w-4 h-4' />
              {isEdit ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
