import { checkCouponEligibility } from './coupon-validator';
import {
  calculateDiscount,
  type DiscountCartItem,
} from './discount-calculator';

export interface VoucherWithCoupon {
  id: string;
  coupon: {
    id: string;
    code: string;
    type: string;
    value: number;
    maxDiscount: number | null;
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
    bogoBuyQty: number | null;
    bogoFreeQty: number | null;
    freeShipping: boolean;
    shippingDiscount: number;
    description: string | null;
    autoApply: boolean;
    tiers: { minQuantity: number; value: number; type?: string }[];
  };
}

export interface CartWithItems {
  id: string;
  items: {
    product: {
      id: string;
      price: number;
      discountPrice?: number | null;
      freeShipping?: boolean;
      categoryId?: string | null;
      shop?: { id: string } | null;
    };
    variant?: { price?: number; discountPrice?: number } | null;
    quantity: number;
    savedPrice?: number | null;
  }[];
}

export interface ProcessedVoucher {
  id: string;
  couponId: string;
  code: string;
  discountAmount: number;
  shippingDiscount: number;
  freeShipping: boolean;
  cashbackAmount: number;
  scope: string;
  scopeId: string | null;
  /** Carried through so the caller can enforce the cap in the database. */
  maxUses: number;
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

export interface VoucherProcessingOptions {
  paymentMethod: string;
  customerOrderCount: number;
  userAgent?: string;
}

export function processVouchers(
  userVouchers: VoucherWithCoupon[],
  cart: CartWithItems,
  subtotal: number,
  options: VoucherProcessingOptions,
): ProcessedVoucher[] {
  const now = new Date();
  const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);

  const globalCoupons: string[] = [];
  const shopCoupons = new Map<string, string>();
  const productCoupons = new Map<string, string>();
  const allCoupons: string[] = [];
  const categoryCoupons = new Map<string, string>();
  const userCoupons: string[] = [];

  const selectedVouchers: ProcessedVoucher[] = [];

  for (const uv of userVouchers) {
    const coupon = uv.coupon;

    // Stacking rules — check cheap scope limits first before expensive eligibility
    let stackingBlocked = false;
    if (coupon.scope === 'GLOBAL') {
      if (globalCoupons.length > 0) stackingBlocked = true;
    } else if (coupon.scope === 'SHOP' && coupon.scopeId) {
      if (shopCoupons.has(coupon.scopeId)) stackingBlocked = true;
    } else if (coupon.scope === 'PRODUCT' && coupon.scopeId) {
      if (productCoupons.has(coupon.scopeId)) stackingBlocked = true;
    } else if (coupon.scope === 'ALL') {
      if (allCoupons.length > 0) stackingBlocked = true;
    } else if (coupon.scope === 'CATEGORY' && coupon.scopeId) {
      if (categoryCoupons.has(coupon.scopeId)) stackingBlocked = true;
    } else if (coupon.scope === 'USER') {
      if (userCoupons.length > 0) stackingBlocked = true;
    }
    if (stackingBlocked) continue;

    // Eligibility check
    const error = checkCouponEligibility(coupon, {
      now,
      subtotal,
      totalQty,
      cartItems: cart.items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        shopId: i.product.shop?.id,
        categoryId: i.product.categoryId ?? undefined,
      })),
      paymentMethod: options.paymentMethod,
      userAgent: options.userAgent,
      customerOrderCount: options.customerOrderCount,
    });

    if (error) continue;

    // Mark stacking slot as taken now that eligibility passed
    if (coupon.scope === 'GLOBAL') {
      globalCoupons.push(coupon.id);
    } else if (coupon.scope === 'SHOP' && coupon.scopeId) {
      shopCoupons.set(coupon.scopeId, coupon.id);
    } else if (coupon.scope === 'PRODUCT' && coupon.scopeId) {
      productCoupons.set(coupon.scopeId, coupon.id);
    } else if (coupon.scope === 'ALL') {
      allCoupons.push(coupon.id);
    } else if (coupon.scope === 'CATEGORY' && coupon.scopeId) {
      categoryCoupons.set(coupon.scopeId, coupon.id);
    } else if (coupon.scope === 'USER') {
      userCoupons.push(coupon.id);
    }

    // Compute scoped subtotal
    const effectiveScopeId = coupon.scopeId;
    const scopedItems = cart.items.filter(
      (item) =>
        !effectiveScopeId ||
        item.product.id === effectiveScopeId ||
        item.product.shop?.id === effectiveScopeId ||
        item.product.categoryId === effectiveScopeId,
    );
    const scopedSubtotal = scopedItems.reduce(
      (s, item) => s + (item.savedPrice ?? item.product.price) * item.quantity,
      0,
    );

    const discountItems: DiscountCartItem[] = scopedItems.map((item) => ({
      productId: item.product.id,
      shopId: item.product.shop?.id ?? undefined,
      categoryId: item.product.categoryId ?? undefined,
      // Variants carry their own price; falling back to the parent product
      // price here mis-prices BOGO free items when a variant overrides it.
      price: item.variant?.price ?? item.product.price,
      discountPrice:
        item.variant?.discountPrice ?? item.product.discountPrice ?? undefined,
      quantity: item.quantity,
    }));

    const result = calculateDiscount(
      coupon,
      discountItems,
      scopedSubtotal,
      totalQty,
    );

    selectedVouchers.push({
      id: uv.id,
      couponId: coupon.id,
      code: coupon.code,
      discountAmount: Math.max(0, result.discountAmount),
      shippingDiscount: coupon.shippingDiscount || 0,
      freeShipping: coupon.freeShipping,
      cashbackAmount: Math.max(0, result.cashbackAmount),
      scope: coupon.scope,
      scopeId: effectiveScopeId,
      maxUses: coupon.maxUses,
      tierUsed: result.tierUsed,
      bogoApplied: result.bogoApplied,
    });
  }

  return selectedVouchers;
}

export function applyShippingDiscounts(
  selectedVouchers: ProcessedVoucher[],
  baseShipping: number,
): number {
  let finalShipping = baseShipping;

  if (selectedVouchers.some((v) => v.freeShipping)) {
    finalShipping = 0;
  } else {
    for (const v of selectedVouchers) {
      finalShipping = Math.max(0, finalShipping - v.shippingDiscount);
    }
  }

  return finalShipping;
}

export function sumVoucherTotals(selectedVouchers: ProcessedVoucher[]): {
  totalCouponDiscount: number;
  totalCashback: number;
} {
  let totalCouponDiscount = 0;
  let totalCashback = 0;

  for (const v of selectedVouchers) {
    totalCouponDiscount += v.discountAmount;
    totalCashback += v.cashbackAmount;
  }

  return { totalCouponDiscount, totalCashback };
}
