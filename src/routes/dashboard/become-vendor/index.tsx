import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/become-vendor/')({
  beforeLoad: () => {
    throw redirect({ to: '/dashboard/become-vendor/apply' });
  },
});
