import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useForceDarkTheme } from '@/lib/theme';

function AuthLayout() {
  useForceDarkTheme();
  return <Outlet />;
}

export const Route = createFileRoute('/auth')({
  beforeLoad: ({ location }) => {
    if (location.pathname === '/auth' || location.pathname === '/auth/') {
      throw redirect({ to: '/auth/login' });
    }
  },
  component: AuthLayout,
});

