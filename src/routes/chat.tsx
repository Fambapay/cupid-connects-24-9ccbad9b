import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { MessageCircle, Sparkles, Compass, Shield, MessagesSquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useMatches } from "@/hooks/useMatches";
import { SwipeableConversationItem } from "@/components/chat/SwipeableConversationItem";

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
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background px-4 pb-3 pt-5">
        <h1
          className="text-[34px] leading-none tracking-tight text-white"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
        >
          Chat
        </h1>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.06] px-1.5 py-1.5 ring-1 ring-white/10">
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 active:bg-white/10">
            <Shield className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-white/90 active:bg-white/10">
            <MessagesSquare className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {newMatches.length > 0 && (
        <section className="mt-2 px-4">
          <h2
            className="text-[15px] uppercase tracking-tight text-white"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}
          >
            New Matches
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newMatches.map((m) => (
              <Link
                key={m.matchId}
                to="/chat/$matchId"
                params={{ matchId: m.matchId }}
                className="relative shrink-0"
              >
                <div className="h-32 w-[104px] overflow-hidden rounded-[22px] bg-card ring-1 ring-white/5">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-flame" />
                  )}
                </div>
                <span
                  className="mt-2 block text-center text-[14px] text-white"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
                >
                  {m.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${newMatches.length > 0 ? "mt-5" : "mt-2"} px-4`}>
        <h2
          className="text-[15px] uppercase tracking-tight text-white"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}
        >
          Messages
        </h2>


        {loading && matches.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">A carregar...</p>
        ) : conversations.length === 0 && newMatches.length === 0 ? (
          <div className="mt-16 flex flex-col items-center px-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-full bg-gradient-sunset opacity-30 blur-3xl" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-br from-card to-muted/40 ring-1 ring-border/60 shadow-2xl">
                <MessageCircle className="h-12 w-12 text-foreground/80" strokeWidth={1.5} />
                <span className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-sunset shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">
              A tua caixa está pronta
            </h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Quando deres match com alguém, a conversa começa aqui. Vai descobrir pessoas
              perto de ti.
            </p>
            <Link
              to="/discover"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-sunset px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95"
            >
              <Compass className="h-4 w-4" />
              Descobrir pessoas
            </Link>
          </div>
        ) : (
          <ul className="mt-3 space-y-1">
            {conversations.map((m) => (
              <SwipeableConversationItem
                key={m.matchId}
                matchId={m.matchId}
                otherId={m.otherId}
                name={m.name}
                photo={m.photo}
                lastMessage={m.lastMessage}
                lastMessageAt={formatTime(m.lastMessageAt)}
                unread={m.unread}
              />
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
