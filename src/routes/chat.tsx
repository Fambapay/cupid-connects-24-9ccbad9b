import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { AppShell, TopBar } from "@/components/AppShell";
import { matches, getProfile } from "@/data/profiles";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Conversas — Flama" },
      { name: "description", content: "Suas conversas." },
    ],
  }),
  component: ChatLayout,
});

function ChatLayout() {
  const matchRoute = useMatchRoute();
  const onDetail = matchRoute({ to: "/chat/$matchId" });
  if (onDetail) return <Outlet />;

  return (
    <AppShell>
      <TopBar title="Conversas" />
      <ul className="px-3">
        {matches.map((m) => {
          const p = getProfile(m.profileId)!;
          return (
            <li key={m.id}>
              <Link
                to="/chat/$matchId"
                params={{ matchId: m.id }}
                className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-muted/60 active:bg-muted"
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
    </AppShell>
  );
}
