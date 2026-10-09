import { TanStackDevtools } from '@tanstack/react-devtools';
import { useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useEffect, useRef } from 'react';
import { Toaster } from '#/components/ui/sonner';
import { TooltipProvider } from '#/components/ui/tooltip';
import { ThemeProvider } from '#/context/theme-provider';
import { RouteErrorBoundary } from '@/components/error-boundary';
import { NotFound } from '@/components/not-found';
import { getSession, signOut } from '@/lib/auth.functions';
import appCss from '../styles.css?url';

export const Route = createRootRoute({
  beforeLoad: async () => {
    const session = await getSession();
    return { user: session?.user ?? null };
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Oylkka — Bangladesh Marketplace' },
      {
        name: 'description',
        content:
          'Shop thousands of products from verified vendors across Bangladesh. Fast delivery, secure payments, and easy returns on Oylkka.',
      },
      { property: 'og:title', content: 'Oylkka — Bangladesh Marketplace' },
      {
        property: 'og:description',
        content:
          'Shop thousands of products from verified vendors across Bangladesh. Fast delivery, secure payments, and easy returns.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: '/og-image.svg' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Oylkka — Bangladesh Marketplace' },
      {
        name: 'twitter:description',
        content:
          'Shop thousands of products from verified vendors across Bangladesh.',
      },
      { name: 'twitter:image', content: '/og-image.svg' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'canonical', href: 'https://oylkka.com' },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: RouteErrorBoundary,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();
  const handlingUnauthorized = useRef(false);
  // FE-05: the QueryClient is created per-request in `getRouter()` and exposed
  // through the router's Wrap — there is no separate client instance here, so
  // server-dehydrated data lands in the same cache the app reads from.
  const queryClient = useQueryClient();

  // FE-24: a 401 must clear all cached auth-scoped data and bounce to sign-in
  // instead of leaving a stale session rendering private data.
  useEffect(() => {
    const onUnauthorized = () => {
      if (handlingUnauthorized.current) return;
      handlingUnauthorized.current = true;
      queryClient.clear();
      void router
        .navigate({ to: '/auth/signin', replace: true })
        .then(() => signOut())
        .catch(() => undefined)
        .finally(() => {
          handlingUnauthorized.current = false;
        });
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () =>
      window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [queryClient, router]);

  return (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition='bottom-left' />
    </>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme='system' storageKey='theme'>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors />
        </ThemeProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
