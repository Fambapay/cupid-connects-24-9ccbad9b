import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { PaywallFlow } from "@/components/paywall/PaywallFlow";
import { ManageMembership } from "@/components/membership/ManageMembership";
import { useForceDarkTheme } from "@/lib/theme";
import { useSubscription } from "@/hooks/useSubscription";

export const Route = createFileRoute("/membership")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  validateSearch: (s: Record<string, unknown>) => ({
    required: s.required === 1 || s.required === "1" ? 1 : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Hunie Membership — Desbloqueia tudo" },
      { name: "description", content: "Escolhe o teu plano Hunie: Select, Plus ou Elite. Likes ilimitados, vê quem te deu like, Super Likes diários e prioridade no feed." },
      { property: "og:title", content: "Hunie Membership — Desbloqueia tudo" },
      { property: "og:description", content: "Escolhe o teu plano Hunie: Select, Plus ou Elite. Likes ilimitados, vê quem te deu like, Super Likes diários e prioridade no feed." },
      { property: "og:url", content: "https://hunie.app/membership" },
    ],
    links: [{ rel: "canonical", href: "https://hunie.app/membership" }],
  }),
  component: MembershipPage,
});

function MembershipPage() {
  useForceDarkTheme();
  const navigate = useNavigate();
  const { required } = Route.useSearch();

  // Account management hub (history, restore, upgrade, cancel). Forced paywall when ?required=1.
  if (!required) {
    return <ManageMembership />;
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <PaywallFlow
        open
        required
        onClose={() => navigate({ to: "/profile" })}
        onSuccess={() => navigate({ to: "/profile" })}
      />
    </div>
  );
}
