import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Hunie" }] }),
  component: AuthGate,
});

type Decision =
  | { to: "/welcome" }
  | { to: "/auth/verify-email" }
  | { to: "/onboarding"; search?: { step?: number } }
  | { to: "/discover" };

function AuthGate() {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => setShowSpinner(true), 800);

    const resolve = async (session: Session | null) => {
      if (cancelled) return;
      if (!session) return setDecision({ to: "/welcome" });
      if (!session.user.email_confirmed_at)
        return setDecision({ to: "/auth/verify-email" });
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, onboarding_step")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.onboarding_completed) {
        setDecision({
          to: "/onboarding",
          search: { step: profile?.onboarding_step ?? 1 },
        });
        return;
      }
      setDecision({ to: "/discover" });
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session));

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!decision) return <Splash showSpinner={showSpinner} />;
  if (decision.to === "/onboarding")
    return <Navigate to="/onboarding" search={decision.search} replace />;
  return <Navigate to={decision.to} replace />;
}

function Splash({ showSpinner }: { showSpinner: boolean }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-gradient-sunset text-5xl font-bold tracking-tight">
          Hunie
        </h1>
        {showSpinner && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        )}
      </div>
    </div>
  );
}
