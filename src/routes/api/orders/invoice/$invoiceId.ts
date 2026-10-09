import { createFileRoute } from '@tanstack/react-router';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Authorized invoice download (MONEY-54): the raw Cloudinary URL is no longer
// handed straight to the client; a session-scoped hop enforces ownership
// before the PDF is reachable at all.
export const Route = createFileRoute('/api/orders/invoice/$invoiceId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const headers = getRequestHeaders();
          const session = await auth.api.getSession({ headers });

          if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
          }

          const invoice = await prisma.invoice.findUnique({
            where: { id: params.invoiceId },
            select: {
              pdfUrl: true,
              invoiceNumber: true,
              order: { select: { customerId: true } },
            },
          });

          if (!invoice?.pdfUrl || !invoice.order) {
            return Response.json(
              { error: 'Invoice not found' },
              { status: 404 },
            );
          }

          const isOwner =
            invoice.order.customerId === session.user.id ||
            session.user.role === 'ADMIN' ||
            session.user.role === 'MANAGER';

          if (!isOwner) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
          }

          return Response.redirect(invoice.pdfUrl, 302);
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
