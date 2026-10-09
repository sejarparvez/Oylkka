import { z } from 'zod';
import { BD_DISTRICTS } from '@/lib/bd-districts';
import { prisma } from '@/lib/db';

const DISTRICTS = new Set<string>(BD_DISTRICTS);

export const BD_PHONE_PATTERN = /^(\+?8801|01)[3-9]\d{8}$/;

export const AddressFormSchema = z.object({
  label: z.string().trim().max(40).optional().or(z.literal('')),
  name: z.string().trim().min(1).max(100),
  phone: z.string().refine((v) => BD_PHONE_PATTERN.test(v.trim()), {
    message: 'Enter a valid Bangladeshi phone number',
  }),
  address: z.string().trim().min(1).max(255),
  upzila: z.string().trim().min(1).max(60),
  district: z.string().refine((v) => DISTRICTS.has(v), {
    message: 'Select a valid Bangladesh district',
  }),
  postalCode: z
    .string()
    .regex(/^\d{4}$/)
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Ensures the account never ends up with zero default addresses (MONEY-57).
 * Called after editing or deleting an address; promotes the oldest remaining
 * address when no default is set.
 */
export async function promoteDefaultAddress(userId: string): Promise<void> {
  const remaining = await prisma.userAddress.findFirst({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  if (remaining) return;

  const oldest = await prisma.userAddress.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!oldest) return;

  await prisma.userAddress.update({
    where: { id: oldest.id },
    data: { isDefault: true },
  });
}
