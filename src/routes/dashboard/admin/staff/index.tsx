import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/admin/staff/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/admin/staff/audit-logs' });
  },
});
