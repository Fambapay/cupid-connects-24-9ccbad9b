import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { AppShell, TopBar } from "@/components/AppShell";
import { useMatches } from "@/hooks/useMatches";

import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/chat")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Conversas — Hunie" },
      { name: "description", content: "As tuas conversas e novos matches." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const matchRoute = useMatchRoute();
  const onDetail = matchRoute({ to: "/chat/$matchId" });
  if (onDetail) return <Outlet />;

  return <ChatList />;
}

function ChatList() {
  const { matches, loading } = useMatches();
  const newMatches = matches.filter((m) => !m.hasMessages);
  const conversations = matches.filter((m) => m.hasMessages);

  return (
    <AppShell>
      <TopBar title="Conversas" />

      {newMatches.length > 0 && (
        <section className="px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Novos matches
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {newMatches.map((m) => (
              <Link
                key={m.matchId}
                to="/chat/$matchId"
                params={{ matchId: m.matchId }}
                className="relative shrink-0"
              >
                <div className="rounded-2xl bg-gradient-sunset p-[2px]">
                  <div className="h-24 w-20 overflow-hidden rounded-2xl bg-card">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-flame" />
                    )}
                  </div>
                </div>
                <span className="mt-1.5 block text-center text-xs font-medium">{m.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${newMatches.length > 0 ? "mt-6" : ""} px-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mensagens
        </h2>

        {loading && matches.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">A carregar...</p>
        ) : conversations.length === 0 && newMatches.length === 0 ? (
          <div className="mt-10 text-center">
            <div className="text-5xl">💬</div>
            <p className="mt-3 text-sm text-muted-foreground">
              Sem matches ainda. Vai descobrir pessoas!
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {conversations.map((m) => (
              <li key={m.matchId}>
                <Link
                  to="/chat/$matchId"
                  params={{ matchId: m.matchId }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted/60 active:bg-muted"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-flame/40">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-flame" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{formatTime(m.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {m.lastMessage ?? "Diz olá 👋"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "ontem";
  if (day < 7) return `${day} d`;
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}
