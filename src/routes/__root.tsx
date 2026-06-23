import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";



import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "sonner";
import { useNewMessageNotifier } from "@/hooks/useNewMessageNotifier";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { PushPermissionPrompt } from "@/components/PushPermissionPrompt";
import { supabase } from "@/integrations/supabase/client";
import { CountryProvider } from "@/lib/country/context";
import { initNative } from "@/lib/native/init";
import { setupNativePush } from "@/lib/native/push";
import { isNative } from "@/lib/native/platform";
import { useSystemTheme } from "@/lib/theme";

function ThemeSync() {
  useSystemTheme();
  return null;
}

function NativeBoot() {
  useEffect(() => {
    void initNative();
  }, []);
  return null;
}

function GlobalNotifiers() {
  useNewMessageNotifier();
  useHeartbeat();
  return null;
}

function PushPromptGate() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => mounted && setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setAuthed(!!session?.user);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (authed && isNative()) {
      void setupNativePush();
    }
  }, [authed]);
  return authed && !isNative() ? <PushPermissionPrompt /> : null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "Hunie — Namoro em Moçambique. Comunidade verificada." },
      { name: "description", content: "Hunie é a comunidade de encontros feita em Moçambique. Perfis verificados em Maputo, Matola, Beira, Nampula e Chimoio. Pagamento M-Pesa, preços em MZN." },
      { name: "author", content: "Hunie" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "googlebot", content: "index, follow" },
      { name: "theme-color", content: "#07060a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Hunie" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:site_name", content: "Hunie" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_MZ" },
      { property: "og:locale:alternate", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@hunieapp" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Montserrat:wght@800;900&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Hunie",
        url: "https://hunie.app",
        logo: "https://hunie.app/icon-512.png",
        description: "Comunidade de encontros membership-only feita em Moçambique.",
        sameAs: ["https://www.instagram.com/hunie.app", "https://www.tiktok.com/@hunie.app"],
        areaServed: { "@type": "Country", name: "Mozambique" },
      }),
    }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CountryProvider>
        <NativeBoot />
        <ThemeSync />
        <Outlet />
        <GlobalNotifiers />
        <PushPromptGate />
        <Toaster
          position="top-center"
          richColors
          offset="calc(env(safe-area-inset-top, 0px) + 12px)"
          mobileOffset="calc(env(safe-area-inset-top, 0px) + 12px)"
          toastOptions={{
            unstyled: true,
            classNames: { toast: "flex justify-center w-full" },
          }}
        />
      </CountryProvider>
    </QueryClientProvider>
  );
}


