import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { queueEmail } from '@/lib/email-queue';
import { contactMessageHtml } from '@/lib/email-templates';
import { logError } from '@/lib/logger';
import { contactLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { PUBLIC_SETTING_DEFAULTS } from '@/routes/api/settings/public';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email('A valid email address is required').max(200),
  subject: z.string().trim().max(150).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Please provide at least 10 characters')
    .max(5000, 'Message is too long'),
});

// CONTENT-02: the form used to return a fabricated success without storing or
// sending anything. Now the message is validated, rate-limited, persisted to
// `contact_message`, and a notification is enqueued to the support inbox.
export const Route = createFileRoute('/api/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rateLimitResponse = await checkRateLimit(contactLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const body = await request.json().catch(() => ({}));
          const parsed = contactSchema.safeParse(body);
          if (!parsed.success) {
            return Response.json(
              {
                error: parsed.error.issues[0]?.message ?? 'Invalid submission',
              },
              { status: 400 },
            );
          }

          const { name, subject, message } = parsed.data;
          const email = parsed.data.email.toLowerCase();

          const supportSetting = await prisma.siteSetting.findUnique({
            where: { key: 'support_email' },
            select: { value: true },
          });
          const supportEmail =
            supportSetting?.value?.trim() ||
            PUBLIC_SETTING_DEFAULTS.support_email;

          const record = await prisma.contactMessage.create({
            data: {
              name,
              email,
              subject: subject || null,
              message,
            },
            select: { id: true, createdAt: true },
          });

          // The message is already persisted, so a failed enqueue must not fail
          // the request — it only means the notification will not be sent.
          try {
            await queueEmail(
              supportEmail,
              `New contact message from ${name}`,
              contactMessageHtml({
                name,
                email,
                subject: subject || null,
                message,
                receivedAt: record.createdAt,
                messageId: record.id,
              }),
            );
          } catch (error) {
            logError('contact notification enqueue failed', error);
          }

          return Response.json(
            { message: 'Contact message received successfully', id: record.id },
            { status: 201 },
          );
        } catch (error) {
          logError('contact submission failed', error);
          return Response.json(
            { error: 'Internal Server Error' },
            { status: 500 },
          );
        }
      },
    },
  },
});
