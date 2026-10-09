import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { prisma } from '@/lib/db';
import { logError } from '@/lib/logger';
import { uploadMessageImage } from '@/lib/message-upload';
import { messageLimiter } from '@/lib/rate-limit';
import { checkRateLimit } from '@/lib/rate-limit-guard';

export const Route = createFileRoute('/api/messages/create')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });
          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const csrfResponse = validateCsrf();
          if (csrfResponse) return csrfResponse;

          const rateLimitResponse = await checkRateLimit(messageLimiter);
          if (rateLimitResponse) return rateLimitResponse;

          const formData = await request.formData();
          const conversationId = formData.get('conversationId') as string;
          const content = formData.get('content') as string;
          const imageFile = formData.get('image') as File | null;

          const hasContent =
            typeof content === 'string' && content.trim().length > 0;
          const hasImage = imageFile instanceof File && imageFile.size > 0;

          // The composer allows sending an image without text (MONEY-67).
          if (!conversationId || (!hasContent && !hasImage)) {
            return Response.json(
              {
                error:
                  'conversationId and either content or an image are required',
              },
              { status: 400 },
            );
          }

          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
              id: true,
              customerId: true,
              shopId: true,
              status: true,
              shop: { select: { ownerId: true } },
            },
          });

          if (!conversation) {
            return Response.json(
              { error: 'Conversation not found' },
              { status: 404 },
            );
          }

          if (conversation.status === 'CLOSED') {
            return Response.json(
              { error: 'Conversation is closed' },
              { status: 400 },
            );
          }

          const isCustomer = conversation.customerId === session.user.id;
          const isVendor = conversation.shop.ownerId === session.user.id;

          if (!isCustomer && !isVendor) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }

          let imageUrl: string | null = null;
          let imagePublicId: string | null = null;

          if (hasImage) {
            const result = await uploadMessageImage(imageFile as File);
            if ('error' in result) {
              return Response.json({ error: result.error }, { status: 400 });
            }
            imageUrl = result.imageUrl;
            imagePublicId = result.imagePublicId;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: session.user.id,
              content: hasContent ? content.trim() : '',
              imageUrl,
              imagePublicId,
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { lastMessageAt: new Date() },
          });

          const recipientId = isCustomer
            ? conversation.shop.ownerId
            : conversation.customerId;

          sendMessageNotification(
            recipientId,
            session.user.name || 'Someone',
            hasContent ? content.trim() : 'an image',
          ).catch((error) => {
            // Off the response path, but never silently (MONEY-60).
            logError('message-notification-failed', error);
          });

          return Response.json({ message }, { status: 201 });
        } catch (error) {
          return Response.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Internal Server Error',
            },
            { status: 500 },
          );
        }
      },
    },
  },
});

async function sendMessageNotification(
  userId: string,
  senderName: string,
  content: string,
) {
  try {
    const { prisma } = await import('@/lib/db');
    const { sendEmail } = await import('@/lib/send-email');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, role: true },
    });
    if (!user?.email) return;

    const preview =
      content.length > 100 ? `${content.slice(0, 100)}...` : content;

    await sendEmail({
      to: user.email,
      subject: `New message from ${senderName}`,
      meta: {
        description: `${senderName}: "${preview}"`,
        link: `${process.env.BETTER_AUTH_URL || ''}/dashboard/messages`,
        callToActionText: 'View Messages',
      },
    });
  } catch (error) {
    logError('message-notification-send', error);
  }
}
