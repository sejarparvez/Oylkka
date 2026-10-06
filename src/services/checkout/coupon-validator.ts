export interface CouponValidationInput {
  isActive: boolean;
  expiresAt: Date | null;
  startsAt: Date | null;
  maxUses: number;
  usedCount: number;
  maxClaimCount: number;
  claimedCount: number;
  firstOrderOnly: boolean;
  repeatPurchaseOnly: boolean;
  requiredPaymentMethod: string | null;
  platformRestriction: string;
  minQuantity: number | null;
  minOrderAmount: number | null;
  scope: string;
  scopeId: string | null;
}

export interface CouponValidationContext {
  now: Date;
  subtotal: number;
  totalQty: number;
  cartItems: {
    productId: string;
    quantity: number;
    shopId?: string;
    categoryId?: string;
  }[];
  paymentMethod?: string;
  userAgent?: string;
  customerOrderCount: number;
}

export function checkCouponEligibility(
  coupon: CouponValidationInput,
  ctx: CouponValidationContext,
): string | null {
  if (!coupon.isActive) {
    return 'This coupon is no longer active';
  }

  if (coupon.expiresAt && coupon.expiresAt < ctx.now) {
    return 'This coupon has expired';
  }

  if (coupon.startsAt && coupon.startsAt > ctx.now) {
    return 'This coupon is not yet valid';
  }

  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return 'This coupon has reached its usage limit';
  }

  if (coupon.maxClaimCount > 0 && coupon.claimedCount >= coupon.maxClaimCount) {
    return 'This voucher is no longer available (all claimed)';
  }

  if (coupon.firstOrderOnly && ctx.customerOrderCount > 0) {
    return 'This coupon is for first-time buyers only';
  }

  if (coupon.repeatPurchaseOnly && ctx.customerOrderCount === 0) {
    return 'This coupon is for repeat customers only';
  }

  if (coupon.requiredPaymentMethod) {
    if (
      !ctx.paymentMethod ||
      ctx.paymentMethod !== coupon.requiredPaymentMethod
    ) {
      return `This coupon requires ${coupon.requiredPaymentMethod} payment`;
    }
  }

  if (coupon.platformRestriction !== 'ALL') {
    const isMobile =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        ctx.userAgent || '',
      );

    if (coupon.platformRestriction === 'MOBILE_ONLY' && !isMobile) {
      return 'This coupon is available on mobile app only';
    }

    if (coupon.platformRestriction === 'WEB_ONLY' && isMobile) {
      return 'This coupon is available on web only';
    }
  }

  if (coupon.minQuantity) {
    if (coupon.scope === 'PRODUCT' && coupon.scopeId) {
      const scopedQty = ctx.cartItems
        .filter((item) => item.productId === coupon.scopeId)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (scopedQty < coupon.minQuantity) {
        return `Need ${coupon.minQuantity} of this product (${scopedQty} in cart)`;
      }
    } else if (coupon.scope === 'SHOP' && coupon.scopeId) {
      const scopedQty = ctx.cartItems
        .filter((item) => item.shopId === coupon.scopeId)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (scopedQty < coupon.minQuantity) {
        return `Need ${coupon.minQuantity} items from this shop (${scopedQty} in cart)`;
      }
    } else if (coupon.scope === 'CATEGORY' && coupon.scopeId) {
      const scopedQty = ctx.cartItems
        .filter((item) => item.categoryId === coupon.scopeId)
        .reduce((sum, item) => sum + item.quantity, 0);

      if (scopedQty < coupon.minQuantity) {
        return `Need ${coupon.minQuantity} items from this category (${scopedQty} in cart)`;
      }
    } else {
      if (ctx.totalQty < coupon.minQuantity) {
        return `Minimum ${coupon.minQuantity} items required (${ctx.totalQty} in cart)`;
      }
    }
  }

  if (coupon.minOrderAmount && ctx.subtotal < coupon.minOrderAmount) {
    return `Minimum order amount is ৳${coupon.minOrderAmount.toLocaleString()}`;
  }

  return null;
}
