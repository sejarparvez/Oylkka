export type AppliedVoucher = {
  couponId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'CASHBACK';
  discountValue: number;
  discountAmount: number;
  shippingDiscount: number;
  freeShipping: boolean;
  cashbackAmount: number;
  scope: string;
  scopeId: string | null;
  tierUsed: string | null;
  bogoApplied: {
    freeItemProductId: string;
    buyQty: number;
    freeQty: number;
    freeItemPrice: number;
  } | null;
};

export type OrderMetadata = {
  appliedVouchers?: AppliedVoucher[];
  cashbackAmount?: number;
  bkashPaymentID?: string;
  bkashTrxID?: string;
  bkashRefundTrxID?: string;
  /**
   * Set once a COD order's vouchers/cashback side-effects have been settled
   * while marking an item delivered (MONEY-23).
   */
  vouchersSettledAt?: string;
};
