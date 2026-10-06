import { prisma } from '@/lib/db';

// Hard deadline for bKash API calls so a hung integration never stalls
// checkout or refund flows (MONEY-59).
const BKASH_TIMEOUT_MS = 15_000;

type BkashConfig = {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
};

function getConfig(): BkashConfig {
  return {
    baseUrl:
      process.env.BKASH_BASE_URL || 'https://checkout.pay.bka.sh/v1.2.0-beta',
    appKey: process.env.BKASH_APP_KEY || '',
    appSecret: process.env.BKASH_APP_SECRET || '',
    username: process.env.BKASH_USERNAME || '',
    password: process.env.BKASH_PASSWORD || '',
  };
}

function isConfigured(): boolean {
  const config = getConfig();
  return Boolean(
    config.appKey && config.appSecret && config.username && config.password,
  );
}

async function getGrantToken(): Promise<string> {
  const existing = await prisma.bkashToken.findFirst({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
  });

  if (existing) {
    return existing.token;
  }

  const config = getConfig();

  const response = await fetch(
    `${config.baseUrl}/tokenized/checkout/token/grant`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-app-key': config.appKey,
        username: config.username,
        password: config.password,
      },
      body: JSON.stringify({
        app_key: config.appKey,
        app_secret: config.appSecret,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash grant token failed: ${text}`);
  }

  const data = await response.json();

  // Clean up expired tokens before creating a new one
  await prisma.bkashToken.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });

  await prisma.bkashToken.create({
    data: {
      token: data.id_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    },
  });

  return data.id_token;
}

type BkashCreatePaymentResult = {
  bkashURL: string;
  paymentID: string;
  merchantInvoiceNumber: string;
  statusCode?: string;
  statusMessage?: string;
};

export async function createBkashPayment(params: {
  amount: number;
  orderId: string;
  merchantInvoiceNumber: string;
  callbackURL: string;
}): Promise<BkashCreatePaymentResult> {
  if (!isConfigured()) {
    throw new Error('bKash is not configured');
  }

  const token = await getGrantToken();
  const config = getConfig();

  const response = await fetch(`${config.baseUrl}/tokenized/checkout/create`, {
    method: 'POST',
    signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-app-key': config.appKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      mode: '0011',
      payerReference: params.orderId,
      callbackURL: params.callbackURL,
      amount: params.amount.toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: params.merchantInvoiceNumber,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash create payment failed: ${text}`);
  }

  return await response.json();
}

export type BkashExecutePaymentResult = {
  transactionStatus: string;
  paymentID: string;
  trxID: string;
  amount: string;
  merchantInvoiceNumber?: string;
};

export async function executeBkashPayment(
  paymentID: string,
): Promise<BkashExecutePaymentResult> {
  if (!isConfigured()) {
    throw new Error('bKash is not configured');
  }

  const token = await getGrantToken();

  const config = getConfig();

  const response = await fetch(`${config.baseUrl}/tokenized/checkout/execute`, {
    method: 'POST',
    signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-app-key': config.appKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paymentID,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash execute payment failed: ${text}`);
  }

  return await response.json();
}

type BkashRefundResult = {
  refundTrxID: string;
  transactionStatus: string;
  amount: string;
  paymentID: string;
};

export async function refundBkashPayment(params: {
  paymentID: string;
  trxID: string;
  amount: number;
  reason?: string;
}): Promise<BkashRefundResult> {
  if (!isConfigured()) {
    throw new Error('bKash is not configured');
  }

  const token = await getGrantToken();

  const config = getConfig();

  const response = await fetch(
    `${config.baseUrl}/tokenized/checkout/payment/refund`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-app-key': config.appKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paymentID: params.paymentID,
        trxID: params.trxID,
        amount: params.amount.toFixed(2),
        reason: params.reason || '',
        sku: 'NA',
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash refund failed: ${text}`);
  }

  return await response.json();
}

export async function queryBkashPayment(
  paymentID: string,
): Promise<Record<string, unknown>> {
  if (!isConfigured()) {
    throw new Error('bKash is not configured');
  }
  const token = await getGrantToken();
  const config = getConfig();

  const response = await fetch(
    `${config.baseUrl}/tokenized/checkout/payment/status`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(BKASH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-app-key': config.appKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        paymentID,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`bKash query payment failed: ${text}`);
  }

  return await response.json();
}
