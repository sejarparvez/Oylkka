import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  ImageIcon,
  MapPin,
  Phone,
  Store,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  EditShopFormSchema,
  ShopApplicationFormSchema,
} from '@/schemas/shop-schema';
import { useApplyShopMutation, useUpdateShopMutation } from '@/services/shop';

type ShopFormProps =
  | {
      mode: 'create';
    }
  | {
      mode: 'edit';
      shopId: string;
      defaultValues: z.infer<typeof EditShopFormSchema> & {
        existingLogoUrl?: string;
        existingBannerUrl?: string;
      };
      onSuccess?: () => void;
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

export function ShopForm(props: ShopFormProps) {
  const isEdit = props.mode === 'edit';
  const [logoPreview, setLogoPreview] = useState<string | null>(
    isEdit ? (props.defaultValues.existingLogoUrl ?? null) : null,
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    isEdit ? (props.defaultValues.existingBannerUrl ?? null) : null,
  );
  const [keepLogo, setKeepLogo] = useState<boolean>(true);
  const [keepBanner, setKeepBanner] = useState<boolean>(true);

  const schema = isEdit ? EditShopFormSchema : ShopApplicationFormSchema;
  type FormValues = z.input<typeof ShopApplicationFormSchema> &
    z.input<typeof EditShopFormSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: (isEdit
      ? props.defaultValues
      : {
          name: '',
          description: '',
          email: '',
          phone: '',
          website: '',
          addressLine1: '',
          addressLine2: '',
          city: '',
          state: '',
          country: '',
          postalCode: '',
          logo: undefined,
          banner: undefined,
        }) as FormValues,
  });

  const logoValue = watch('logo');
  const bannerValue = watch('banner');

  const createMutation = useApplyShopMutation();
  const updateMutation = useUpdateShopMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: FormValues) => {
    if (!isEdit) {
      await createMutation.mutateAsync(values);
      reset();
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
        setLogoPreview(null);
      }
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
        setBannerPreview(null);
      }
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('description', values.description ?? '');
    formData.append('email', values.email);
    formData.append('phone', values.phone ?? '');
    formData.append('website', values.website ?? '');
    formData.append('addressLine1', values.addressLine1 ?? '');
    formData.append('addressLine2', values.addressLine2 ?? '');
    formData.append('city', values.city ?? '');
    formData.append('state', values.state ?? '');
    formData.append('country', values.country ?? '');
    formData.append('postalCode', values.postalCode ?? '');

    if (values.logo instanceof FileList && values.logo.length > 0) {
      formData.append('logo', values.logo[0]);
    } else {
      formData.append('keepExistingLogo', keepLogo ? 'true' : 'false');
    }

    if (values.banner instanceof FileList && values.banner.length > 0) {
      formData.append('banner', values.banner[0]);
    } else {
      formData.append('keepExistingBanner', keepBanner ? 'true' : 'false');
    }

    await updateMutation.mutateAsync(formData);
    props.onSuccess?.();
  };

  const handleReset = () => {
    reset();
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
      if (isEdit) {
        setLogoPreview(props.defaultValues.existingLogoUrl ?? null);
        setKeepLogo(true);
      } else {
        setLogoPreview(null);
      }
    }
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
      if (isEdit) {
        setBannerPreview(props.defaultValues.existingBannerUrl ?? null);
        setKeepBanner(true);
      } else {
        setBannerPreview(null);
      }
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'banner',
  ) => {
    const files = e.target.files;
    if (files?.length) {
      setValue(type, files);
      if (type === 'logo') {
        if (logoPreview && !keepLogo) {
          URL.revokeObjectURL(logoPreview);
        }
        setLogoPreview(URL.createObjectURL(files[0]));
        if (isEdit) setKeepLogo(false);
      } else {
        if (bannerPreview && !keepBanner) {
          URL.revokeObjectURL(bannerPreview);
        }
        setBannerPreview(URL.createObjectURL(files[0]));
        if (isEdit) setKeepBanner(false);
      }
    } else {
      setValue(type, null);
      if (type === 'logo') {
        if (logoPreview && !isEdit) {
          URL.revokeObjectURL(logoPreview);
          setLogoPreview(null);
        }
      } else {
        if (bannerPreview && !isEdit) {
          URL.revokeObjectURL(bannerPreview);
          setBannerPreview(null);
        }
      }
    }
  };

  const handleImageClear = (type: 'logo' | 'banner') => {
    setValue(type, null);
    if (type === 'logo') {
      if (logoPreview && isEdit) {
        setLogoPreview(props.defaultValues.existingLogoUrl ?? null);
        setKeepLogo(true);
      } else if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
        setLogoPreview(null);
      }
    } else {
      if (bannerPreview && isEdit) {
        setBannerPreview(props.defaultValues.existingBannerUrl ?? null);
        setKeepBanner(true);
      } else if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
        setBannerPreview(null);
      }
    }
  };

  return (
    <div className='max-w-4xl mx-auto container'>
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='h-px w-8 bg-primary' />
          <span className='text-xs font-semibold tracking-[0.18em] uppercase text-primary'>
            Vendor
          </span>
        </div>
        <h1 className='text-3xl md:text-4xl font-bold tracking-tight leading-tight'>
          {isEdit ? 'Edit' : 'Open a'}{' '}
          <span className='italic font-bold text-primary'>Shop</span>
          <span className='text-primary'>.</span>
        </h1>
        <p className='text-sm text-muted-foreground mt-2 leading-relaxed'>
          {isEdit
            ? 'Update your shop details.'
            : 'Submit your application to become a vendor.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        <FieldGroup>
          <div className='grid gap-6 md:grid-cols-2'>
            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Store} label='Basic Info'>
                  <div className='space-y-4'>
                    <Field data-invalid={!!errors.name}>
                      <FieldLabel htmlFor='name'>Shop Name</FieldLabel>
                      <Input
                        id='name'
                        placeholder='Enter your shop name'
                        aria-invalid={!!errors.name}
                        {...register('name')}
                      />
                      <FieldDescription>
                        The public name for your shop
                      </FieldDescription>
                      {errors.name && (
                        <FieldError>{errors.name.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.description}>
                      <FieldLabel htmlFor='description'>Description</FieldLabel>
                      <Textarea
                        id='description'
                        placeholder='Describe your shop (optional)'
                        className='min-h-24 resize-y'
                        aria-invalid={!!errors.description}
                        {...register('description')}
                      />
                      <FieldDescription>
                        Brief description of what your shop sells
                      </FieldDescription>
                      {errors.description && (
                        <FieldError>{errors.description.message}</FieldError>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Phone} label='Contact'>
                  <div className='space-y-4'>
                    <Field data-invalid={!!errors.email}>
                      <FieldLabel htmlFor='email'>Email</FieldLabel>
                      <Input
                        id='email'
                        type='email'
                        placeholder='shop@example.com'
                        aria-invalid={!!errors.email}
                        {...register('email')}
                      />
                      <FieldDescription>
                        Contact email for customer inquiries
                      </FieldDescription>
                      {errors.email && (
                        <FieldError>{errors.email.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.phone}>
                      <FieldLabel htmlFor='phone'>Phone</FieldLabel>
                      <Input
                        id='phone'
                        type='tel'
                        placeholder='+1 (555) 123-4567'
                        aria-invalid={!!errors.phone}
                        {...register('phone')}
                      />
                      <FieldDescription>Optional phone number</FieldDescription>
                      {errors.phone && (
                        <FieldError>{errors.phone.message}</FieldError>
                      )}
                    </Field>

                    <Field data-invalid={!!errors.website}>
                      <FieldLabel htmlFor='website'>Website</FieldLabel>
                      <Input
                        id='website'
                        type='url'
                        placeholder='https://myshop.com'
                        aria-invalid={!!errors.website}
                        {...register('website')}
                      />
                      <FieldDescription>Optional website URL</FieldDescription>
                      {errors.website && (
                        <FieldError>{errors.website.message}</FieldError>
                      )}
                    </Field>
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>
          </div>

          <Card className='rounded-2xl border-border shadow-none'>
            <CardContent className='p-6'>
              <SectionBlock icon={MapPin} label='Address'>
                <div className='grid gap-6 md:grid-cols-2'>
                  <Field data-invalid={!!errors.addressLine1}>
                    <FieldLabel htmlFor='addressLine1'>
                      Address Line 1
                    </FieldLabel>
                    <Input
                      id='addressLine1'
                      placeholder='Street address'
                      aria-invalid={!!errors.addressLine1}
                      {...register('addressLine1')}
                    />
                    {errors.addressLine1 && (
                      <FieldError>{errors.addressLine1.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.addressLine2}>
                    <FieldLabel htmlFor='addressLine2'>
                      Address Line 2
                    </FieldLabel>
                    <Input
                      id='addressLine2'
                      placeholder='Apt, Suite, etc.'
                      aria-invalid={!!errors.addressLine2}
                      {...register('addressLine2')}
                    />
                    {errors.addressLine2 && (
                      <FieldError>{errors.addressLine2.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.city}>
                    <FieldLabel htmlFor='city'>City</FieldLabel>
                    <Input
                      id='city'
                      placeholder='City'
                      aria-invalid={!!errors.city}
                      {...register('city')}
                    />
                    {errors.city && (
                      <FieldError>{errors.city.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.state}>
                    <FieldLabel htmlFor='state'>State</FieldLabel>
                    <Input
                      id='state'
                      placeholder='State / Province'
                      aria-invalid={!!errors.state}
                      {...register('state')}
                    />
                    {errors.state && (
                      <FieldError>{errors.state.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.country}>
                    <FieldLabel htmlFor='country'>Country</FieldLabel>
                    <Input
                      id='country'
                      placeholder='Country'
                      aria-invalid={!!errors.country}
                      {...register('country')}
                    />
                    {errors.country && (
                      <FieldError>{errors.country.message}</FieldError>
                    )}
                  </Field>

                  <Field data-invalid={!!errors.postalCode}>
                    <FieldLabel htmlFor='postalCode'>Postal Code</FieldLabel>
                    <Input
                      id='postalCode'
                      placeholder='Postal / ZIP code'
                      aria-invalid={!!errors.postalCode}
                      {...register('postalCode')}
                    />
                    {errors.postalCode && (
                      <FieldError>{errors.postalCode.message}</FieldError>
                    )}
                  </Field>
                </div>
              </SectionBlock>
            </CardContent>
          </Card>

          <div className='grid gap-6 md:grid-cols-2'>
            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={Building2} label='Logo'>
                  <div className='grid gap-6 items-start'>
                    <Field data-invalid={!!errors.logo}>
                      <FieldLabel htmlFor='logo'>Upload Logo</FieldLabel>
                      <div className='flex items-center gap-2'>
                        <Input
                          id='logo'
                          type='file'
                          accept='image/jpeg,image/png,image/webp'
                          className='cursor-pointer'
                          onChange={(e) => handleImageChange(e, 'logo')}
                        />
                        {logoValue && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => handleImageClear('logo')}
                            className='h-8 w-8 shrink-0'
                          >
                            <X className='w-3.5 h-3.5' />
                          </Button>
                        )}
                      </div>
                      <FieldDescription>
                        {isEdit
                          ? 'Leave empty to keep current logo'
                          : 'Optional. Accepted: JPEG, PNG, WebP'}
                      </FieldDescription>
                      {errors.logo && (
                        <FieldError>{String(errors.logo.message)}</FieldError>
                      )}
                    </Field>

                    <div
                      className={`
                        relative flex aspect-square items-center justify-center rounded-xl border
                        overflow-hidden transition-colors duration-200 max-w-48
                        ${
                          logoPreview
                            ? 'border-primary/30 bg-muted/30'
                            : 'border-dashed border-border bg-muted/30'
                        }
                      `}
                    >
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt='Shop logo preview'
                          className='max-h-full max-w-full object-contain'
                        />
                      ) : (
                        <div className='flex flex-col items-center gap-2 text-center px-4'>
                          <div className='w-9 h-9 rounded-xl bg-muted flex items-center justify-center'>
                            <Upload className='w-4 h-4 text-muted-foreground' />
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Logo preview
                          </p>
                        </div>
                      )}
                    </div>
                    {isEdit && keepLogo && logoPreview && (
                      <p className='text-xs text-muted-foreground'>
                        Currently showing existing logo. Select a new file to
                        replace it.
                      </p>
                    )}
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>

            <Card className='rounded-2xl border-border shadow-none'>
              <CardContent className='p-6'>
                <SectionBlock icon={ImageIcon} label='Banner'>
                  <div className='grid gap-6 items-start'>
                    <Field data-invalid={!!errors.banner}>
                      <FieldLabel htmlFor='banner'>Upload Banner</FieldLabel>
                      <div className='flex items-center gap-2'>
                        <Input
                          id='banner'
                          type='file'
                          accept='image/jpeg,image/png,image/webp'
                          className='cursor-pointer'
                          onChange={(e) => handleImageChange(e, 'banner')}
                        />
                        {bannerValue && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => handleImageClear('banner')}
                            className='h-8 w-8 shrink-0'
                          >
                            <X className='w-3.5 h-3.5' />
                          </Button>
                        )}
                      </div>
                      <FieldDescription>
                        {isEdit
                          ? 'Leave empty to keep current banner'
                          : 'Optional. Accepted: JPEG, PNG, WebP'}
                      </FieldDescription>
                      {errors.banner && (
                        <FieldError>{String(errors.banner.message)}</FieldError>
                      )}
                    </Field>

                    <div
                      className={`
                        relative flex aspect-video items-center justify-center rounded-xl border
                        overflow-hidden transition-colors duration-200
                        ${
                          bannerPreview
                            ? 'border-primary/30 bg-muted/30'
                            : 'border-dashed border-border bg-muted/30'
                        }
                      `}
                    >
                      {bannerPreview ? (
                        <img
                          src={bannerPreview}
                          alt='Shop banner preview'
                          className='max-h-full max-w-full object-contain'
                        />
                      ) : (
                        <div className='flex flex-col items-center gap-2 text-center px-4'>
                          <div className='w-9 h-9 rounded-xl bg-muted flex items-center justify-center'>
                            <Upload className='w-4 h-4 text-muted-foreground' />
                          </div>
                          <p className='text-xs text-muted-foreground'>
                            Banner preview
                          </p>
                        </div>
                      )}
                    </div>
                    {isEdit && keepBanner && bannerPreview && (
                      <p className='text-xs text-muted-foreground'>
                        Currently showing existing banner. Select a new file to
                        replace it.
                      </p>
                    )}
                  </div>
                </SectionBlock>
              </CardContent>
            </Card>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row pt-2'>
            <Button
              type='button'
              variant='outline'
              className='sm:flex-1 rounded-xl h-11'
              onClick={handleReset}
            >
              Reset Form
            </Button>
            <Button
              type='submit'
              disabled={isPending}
              className='sm:flex-1 rounded-xl h-11 gap-2'
            >
              <Store className='w-4 h-4' />
              {isEdit ? 'Update Shop' : 'Submit Application'}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
