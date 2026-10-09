import { beforeEach, describe, expect, it, mock } from 'bun:test';

// CONTENT-02: the contact form must persist each message and enqueue a
// notification, never return a fabricated success.

const contactCreate = mock(
  async (_args: unknown): Promise<unknown> => ({
    id: 'cm-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }),
);
const settingFindUnique = mock(
  async (_args: unknown): Promise<unknown> => ({ value: 'help@oylkka.com' }),
);
const queueEmail = mock(async (..._args: unknown[]): Promise<void> => {});
const checkRateLimit = mock(
  async (_limiter: unknown): Promise<Response | null> => null,
);

mock.module('@/lib/db', () => ({
  prisma: {
    siteSetting: {
      findUnique: async (args: unknown) => settingFindUnique(args),
    },
    contactMessage: {
      create: async (args: unknown) => contactCreate(args),
    },
  },
}));

mock.module('@/lib/email-queue', () => ({
  queueEmail: async (...args: unknown[]) => queueEmail(...args),
}));

mock.module('@/lib/rate-limit', () => ({ contactLimiter: {} }));

mock.module('@/lib/rate-limit-guard', () => ({
  checkRateLimit: async (limiter: unknown) => checkRateLimit(limiter),
}));

mock.module('@/lib/logger', () => ({
  logError: () => {},
}));

mock.module('@/routes/api/settings/public', () => ({
  PUBLIC_SETTING_DEFAULTS: { support_email: 'support@oylkka.com' },
}));

const { Route } = await import('@/routes/api/contact');

const route = Route as unknown as {
  options?: { server?: { handlers?: { POST?: Handler } } };
  _options?: { server?: { handlers?: { POST?: Handler } } };
};
type Handler = (args: { request: Request }) => Promise<Response>;
const post =
  route.options?.server?.handlers?.POST ??
  route._options?.server?.handlers?.POST;

function submit(body: unknown) {
  return (post as Handler)({
    request: new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
}

const validBody = {
  name: 'Rina',
  email: 'Rina@Example.com',
  subject: 'Order question',
  message: 'Where is my order please?',
};

describe('POST /api/contact', () => {
  beforeEach(() => {
    contactCreate.mockClear();
    settingFindUnique.mockClear();
    queueEmail.mockClear();
    settingFindUnique.mockImplementation(async () => ({
      value: 'help@oylkka.com',
    }));
    queueEmail.mockImplementation(async () => {});
  });

  it('exposes a POST handler', () => {
    expect(typeof post).toBe('function');
  });

  it('rejects invalid input without persisting anything', async () => {
    const res = await submit({ ...validBody, message: 'short' });

    expect(res.status).toBe(400);
    expect(contactCreate).not.toHaveBeenCalled();
  });

  it('persists the message and returns 201 with its id', async () => {
    const res = await submit(validBody);

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe('cm-1');

    const args = contactCreate.mock.calls[0]?.[0] as {
      data: { name: string; email: string; subject: string | null };
    };
    expect(args.data.name).toBe('Rina');
    // Email is normalised before storage.
    expect(args.data.email).toBe('rina@example.com');
    expect(args.data.subject).toBe('Order question');
  });

  it('notifies the configured support inbox', async () => {
    await submit(validBody);

    expect(queueEmail).toHaveBeenCalledTimes(1);
    expect(queueEmail.mock.calls[0]?.[0]).toBe('help@oylkka.com');
  });

  it('falls back to the default support inbox when unset', async () => {
    settingFindUnique.mockImplementationOnce(async () => null);

    await submit(validBody);

    expect(queueEmail.mock.calls[0]?.[0]).toBe('support@oylkka.com');
  });

  it('still succeeds when the notification cannot be queued', async () => {
    queueEmail.mockImplementationOnce(async () => {
      throw new Error('smtp down');
    });

    const res = await submit(validBody);

    expect(res.status).toBe(201);
    expect(contactCreate).toHaveBeenCalledTimes(1);
  });

  it('short-circuits when rate limited', async () => {
    checkRateLimit.mockImplementationOnce(
      async () => new Response(null, { status: 429 }),
    );

    const res = await submit(validBody);

    expect(res.status).toBe(429);
    expect(contactCreate).not.toHaveBeenCalled();
  });
});
