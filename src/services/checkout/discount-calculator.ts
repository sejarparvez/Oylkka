export interface DiscountCartItem {
  productId: string;
  shopId?: string;
  categoryId?: string;
  price: number;
  discountPrice?: number;
  quantity: number;
}

export interface DiscountResult {
  discountAmount: number;
  cashbackAmount: number;
  tierUsed: {
    minQuantity: number;
    value: number;
    type?: string;
  } | null;
  bogoApplied: {
    buyQty: number;
    freeQty: number;
    freeItemPrice: number;
  } | null;
}

export function calculateDiscount(
  coupon: {
    type: string;
    value: number;
    maxDiscount: number | null;
    tiers: { minQuantity: number; value: number; type?: string }[];
    bogoBuyQty: number | null;
    bogoFreeQty: number | null;
    scope: string;
    scopeId: string | null;
  },
  items: DiscountCartItem[],
  subtotal: number,
  totalQty: number,
): DiscountResult {
  let discountAmount = 0;
  let cashbackAmount = 0;
  let tierUsed = null;
  let bogoApplied = null;

  if (coupon.tiers.length > 0) {
    const matchingTier = [...coupon.tiers]
      .reverse()
      .find((t) => totalQty >= t.minQuantity);

    if (matchingTier) {
      const tierType = matchingTier.type || coupon.type;
      if (tierType === 'PERCENTAGE') {
        discountAmount = (subtotal * matchingTier.value) / 100;
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount);
        }
      } else if (tierType === 'FIXED') {
        discountAmount = Math.min(matchingTier.value, subtotal);
      } else if (tierType === 'CASHBACK') {
        cashbackAmount = (subtotal * matchingTier.value) / 100;
        if (coupon.maxDiscount) {
          cashbackAmount = Math.min(cashbackAmount, coupon.maxDiscount);
        }
      }

      tierUsed = {
        minQuantity: matchingTier.minQuantity,
        value: matchingTier.value,
        type: tierType,
      };
    }
  }

  if (!tierUsed) {
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else if (coupon.type === 'FIXED') {
      discountAmount = Math.min(coupon.value, subtotal);
    } else if (coupon.type === 'CASHBACK') {
      cashbackAmount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount) {
        cashbackAmount = Math.min(cashbackAmount, coupon.maxDiscount);
      }
    }
  }

  if (coupon.bogoBuyQty && coupon.bogoFreeQty) {
    const effectiveScopeId = coupon.scopeId;
    const scopedItems = effectiveScopeId
      ? items.filter(
          (item) =>
            item.productId === effectiveScopeId ||
            item.shopId === effectiveScopeId ||
            item.categoryId === effectiveScopeId,
        )
      : items;

    const totalScopedQty = scopedItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    if (totalScopedQty >= coupon.bogoBuyQty) {
      const freeBatches = Math.floor(totalScopedQty / coupon.bogoBuyQty);
      const maxFreeItems = freeBatches * coupon.bogoFreeQty;

      const sortedByPrice = [...scopedItems].sort(
        (a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price),
      );

      let remainingFree = maxFreeItems;
      let totalFreeValue = 0;
      for (const item of sortedByPrice) {
        if (remainingFree <= 0) break;
        const take = Math.min(remainingFree, item.quantity);
        totalFreeValue += take * (item.discountPrice ?? item.price);
        remainingFree -= take;
      }

      discountAmount += totalFreeValue;
      bogoApplied = {
        buyQty: coupon.bogoBuyQty,
        freeQty: coupon.bogoFreeQty * freeBatches,
        freeItemPrice: totalFreeValue,
      };
    }
  }

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    cashbackAmount: Math.round(cashbackAmount * 100) / 100,
    tierUsed,
    bogoApplied,
  };
}
