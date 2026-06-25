import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { requireAuthAndOnboarding } from "@/lib/authGuard";
import { PaywallFlow } from "@/components/paywall/PaywallFlow";
import { useForceDarkTheme } from "@/lib/theme";

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
  return (
    <div className="min-h-[100dvh] bg-background">
      <PaywallFlow
        open
        required={required === 1}
        onClose={() => navigate({ to: "/discover" })}
        onSuccess={() => navigate({ to: "/discover" })}
      />
    </div>
  );
}
