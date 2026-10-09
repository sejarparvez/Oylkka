export const QUERY_KEYS = {
  HERO_BANNER: 'hero-banner',
  ADMIN_BANNERS: 'admin-banners',
  CATEGORIES: 'categories',
  SHOPS: 'shops',
  PRODUCTS: 'products',
  PUBLIC_PRODUCTS: 'public-products',
  PRODUCT_QUESTIONS: 'product-questions',
  CART: 'cart',
  ORDERS: 'orders',
  VENDOR_ORDERS: 'vendor-orders',
  ADMIN_ORDERS: 'admin-orders',
  VOUCHERS: 'vouchers',
  WALLET: 'wallet',
  WISHLIST: 'wishlist',
  CONVERSATIONS: 'conversations',
  VENDOR_CONVERSATIONS: 'vendor-conversations',
  ADMIN_CONVERSATIONS: 'admin-conversations',
  MESSAGES: 'messages',
  ADMIN_DASHBOARD: 'admin-dashboard',
  ADMIN_COUPONS: 'admin-coupons',
  MY_REVIEWS: 'my-reviews',
  ADMIN_REVIEWS: 'admin-reviews',
  ADMIN_CUSTOMERS: 'admin-customers',
  RETURNS: 'returns',
  VENDOR_ANALYTICS: 'vendor-analytics',
  SHIPPING_ZONES: 'shipping-zones',
  SHOP_POLICIES: 'shop-policies',
  PAYOUT_DETAILS: 'payout-details',
  PAYOUTS: 'payouts',
  ADDRESSES: 'addresses',
  FOLLOWED_SHOPS: 'followed-shops',
  AUDIT_LOGS: 'audit-logs',
  ADMIN_SETTINGS: 'admin-settings',
  PUBLIC_SETTINGS: 'public-settings',
  GLOBAL_ATTRIBUTES: 'global-attributes',
  CONTENT_BLOCKS: 'content-blocks',
  ADMIN_GLOBAL_ATTRIBUTES: 'admin-global-attributes',
  VENDOR_QUESTIONS: 'vendor-questions',
};

/** Days after delivery a customer may request a return (CUST-02). */
export const RETURN_WINDOW_DAYS = 30;

/**
 * Maximum size for product and variant image uploads. FE-38: the client and
 * the server used different limits (500KB vs 2MB) on the same field, so files
 * between the two were rejected by the browser but not the API. The API limit
 * is authoritative — keep both on this single value.
 */
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_ACCEPTED_TYPES.join(',');
