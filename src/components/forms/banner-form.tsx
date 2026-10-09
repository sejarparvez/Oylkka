import { zodResolver } from '@hookform/resolvers/zod';
import {
  ImageIcon,
  LayoutTemplate,
  Megaphone,
  MousePointerClick,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import type * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DatetimePicker } from '@/components/ui/datetime-picker';
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
import { Textarea } from '@/components/ui/textarea';
import {
  BannerFormSchema,
  EditBannerFormSchema,
} from '@/schemas/banner-schema';
import { useBannerMutation, useEditBannerMutation } from '@/services/banner';

type BannerFormProps =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      bannerId: string;
      defaultValues: z.infer<typeof EditBannerFormSchema>;
      existingImageUrl: string;
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

export function BannerForm(props: BannerFormProps) {
  const isEdit = props.mode === 'edit';
  const [imagePreview, setImagePreview] = useState<string | null>(
    isEdit ? props.existingImageUrl : null,
  );
  const [keepImage, setKeepImage] = useState<boolean>(true);

  const schema = isEdit ? EditBannerFormSchema : BannerFormSchema;
  type BannerFormValues = z.infer<typeof BannerFormSchema> &
    z.infer<typeof EditBannerFormSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BannerFormValues>({
    // The schema switches between create/edit at runtime; both validate the
    // same BannerFormValues shape, so one honest resolver type covers both.
    resolver: zodResolver(schema) as unknown as Resolver<BannerFormValues>,
    defaultValues: (isEdit
      ? props.defaultValues
      : {
          title: '',
          subtitle: '',
          description: '',
          bannerTag: undefined,
          primaryActionText: '',
          primaryActionLink: '',
          secondaryActionText: '',
          secondaryActionLink: '',
          alignment: 'LEFT' as const,
          bannerPosition: 'HOME_TOP' as const,
          startDate: undefined,
          endDate: undefined,
          image: undefined,
        }) as BannerFormValues,
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const imageValue = watch('image');

  const createMutation = useBannerMutation();
  const editMutation = useEditBannerMutation();
  const isPending = isEdit ? editMutation.isPending : createMutation.isPending;

  const onSubmit = async (values: BannerFormValues) => {
    if (isEdit) {
      await editMutation.mutateAsync({
        ...values,
        id: props.bannerId,
        keepExistingImage: keepImage,
      });
    } else {
      await createMutation.mutateAsync(
        values as z.infer<typeof BannerFormSchema>,
      );
      reset();
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
      }
    }
  };

  const handleReset = () => {
    reset();
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      if (isEdit) {
        setImagePreview(props.existingImageUrl);
        setKeepImage(true);
      } else {
        setImagePreview(null);
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
      setImagePreview(props.existingImageUrl);
      setKeepImage(true);
    } else if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  return (
    <div className='max-w-4xl mx-auto container'>
      {/* Page header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='h-px w-8 bg-primary' />
          <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
            Admin
          </span>
        </div>
        <h1 className='text-3xl md:text-4xl font-bold tracking-tight leading-tight'>
          {isEdit ? 'Edit' : 'Create'}{' '}
          <span className='italic font-bold text-primary'>Banner</span>
          <span className='text-primary'>.</span>
        </h1>
        <p className='text-sm text-muted-foreground mt-2 leading-relaxed'>
          {isEdit
            ? 'Update your banner details and settings.'
            : 'Design a custom banner to display across your storefront.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        <FieldGroup>
          {/* Row 1: Content + Display Settings */}
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Banner Content */}
            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Megaphone} label='Banner Content'>
                  <div className='space-y-4'>
                    <Field data-invalid={!!errors.title}>
                      <FieldLabel htmlFor='title'>Title</FieldLabel>
                      <Input
                        id='title'
                        placeholder='Enter banner title'
                        aria-invalid={!!errors.title}
                        {...register('title')}
                      />
                      <FieldDescription>
                        The main heading of your banner
                      </FieldDescription>
                      {errors.title && (
                        <FieldError>{errors.title.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.subtitle}>
                      <FieldLabel htmlFor='subtitle'>Subtitle</FieldLabel>
                      <Input
                        id='subtitle'
                        placeholder='Add a subtitle (optional)'
                        aria-invalid={!!errors.subtitle}
                        {...register('subtitle')}
                      />
                      <FieldDescription>
                        Secondary text below the title
                      </FieldDescription>
                      {errors.subtitle && (
                        <FieldError>{errors.subtitle.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.description}>
                      <FieldLabel htmlFor='description'>Description</FieldLabel>
                      <Textarea
                        id='description'
                        placeholder='Describe your banner content'
                        className='min-h-24 resize-y'
                        aria-invalid={!!errors.description}
                        {...register('description')}
                      />
                      <FieldDescription>
                        Additional details to display on your banner
                      </FieldDescription>
                      {errors.description && (
                        <FieldError>{errors.description.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.bannerTag}>
                      <FieldLabel htmlFor='bannerTag'>Banner Tag</FieldLabel>
                      <Select
                        onValueChange={(val) =>
                          setValue(
                            'bannerTag',
                            val as 'PROMO' | 'INFO' | 'ANNOUNCEMENT',
                          )
                        }
                      >
                        <SelectTrigger
                          id='bannerTag'
                          aria-invalid={!!errors.bannerTag}
                        >
                          <SelectValue placeholder='Select a tag (optional)' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='PROMO'>Promo</SelectItem>
                          <SelectItem value='INFO'>Info</SelectItem>
                          <SelectItem value='ANNOUNCEMENT'>
                            Announcement
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        A highlighted tag to draw attention
                      </FieldDescription>
                      {errors.bannerTag && (
                        <FieldError>{errors.bannerTag.message}</FieldError>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={LayoutTemplate} label='Display Settings'>
                  <div className='space-y-4'>
                    <Field data-invalid={!!errors.alignment}>
                      <FieldLabel htmlFor='alignment'>
                        Content Alignment
                      </FieldLabel>
                      <Select
                        onValueChange={(val) =>
                          setValue(
                            'alignment',
                            val as 'LEFT' | 'CENTER' | 'RIGHT',
                          )
                        }
                        defaultValue='LEFT'
                      >
                        <SelectTrigger
                          id='alignment'
                          aria-invalid={!!errors.alignment}
                        >
                          <SelectValue placeholder='Choose alignment' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='LEFT'>Left</SelectItem>
                          <SelectItem value='CENTER'>Center</SelectItem>
                          <SelectItem value='RIGHT'>Right</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        How text and elements align within the banner
                      </FieldDescription>
                      {errors.alignment && (
                        <FieldError>{errors.alignment.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.bannerPosition}>
                      <FieldLabel htmlFor='bannerPosition'>
                        Banner Position
                      </FieldLabel>
                      <Select
                        onValueChange={(val) =>
                          setValue(
                            'bannerPosition',
                            val as 'HOME_TOP' | 'HOME_BOTTOM' | 'SIDEBAR',
                          )
                        }
                        defaultValue='HOME_TOP'
                      >
                        <SelectTrigger
                          id='bannerPosition'
                          aria-invalid={!!errors.bannerPosition}
                        >
                          <SelectValue placeholder='Select position' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='HOME_TOP'>
                            Home Page (Top)
                          </SelectItem>
                          <SelectItem value='HOME_BOTTOM'>
                            Home Page (Bottom)
                          </SelectItem>
                          <SelectItem value='SIDEBAR'>Sidebar</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldDescription>
                        Where the banner will appear on your site
                      </FieldDescription>
                      {errors.bannerPosition && (
                        <FieldError>{errors.bannerPosition.message}</FieldError>
                      )}
                    </Field>

                    {/* Schedule */}
                    <div className='space-y-1 pt-1'>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='h-px w-4 bg-primary/40' />
                        <span className='text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/60'>
                          Schedule
                        </span>
                      </div>

                      <Field data-invalid={!!errors.startDate}>
                        <FieldLabel>Start Date & Time</FieldLabel>
                        <div className='flex w-full items-center gap-2'>
                          <div className='flex-1'>
                            {startDate ? (
                              <DatetimePicker
                                value={startDate}
                                onChange={(val) => setValue('startDate', val)}
                                format={[
                                  ['months', 'days', 'years'],
                                  ['hours', 'minutes', 'am/pm'],
                                ]}
                              />
                            ) : (
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() =>
                                  setValue('startDate', new Date())
                                }
                                className='text-muted-foreground w-full justify-start text-left font-normal'
                              >
                                Click to set start date
                              </Button>
                            )}
                          </div>
                          {startDate && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => setValue('startDate', undefined)}
                              className='h-8 w-8 shrink-0'
                            >
                              <X className='w-3.5 h-3.5' />
                            </Button>
                          )}
                        </div>
                        <FieldDescription>
                          When the banner will start displaying (optional)
                        </FieldDescription>
                        {errors.startDate && (
                          <FieldError>{errors.startDate.message}</FieldError>
                        )}
                      </Field>

                      <Field data-invalid={!!errors.endDate}>
                        <FieldLabel>End Date & Time</FieldLabel>
                        <div className='flex w-full items-center gap-2'>
                          <div className='flex-1'>
                            {endDate ? (
                              <DatetimePicker
                                value={endDate}
                                onChange={(val) => setValue('endDate', val)}
                                format={[
                                  ['months', 'days', 'years'],
                                  ['hours', 'minutes', 'am/pm'],
                                ]}
                              />
                            ) : (
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() => setValue('endDate', new Date())}
                                className='text-muted-foreground w-full justify-start text-left font-normal'
                              >
                                Click to set end date
                              </Button>
                            )}
                          </div>
                          {endDate && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => setValue('endDate', undefined)}
                              className='h-8 w-8 shrink-0'
                            >
                              <X className='w-3.5 h-3.5' />
                            </Button>
                          )}
                        </div>
                        <FieldDescription>
                          When the banner will stop displaying (optional)
                        </FieldDescription>
                        {errors.endDate && (
                          <FieldError>{errors.endDate.message}</FieldError>
                        )}
                      </Field>
                    </div>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Call to Action */}
          <Card className='rounded-2xl border-border shadow-none'>
            <CardContent className='p-6'>
              <SectionBlock icon={MousePointerClick} label='Call to Action'>
                <div className='grid gap-6 md:grid-cols-2'>
                  {/* Primary */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <span className='w-1.5 h-1.5 rounded-full bg-primary' />
                      <span className='text-xs font-semibold text-foreground'>
                        Primary Button
                      </span>
                    </div>

                    <Field data-invalid={!!errors.primaryActionText}>
                      <FieldLabel htmlFor='primaryActionText'>
                        Button Text
                      </FieldLabel>
                      <Input
                        id='primaryActionText'
                        placeholder='E.g. Learn More, Shop Now'
                        {...register('primaryActionText')}
                      />
                      <FieldDescription>
                        Text for your main call-to-action button
                      </FieldDescription>
                      {errors.primaryActionText && (
                        <FieldError>
                          {errors.primaryActionText.message}
                        </FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.primaryActionLink}>
                      <FieldLabel htmlFor='primaryActionLink'>
                        Button Link
                      </FieldLabel>
                      <Input
                        id='primaryActionLink'
                        placeholder='https://yourshop.com/deals'
                        {...register('primaryActionLink')}
                      />
                      <FieldDescription>
                        Where users go when clicking the button
                      </FieldDescription>
                      {errors.primaryActionLink && (
                        <FieldError>
                          {errors.primaryActionLink.message}
                        </FieldError>
                      )}
                    </Field>
                  </div>

                  {/* Secondary */}
                  <div className='space-y-4'>
                    <div className='flex items-center gap-2'>
                      <span className='w-1.5 h-1.5 rounded-full bg-border' />
                      <span className='text-xs font-semibold text-muted-foreground'>
                        Secondary Button
                      </span>
                      <span className='text-[10px] font-medium bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full'>
                        Optional
                      </span>
                    </div>

                    <Field data-invalid={!!errors.secondaryActionText}>
                      <FieldLabel htmlFor='secondaryActionText'>
                        Button Text
                      </FieldLabel>
                      <Input
                        id='secondaryActionText'
                        placeholder='E.g. Contact Us, View Details'
                        {...register('secondaryActionText')}
                      />
                      <FieldDescription>
                        Text for an additional action button
                      </FieldDescription>
                      {errors.secondaryActionText && (
                        <FieldError>
                          {errors.secondaryActionText.message}
                        </FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.secondaryActionLink}>
                      <FieldLabel htmlFor='secondaryActionLink'>
                        Button Link
                      </FieldLabel>
                      <Input
                        id='secondaryActionLink'
                        placeholder='https://yourshop.com/contact'
                        {...register('secondaryActionLink')}
                      />
                      <FieldDescription>
                        Required if secondary button text is provided
                      </FieldDescription>
                      {errors.secondaryActionLink && (
                        <FieldError>
                          {errors.secondaryActionLink.message}
                        </FieldError>
                      )}
                    </Field>
                  </div>
                </div>
              </SectionBlock>
            </CardContent>
          </Card>

          {/* Row 3: Image Upload */}
          <Card className='rounded-2xl border-border shadow-none'>
            <CardContent className='p-6'>
              <SectionBlock icon={ImageIcon} label='Banner Image'>
                <div className='grid gap-6 md:grid-cols-2 items-start'>
                  {/* Upload control */}
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
                        : 'Accepted formats: JPEG, PNG, WebP'}
                    </FieldDescription>
                    {errors.image && (
                      <FieldError>{String(errors.image.message)}</FieldError>
                    )}
                  </Field>

                  {/* Preview */}
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
                        alt='Banner preview'
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

          {/* Form actions */}
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
              <Megaphone className='w-4 h-4' />
              {isEdit ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
