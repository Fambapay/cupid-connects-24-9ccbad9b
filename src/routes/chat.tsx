import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Sparkles, Compass } from "lucide-react";
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
  // Keep the list mounted always; the detail route uses `fixed inset-0 z-50`
  // to overlay it. This avoids an unmount/remount flash when navigating
  // between list and conversation.
  return (
    <>
      <ChatList />
      <Outlet />
    </>
  );
}

function ChatList() {
  const { matches, loading } = useMatches();
  const newMatches = matches.filter((m) => !m.hasMessages);
  const conversations = matches.filter((m) => m.hasMessages);

  // Delay skeleton reveal so fast loads don't flash skeleton → empty state.
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    if (!loading) {
      setShowSkeleton(false);
      return;
    }
    const t = window.setTimeout(() => setShowSkeleton(true), 250);
    return () => window.clearTimeout(t);
  }, [loading]);

  const state: "skeleton" | "empty" | "list" =
    loading && matches.length === 0
      ? "skeleton"
      : conversations.length === 0 && newMatches.length === 0
      ? "empty"
      : "list";

  return (
    <AppShell className="bg-[var(--profile-bg)]">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[var(--profile-bg)] px-5 py-4">
        <h1
          className="text-2xl tracking-tight text-foreground"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
        >
          Chat
        </h1>
      </header>


      {newMatches.length > 0 && (
        <section className="mt-2 px-4">
          <h2
            className="text-[15px] uppercase tracking-tight text-muted-foreground"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
          >
            Novos matches
          </h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {newMatches.map((m) => (
              <Link
                key={m.matchId}
                to="/chat/$matchId"
                params={{ matchId: m.matchId }}
                className="relative shrink-0"
              >
                <div className="h-32 w-[104px] overflow-hidden rounded-[22px] bg-card ring-1 ring-border">
                  {m.photo ? (
                    <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-flame" />
                  )}
                </div>
                <span
                  className="mt-2 block text-center text-[14px] text-foreground"
                  style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
                >
                  {m.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className={`${newMatches.length > 0 ? "mt-3" : "mt-1"} px-4`}>
        <h2
          className="text-[15px] uppercase tracking-tight text-muted-foreground"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600 }}
        >
          Mensagens
        </h2>



        <AnimatePresence mode="wait" initial={false}>
          {state === "skeleton" ? (
            <motion.ul
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: showSkeleton ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-3"
              aria-busy="true"
              aria-label="A carregar conversas"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-1">
                  <div className="h-12 w-12 shrink-0 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-muted/60 animate-pulse" />
                  </div>
                </li>
              ))}
            </motion.ul>
          ) : state === "empty" ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="mt-16 flex flex-col items-center px-6 text-center"
            >
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
            </motion.div>
          ) : (
            <motion.ul
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3"
            >
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
                  yourTurn={m.hasMessages && !m.lastFromMe && m.unread === 0}
                />

              ))}
            </motion.ul>
          )}
        </AnimatePresence>
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
