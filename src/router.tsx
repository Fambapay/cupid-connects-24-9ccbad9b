import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    // Keep preloaded loader/beforeLoad results fresh long enough that tapping a
    // bottom-tab right after the preload doesn't re-run the auth gate.
    defaultPreloadStaleTime: 30_000,
    defaultPreloadGcTime: 5 * 60_000,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
