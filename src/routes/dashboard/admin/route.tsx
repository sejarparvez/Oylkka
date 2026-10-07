import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { RouteErrorBoundary } from '@/components/error-boundary';
import { USER_ROLES } from '@/lib/roles';

export const Route = createFileRoute('/dashboard/admin')({
  beforeLoad: ({ context }) => {
    const role = context.user?.role;
    if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.MANAGER) {
      throw redirect({ to: '/dashboard' });
    }
    return { user: context.user };
  },
  errorComponent: RouteErrorBoundary,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
