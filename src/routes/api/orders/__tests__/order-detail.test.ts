import { describe, expect, it, mock } from 'bun:test';

// CUST-09: regression test that the order-detail endpoint is scoped to the
// session user — an authenticated customer must never read someone else's
// order.

type HandlerArgs = {
  params: { orderId: string };
};

const getSession = mock(
  async (): Promise<{ user: { id: string } } | null> => ({
    user: { id: 'user-1' },
  }),
);
const findFirst = mock(async (_args: unknown): Promise<unknown> => null);

mock.module('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => new Headers(),
}));

mock.module('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: async () => getSession(),
    },
  },
}));

mock.module('@/lib/db', () => ({
  prisma: {
    order: {
      findFirst: async (args: unknown) => findFirst(args),
    },
  },
}));

const { Route } = await import('@/routes/api/orders/$orderId');

type RouteWithOptions = {
  options?: {
    server?: {
      handlers?: {
        GET?: (args: HandlerArgs) => Promise<Response>;
      };
    };
  };
  _options?: {
    server?: {
      handlers?: {
        GET?: (args: HandlerArgs) => Promise<Response>;
      };
    };
  };
};

const route = Route as unknown as RouteWithOptions;
const getHandler =
  route.options?.server?.handlers?.GET ?? route._options?.server?.handlers?.GET;

describe('GET /api/orders/$orderId', () => {
  it('exposes a GET handler', () => {
    expect(typeof getHandler).toBe('function');
  });

  it('returns 401 without a session', async () => {
    getSession.mockImplementationOnce(async () => null);

    const res = await (getHandler as (a: HandlerArgs) => Promise<Response>)({
      params: { orderId: 'order-1' },
    });

    expect(res.status).toBe(401);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('scopes the lookup to the session user (ownership filter)', async () => {
    findFirst.mockImplementationOnce(async () => null);

    const res = await (getHandler as (a: HandlerArgs) => Promise<Response>)({
      params: { orderId: 'order-1' },
    });

    expect(res.status).toBe(404);
    expect(findFirst).toHaveBeenCalledTimes(1);
    const args = findFirst.mock.calls[0]?.[0] as {
      where: { id: string; customerId: string };
    };
    expect(args.where).toMatchObject({
      id: 'order-1',
      customerId: 'user-1',
    });
  });

  it('returns order data for the owner', async () => {
    const now = new Date();
    findFirst.mockImplementationOnce(async () => ({
      id: 'order-1',
      orderNumber: 'OY-1',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      total: 100,
      subtotal: 90,
      shippingCost: 10,
      tax: 0,
      discountAmount: 0,
      couponDiscount: 0,
      couponCode: null,
      shippingName: 'Customer',
      shippingEmail: 'c@example.com',
      shippingPhone: '01700000000',
      shippingAddress: 'House 1',
      shippingUpzila: 'U',
      shippingDistrict: 'D',
      shippingPostalCode: null,
      shippingComment: null,
      createdAt: now,
      confirmedAt: null,
      paidAt: null,
      cancelledAt: null,
      cancellationReason: null,
      refundAmount: 0,
      refundReason: null,
      currency: 'BDT',
      invoice: null,
      items: [],
    }));

    const res = await (getHandler as (a: HandlerArgs) => Promise<Response>)({
      params: { orderId: 'order-1' },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; tax: number };
    expect(body.id).toBe('order-1');
    expect(body.tax).toBe(0);
  });
});
