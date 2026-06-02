import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
import { AppShell, TopBar } from "@/components/AppShell";
import { matches, getProfile, profiles, subscribeMatches } from "@/data/profiles";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Conversas — Flama" },
      { name: "description", content: "Suas conversas e novos matches." },
    ],
  }),
  component: ChatLayout,
});

const emptySnapshot = 0;
function ChatLayout() {
  // Re-render when matches/conversations change (e.g. new match promoted).
  useSyncExternalStore(
    subscribeMatches,
    () => matches.length,
    () => emptySnapshot,
  );
  const matchRoute = useMatchRoute();
  const onDetail = matchRoute({ to: "/chat/$matchId" });
  if (onDetail) return <Outlet />;

  const matchedIds = new Set(matches.map((m) => m.profileId));
  const newMatches = profiles.filter((p) => !matchedIds.has(p.id)).slice(0, 8);


  return (
    <AppShell>
      <TopBar title="Conversas" />

      {newMatches.length > 0 && (
        <section className="px-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Novos matches
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
            {newMatches.map((p) => (
              <Link
                key={p.id}
                to="/chat/$matchId"
                params={{ matchId: `new-${p.id}` }}
                className="relative shrink-0"
              >
                <div className="rounded-2xl bg-gradient-sunset p-[2px]">
                  <div className="h-24 w-20 overflow-hidden rounded-2xl bg-card">
                    <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                </div>
                <span className="mt-1.5 block text-center text-xs font-medium">{p.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}



      <section className={`${newMatches.length > 0 ? "mt-6" : ""} px-5`}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Mensagens
        </h2>
        <ul className="mt-3 space-y-1">
          {matches.map((m) => {
            const p = getProfile(m.profileId)!;
            return (
              <li key={m.id}>
                <Link
                  to="/chat/$matchId"
                  params={{ matchId: m.id }}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted/60 active:bg-muted"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-flame/40">
                    <img src={p.photo} alt={p.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{m.lastMessage}</p>
                  </div>
                  {m.unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gradient-flame px-1.5 text-[11px] font-bold text-flame-foreground">
                      {m.unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </AppShell>
  );
}
