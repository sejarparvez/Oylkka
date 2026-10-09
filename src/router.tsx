import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  });

  // FE-05: wire React Query into the router's SSR dehydrate/hydrate cycle so
  // anything the server prefetches (query loaders, `ssr: true` queries) is
  // streamed into the client cache instead of being thrown away and re-fetched
  // after hydration. The integration also wraps the whole tree in the
  // QueryClientProvider (wrapQueryClient is on by default), which replaces the
  // ad-hoc provider that __root.tsx used to create per render.
  const queryClient = new QueryClient();
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
