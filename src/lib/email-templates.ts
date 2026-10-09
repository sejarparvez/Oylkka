import { RETURN_WINDOW_DAYS } from '@/lib/constants';

const BRAND = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  background: '#f4f4f5',
  card: '#ffffff',
  foreground: '#18181b',
  mutedForeground: '#71717a',
  border: '#e4e4e7',
  destructive: '#ef4444',
};

function brandHeader(): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
      <tr>
        <td style="width: 32px; height: 32px; background: ${BRAND.primary}; border-radius: 8px; text-align: center; line-height: 32px; font-size: 16px;">
          🛍️
        </td>
        <td style="padding-left: 10px;">
          <span style="font-size: 18px; font-weight: 700; letter-spacing: -0.02em; color: ${BRAND.foreground};">Oylkka</span>
        </td>
      </tr>
    </table>
  `;
}

function brandFooter(): string {
  return `
    <table cellpadding="0" cellspacing="0" style="width: 100%; border-top: 1px solid ${BRAND.border}; padding-top: 24px; margin-top: 32px;">
      <tr>
        <td style="text-align: center; padding-bottom: 8px;">
          <span style="font-size: 11px; color: ${BRAND.mutedForeground};">
            Secure Checkout
          </span>
          <span style="color: ${BRAND.primary}; font-size: 11px; padding: 0 6px;">·</span>
          <span style="font-size: 11px; color: ${BRAND.mutedForeground};">
            Approved Sellers
          </span>
          <span style="color: ${BRAND.primary}; font-size: 11px; padding: 0 6px;">·</span>
          <span style="font-size: 11px; color: ${BRAND.mutedForeground};">
            ${RETURN_WINDOW_DAYS}-Day Returns
          </span>
          <span style="color: ${BRAND.primary}; font-size: 11px; padding: 0 6px;">·</span>
          <span style="font-size: 11px; color: ${BRAND.mutedForeground};">
            Nationwide Delivery
          </span>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 8px;">
          <span style="font-size: 11px; color: ${BRAND.mutedForeground};">
            © ${new Date().getFullYear()} Oylkka. All rights reserved.
          </span>
        </td>
      </tr>
    </table>
  `;
}

function baseWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Helvetica Neue', Arial, sans-serif;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; padding: 40px 20px;">
        <tr>
          <td>
            ${brandHeader()}
            <table cellpadding="0" cellspacing="0" style="width: 100%; background: ${BRAND.card}; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>
            </table>
            ${brandFooter()}
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function eyebrow(label: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
      <tr>
        <td style="width: 32px; height: 1px; background: ${BRAND.primary};"></td>
        <td style="padding-left: 12px;">
          <span style="font-size: 11px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: ${BRAND.primary};">
            ${label}
          </span>
        </td>
      </tr>
    </table>
  `;
}

