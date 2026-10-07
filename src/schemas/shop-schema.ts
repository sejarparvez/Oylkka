import * as z from 'zod';

const BD_PHONE_PATTERN = /^(\+?8801|01)[3-9]\d{8}$/;

function isValidWebsite(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const BaseShopSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .refine((v) => !v || BD_PHONE_PATTERN.test(v.trim()), {
      message: 'Enter a valid Bangladeshi phone number',
    })
    .transform((v) => v.trim())
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .refine((v) => !v || isValidWebsite(v), {
      message: 'Website must be a valid http(s) URL',
    })
    .optional()
    .or(z.literal('')),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z
    .string()
    .refine((v) => !v || /^\d{4}$/.test(v.trim()), {
      message: 'Postal code must be a valid 4-digit BD postcode',
    })
    .transform((v) => v.trim())
    .optional()
    .or(z.literal('')),
});

const logoImageValidation = z
  .custom<FileList | null>()
  .refine(
    (files) =>
      !files ||
      files.length === 0 ||
      (files instanceof FileList &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(files[0]?.type)),
    { message: 'Image must be JPEG, PNG, or WEBP' },
  )
  .refine(
    (files) =>
      !files ||
      files.length === 0 ||
      (files instanceof FileList && files[0]?.size <= 2_097_152),
    { message: 'Image size must not exceed 2MB' },
  );

const bannerImageValidation = z
  .custom<FileList | null>()
  .refine(
    (files) =>
      !files ||
      files.length === 0 ||
      (files instanceof FileList &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(files[0]?.type)),
    { message: 'Image must be JPEG, PNG, or WEBP' },
  )
  .refine(
    (files) =>
      !files ||
      files.length === 0 ||
      (files instanceof FileList && files[0]?.size <= 2_097_152),
    { message: 'Image size must not exceed 2MB' },
  );

export const ShopApplicationFormSchema = BaseShopSchema.extend({
  logo: logoImageValidation,
  banner: bannerImageValidation,
});

export const EditShopFormSchema = BaseShopSchema.extend({
  logo: z.custom<FileList | null>().optional(),
  banner: z.custom<FileList | null>().optional(),
  hasExistingLogo: z.boolean().optional(),
  keepExistingLogo: z.boolean().optional(),
  hasExistingBanner: z.boolean().optional(),
  keepExistingBanner: z.boolean().optional(),
});

export const ShopApiSchema = BaseShopSchema.extend({
  shippingCost: z.coerce
    .number()
    .min(0, 'Shipping cost cannot be negative')
    .max(100000, 'Shipping cost is too high')
    .optional(),
});

export type ShopApplicationFormType = z.infer<typeof ShopApplicationFormSchema>;
export type EditShopFormType = z.infer<typeof EditShopFormSchema>;
