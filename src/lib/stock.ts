import type { prisma } from '@/lib/db';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function getVariantStatus(
  tx: PrismaTx,
  variantId: string,
): Promise<{ status: string; reservedStock: number; stock: number } | null> {
  return tx.productVariant.findUnique({
    where: { id: variantId },
    select: { status: true, reservedStock: true, stock: true },
  });
}

import type { prisma } from '@/lib/db';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function getVariantStatus(
  tx: PrismaTx,
  variantId: string,
): Promise<{ status: string; reservedStock: number; stock: number } | null> {
  return tx.productVariant.findUnique({
    where: { id: variantId },
    select: { status: true, reservedStock: true, stock: true },
  });
}

export async function reserveStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
  variantName: string,
): Promise<void> {
  const variant = await getVariantStatus(tx, variantId);
  if (!variant) {
    throw new Error(`Variant "${variantName}" not found`);
  }
  if (variant.status === 'DISABLED' || variant.status === 'DISCONTINUED') {
    throw new Error(
      `Variant "${variantName}" is ${variant.status.toLowerCase()}`,
    );
  }

  const available = variant.stock - variant.reservedStock;
  if (available < quantity) {
    throw new Error(
      `"${variantName}" has insufficient stock (${available} available)`,
    );
  }

  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: variant.reservedStock },
    data: { reservedStock: { increment: quantity } },
  });

  if (count === 0) {
    throw new Error(`"${variantName}" is out of stock`);
  }
}

export async function releaseReservedStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, reservedStock: { gte: quantity } },
    data: { reservedStock: { decrement: quantity } },
  });
  if (count === 0) return;
}

export async function decrementStock(
  tx: PrismaTx,
  productId: string,
  quantity: number,
  productName: string,
): Promise<void> {
  const { count } = await tx.product.updateMany({
    where: { id: productId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new Error(`"${productName}" is out of stock`);
  }
}

export async function decrementVariantStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
  variantName: string,
): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gte: quantity } },
    data: { stock: { decrement: quantity } },
  });

  if (count === 0) {
    throw new Error(`"${variantName}" is out of stock`);
  }
}

export async function incrementStock(
  tx: PrismaTx,
  productId: string,
  quantity: number,
): Promise<void> {
  await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: quantity } },
  });
}

export async function incrementVariantStock(
  tx: PrismaTx,
  variantId: string,
  quantity: number,
): Promise<void> {
  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { increment: quantity } },
  });
}