function ctaButton(text: string, link: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin-top: 24px;">
      <tr>
        <td style="background: ${BRAND.primary}; border-radius: 8px; text-align: center;">
          <a href="${link}" style="display: inline-block; padding: 12px 28px; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

type EmailOrderItem = {
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

type EmailOrderData = {
  orderNumber: string;
  customerName: string;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  currency: string;
  items: EmailOrderItem[];
};

export function orderConfirmationHtml(order: EmailOrderData): string {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid ${BRAND.border};">
        <td style="padding: 12px 0; width: 48px;">
          ${
            item.imageUrl
              ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" />`
              : `<div style="width: 40px; height: 40px; border-radius: 8px; background: ${BRAND.background};"></div>`
          }
        </td>
        <td style="padding: 12px 8px;">
          <span style="font-size: 13px; font-weight: 600; color: ${BRAND.foreground};">
            ${item.productName}
          </span>
          ${item.variantName ? `<br /><span style="font-size: 11px; color: ${BRAND.mutedForeground};">${item.variantName}</span>` : ''}
        </td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; color: ${BRAND.mutedForeground};">
          ${item.quantity}
        </td>
        <td style="padding: 12px 0; text-align: right; font-size: 13px; font-weight: 700; color: ${BRAND.foreground}; white-space: nowrap;">
          ৳${item.total.toLocaleString('en-BD')}
        </td>
      </tr>
    `,
    )
    .join('');

  const shippingDisplay =
    order.shippingCost > 0
      ? `৳${order.shippingCost.toLocaleString('en-BD')}`
      : 'Free';

  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/orders/${order.orderNumber}`;

  return baseWrapper(`
    ${eyebrow('Order Confirmation')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Thanks for your order<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${order.customerName}, your order <strong style="color: ${BRAND.foreground};">#${order.orderNumber}</strong> has been placed and is being processed.
    </p>

    <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid ${BRAND.border};">
          <th style="padding: 8px 0; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.mutedForeground};">Item</th>
          <th style="padding: 8px 0; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.mutedForeground};"></th>
          <th style="padding: 8px 0; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.mutedForeground};">Qty</th>
          <th style="padding: 8px 0; text-align: right; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${BRAND.mutedForeground};">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 16px; border-top: 1px solid ${BRAND.border}; padding-top: 16px;">
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground};">Subtotal</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; color: ${BRAND.foreground}; font-weight: 500;">৳${order.subtotal.toLocaleString('en-BD')}</td>
      </tr>
      ${
        order.discountAmount > 0
          ? `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground};">Discount</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; color: ${BRAND.destructive}; font-weight: 500;">-৳${order.discountAmount.toLocaleString('en-BD')}</td>
      </tr>
      `
          : ''
      }
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground};">Shipping</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; color: ${BRAND.foreground}; font-weight: 500;">${shippingDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 12px 0 4px; border-top: 2px solid ${BRAND.border}; font-size: 15px; font-weight: 700; color: ${BRAND.foreground};">Total</td>
        <td style="padding: 12px 0 4px; border-top: 2px solid ${BRAND.border}; text-align: right; font-size: 15px; font-weight: 700; color: ${BRAND.foreground};">৳${order.total.toLocaleString('en-BD')}</td>
      </tr>
    </table>

    ${ctaButton('View Order', orderLink)}

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin-top: 24px; line-height: 1.5;">
      You'll receive a shipping confirmation with tracking details once your items are on the way.
    </p>
  `);
}

type EmailShippedItem = {
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  quantity: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

export function orderShippedHtml(
  order: { orderNumber: string; customerName: string },
  item: EmailShippedItem,
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/orders/${order.orderNumber}`;
  const trackLink = item.trackingUrl || orderLink;

  return baseWrapper(`
    ${eyebrow('Shipping Update')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Your item is on the way<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${order.customerName}, good news! One of your items from order <strong style="color: ${BRAND.foreground};">#${order.orderNumber}</strong> has been shipped.
    </p>

    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 1px solid ${BRAND.border}; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 56px; vertical-align: top;">
                ${
                  item.imageUrl
                    ? `<img src="${item.imageUrl}" alt="${item.productName}" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" />`
                    : `<div style="width: 48px; height: 48px; border-radius: 8px; background: ${BRAND.background};"></div>`
                }
              </td>
              <td style="padding-left: 12px; vertical-align: top;">
                <span style="font-size: 14px; font-weight: 600; color: ${BRAND.foreground};">
                  ${item.productName}
                </span>
                ${item.variantName ? `<br /><span style="font-size: 12px; color: ${BRAND.mutedForeground};">${item.variantName}</span>` : ''}
                <br /><span style="font-size: 12px; color: ${BRAND.mutedForeground};">Qty: ${item.quantity}</span>
                ${item.trackingNumber ? `<br /><span style="font-size: 12px; color: ${BRAND.mutedForeground};">Tracking: ${item.trackingNumber}</span>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('Track Package', trackLink)}

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin-top: 24px; line-height: 1.5;">
      You can also <a href="${orderLink}" style="color: ${BRAND.primary}; text-decoration: underline;">view your full order</a> for more details.
    </p>
  `);
}

export function vendorApprovalHtml(name: string, shopName: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const dashboardLink = `${baseUrl}/dashboard/vendor`;

  return baseWrapper(`
    ${eyebrow('Shop Approved')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Your shop is live<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, congratulations! Your shop <strong style="color: ${BRAND.foreground};">${shopName}</strong> has been approved and is now visible to customers.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Start adding products and managing your orders from the vendor dashboard.
    </p>

    ${ctaButton('Go to Dashboard', dashboardLink)}
  `);
}

export function vendorRejectionHtml(
  name: string,
  shopName: string,
  reason: string,
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const contactLink = `${baseUrl}/contact`;

  return baseWrapper(`
    ${eyebrow('Shop Update')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Shop application update<span style="color: ${BRAND.destructive};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, unfortunately your shop <strong style="color: ${BRAND.foreground};">${shopName}</strong> could not be approved at this time.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      <strong>Reason:</strong> ${reason}
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      You may re-apply after addressing the above concerns. If you have questions, feel free to reach out.
    </p>

    ${ctaButton('Contact Support', contactLink)}
  `);
}

export function vendorSuspensionHtml(
  name: string,
  shopName: string,
  reason: string,
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const contactLink = `${baseUrl}/contact`;

  return baseWrapper(`
    ${eyebrow('Shop Suspended')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Your shop has been suspended<span style="color: ${BRAND.destructive};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, your shop <strong style="color: ${BRAND.foreground};">${shopName}</strong> has been suspended and is no longer visible to customers.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      <strong>Reason:</strong> ${reason}
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Contact support to resolve this and request reinstatement.
    </p>

    ${ctaButton('Contact Support', contactLink)}
  `);
}

export function vendorUnsuspensionHtml(name: string, shopName: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const dashboardLink = `${baseUrl}/dashboard/vendor`;

  return baseWrapper(`
    ${eyebrow('Shop Reinstated')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Your shop is live again<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, your shop <strong style="color: ${BRAND.foreground};">${shopName}</strong> has been reinstated and is visible to customers again.
    </p>

    ${ctaButton('Go to Dashboard', dashboardLink)}
  `);
}

export function orderCancellationHtml(
  order: { orderNumber: string; customerName: string },
  reason: string,
  items: { productName: string; quantity: number }[],
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/orders/${order.orderNumber}`;

  const itemsHtml = items
    .map(
      (item) =>
        `<li style="font-size: 13px; color: ${BRAND.foreground}; padding: 4px 0;">${item.productName} × ${item.quantity}</li>`,
    )
    .join('');

  return baseWrapper(`
    ${eyebrow('Order Cancelled')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Order cancelled<span style="color: ${BRAND.destructive};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${order.customerName}, your order <strong style="color: ${BRAND.foreground};">#${order.orderNumber}</strong> has been cancelled.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 12px;">
      <strong>Reason:</strong> ${reason}
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 12px;">
      Cancelled items:
    </p>

    <ul style="margin: 0 0 24px; padding-left: 20px;">
      ${itemsHtml}
    </ul>

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin-top: 24px; line-height: 1.5;">
      If you made a payment, a refund will be processed according to our refund policy. You can <a href="${orderLink}" style="color: ${BRAND.primary}; text-decoration: underline;">view your order</a> for more details.
    </p>

    ${ctaButton('View Order', orderLink)}
  `);
}

export function orderRefundHtml(
  order: { orderNumber: string; customerName: string },
  amount: number,
  reason: string,
  paymentMethod: string,
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const orderLink = `${baseUrl}/orders/${order.orderNumber}`;

  const paymentLabel: Record<string, string> = {
    BKASH: 'bKash',
    WALLET: 'Oylkka Wallet',
    CASH_ON_DELIVERY: 'Cash on Delivery',
  };

  return baseWrapper(`
    ${eyebrow('Refund Processed')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Refund completed<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${order.customerName}, a refund of <strong style="color: ${BRAND.foreground}; font-size: 18px;">৳${amount.toLocaleString('en-BD')}</strong> has been processed for order <strong style="color: ${BRAND.foreground};">#${order.orderNumber}</strong>.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 12px;">
      <strong>Reason:</strong> ${reason}
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      <strong>Refunded to:</strong> ${paymentLabel[paymentMethod] || paymentMethod}
    </p>

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin-top: 24px; line-height: 1.5;">
      Depending on your payment method, it may take 1-3 business days for the refund to appear. You can <a href="${orderLink}" style="color: ${BRAND.primary}; text-decoration: underline;">view your order</a> for details.
    </p>

    ${ctaButton('View Order', orderLink)}
  `);
}

export function passwordResetConfirmationHtml(name: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const signInLink = `${baseUrl}/auth/signin`;

  return baseWrapper(`
    ${eyebrow('Password Changed')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Password updated<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, your password has been successfully changed.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      If you did not make this change, please contact support immediately to secure your account.
    </p>

    ${ctaButton('Sign In', signInLink)}
  `);
}

export function welcomeHtml(name: string): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const shopLink = `${baseUrl}/products`;
  const vendorLink = `${baseUrl}/shop/apply`;

  return baseWrapper(`
    ${eyebrow('Welcome Aboard')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Welcome to Oylkka<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name}, your email has been verified. You're all set to start shopping on Oylkka!
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Discover products from approved shops across Bangladesh. Fast delivery, secure payments, and easy returns.
    </p>

    <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background: ${BRAND.background}; border-radius: 8px; text-align: center;">
          <span style="font-size: 13px; font-weight: 600; color: ${BRAND.foreground};">🛍️ Start Shopping</span>
          <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin: 4px 0 0;">Explore our curated collection</p>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Want to sell on Oylkka? <a href="${vendorLink}" style="color: ${BRAND.primary}; text-decoration: underline;">Apply to become a vendor</a> and reach customers nationwide.
    </p>

    ${ctaButton('Browse Products', shopLink)}
  `);
}

export function existingAccountHtml(
  name: string | undefined,
  provider: string,
): string {
  return baseWrapper(`
    ${eyebrow('Account Already Exists')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      You already have an account<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${name || 'there'}, we noticed someone tried to create a new account with this email address. You're already signed up via <strong>${provider}</strong>.
    </p>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      If this was you, please sign in using your ${provider} account. If you didn't try to create an account, you can ignore this email.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
      <tr>
        <td style="background: ${BRAND.primary}; border-radius: 8px; text-align: center;">
          <a href="${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/auth/signin" style="display: inline-block; padding: 12px 28px; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
            Sign In
          </a>
        </td>
      </tr>
    </table>
  `);
}

export function payoutProcessedHtml(
  shopName: string,
  amount: number,
  itemCount: number,
  note: string | null,
): string {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
  const payoutsLink = `${baseUrl}/vendor/payouts`;

  return baseWrapper(`
    ${eyebrow('Payout Processed')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Payout completed<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Hi ${shopName}, a payout of <strong style="color: ${BRAND.foreground}; font-size: 18px;">৳${amount.toLocaleString('en-BD')}</strong> has been processed for <strong>${itemCount}</strong> item${itemCount !== 1 ? 's' : ''}.
    </p>

    ${note ? `<p style="font-size: 14px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;"><strong>Note:</strong> ${note}</p>` : ''}

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin-top: 24px; line-height: 1.5;">
      The funds will be transferred to your registered bank account. You can <a href="${payoutsLink}" style="color: ${BRAND.primary}; text-decoration: underline;">view your payout history</a> for details.
    </p>

    ${ctaButton('View Payouts', payoutsLink)}
  `);
}

/** Escape user-supplied values before interpolating them into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * CONTENT-02: notification sent to the support inbox when someone submits the
 * public contact form. The message is also persisted (ContactMessage).
 */
export function contactMessageHtml(input: {
  name: string;
  email: string;
  subject: string | null;
  message: string;
  receivedAt: Date;
  messageId: string;
}): string {
  const { name, email, subject, message, receivedAt, messageId } = input;
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br />');

  return baseWrapper(`
    ${eyebrow('New Contact Message')}

    <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; color: ${BRAND.foreground};">
      Message from ${escapeHtml(name)}<span style="color: ${BRAND.primary};">.</span>
    </h1>

    <p style="font-size: 13px; line-height: 1.6; color: ${BRAND.mutedForeground}; margin: 0 0 24px;">
      Received ${receivedAt.toISOString()}
    </p>

    <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground}; width: 80px;">Name</td>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.foreground}; font-weight: 600;">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground};">Email</td>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.foreground}; font-weight: 600;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.mutedForeground};">Subject</td>
        <td style="padding: 4px 0; font-size: 13px; color: ${BRAND.foreground}; font-weight: 600;">${subject ? escapeHtml(subject) : 'General inquiry'}</td>
      </tr>
    </table>

    <div style="font-size: 14px; line-height: 1.6; color: ${BRAND.foreground}; padding: 16px; background: ${BRAND.background}; border-radius: 8px; margin-bottom: 24px;">
      ${safeMessage}
    </div>

    <p style="font-size: 12px; color: ${BRAND.mutedForeground}; margin: 0; line-height: 1.5;">
      Reference: ${messageId}
    </p>
  `);
}
