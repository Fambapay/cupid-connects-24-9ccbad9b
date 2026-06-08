import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Send } from "lucide-react";
import { useMessages, type ChatMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TypingDots } from "@/components/chat/TypingDots";
import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";
import { PeerProfileSheet } from "@/components/chat/PeerProfileSheet";
import { getActivityStatus } from "@/lib/activityStatus";
import { useSubscription } from "@/hooks/useSubscription";

import { requireMembership } from "@/lib/authGuard";



export const Route = createFileRoute("/chat/$matchId")({
  ssr: false,
  beforeLoad: requireMembership,
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = useParams({ from: "/chat/$matchId" });
  const { user } = useAuth();
  const { entitlements } = useSubscription();
  const { messages, peer, loading, notFound, send } = useMessages(matchId);
  const [typing, setTyping] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const typingTimerRef = useRef<number | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentTypingRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputHasTextRef = useRef(false);

  const activity = peer ? getActivityStatus(true, peer.lastActiveAt) : null;

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    const pin = () => el.scrollTo({ top: el.scrollHeight, behavior });
    pin();
    requestAnimationFrame(pin);
    requestAnimationFrame(() => requestAnimationFrame(pin));
    window.setTimeout(pin, 90);
    window.setTimeout(pin, 220);
  }, []);

  useLayoutEffect(() => {
    scrollToLatest("auto");
  }, [matchId, scrollToLatest]);

  useEffect(() => {
    scrollToLatest("auto");
  }, [messages.length, typing, scrollToLatest]);

  // Mark conversation as read on open and whenever new messages arrive
  useEffect(() => {
    if (!user || !matchId) return;
    supabase
      .from("match_reads")
      .upsert(
        { match_id: matchId, user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: "match_id,user_id" },
      )
      .then(() => undefined);
  }, [user, matchId, messages.length]);

  // Read receipts: track peer's last_read_at so we can render "Lido" indicators
  // on our own messages. Only fetched/subscribed when the viewer has the
  // entitlement — otherwise we don't even know peer ever read.
  useEffect(() => {
    if (!user || !matchId || !peer?.id || !entitlements.canReadReceipts) {
      setPeerLastReadAt(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("match_reads")
      .select("last_read_at")
      .eq("match_id", matchId)
      .eq("user_id", peer.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPeerLastReadAt((data?.last_read_at as string | null) ?? null);
      });
    const ch = supabase
      .channel(`reads-${matchId}-${peer.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_reads", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_id?: string; last_read_at?: string } | null;
          if (row?.user_id === peer.id && row.last_read_at) {
            setPeerLastReadAt(row.last_read_at);
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user, matchId, peer?.id, entitlements.canReadReceipts]);




  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    const setVh = () => {
      if (document.activeElement === inputRef.current && inputHasTextRef.current) return;
      const winH = window.innerHeight;
      const vH = vv ? vv.height : winH;
      const vTop = vv ? vv.offsetTop : 0;
      root.style.setProperty("--chat-top", `${vTop}px`);
      root.style.setProperty("--chat-vh", `${vH}px`);
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    setVh();
    vv?.addEventListener("resize", setVh);
    vv?.addEventListener("scroll", setVh);
    window.addEventListener("resize", setVh);
    window.addEventListener("scroll", setVh, { passive: true });
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", setVh);
      vv?.removeEventListener("scroll", setVh);
      window.removeEventListener("resize", setVh);
      window.removeEventListener("scroll", setVh);
      root.style.removeProperty("--chat-top");
      root.style.removeProperty("--chat-vh");
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Typing indicator over broadcast channel
  useEffect(() => {
    if (!matchId || !user) return;
    const ch = supabase.channel(`typing-${matchId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      const senderId = (payload.payload as { userId?: string })?.userId;
      if (!senderId || senderId === user.id) return;
      setTyping(true);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setTyping(false), 3000);
    });
    ch.subscribe();
    typingChannelRef.current = ch;
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      supabase.removeChannel(ch);
      typingChannelRef.current = null;
    };
  }, [matchId, user]);

  const broadcastTyping = useCallback(() => {
    const ch = typingChannelRef.current;
    if (!ch || !user) return;
    const now = Date.now();
    if (now - lastSentTypingRef.current < 1200) return;
    lastSentTypingRef.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
  }, [user]);


  if (notFound) {
    return (
      <div className="p-8 text-center">
        <p>Conversa não encontrada.</p>
        <Link to="/chat" className="text-flame underline">Voltar</Link>
      </div>
    );
  }

  if (loading || !peer) {
    return (
      <div className="fixed inset-0 grid place-items-center text-muted-foreground">A carregar…</div>
    );
  }

  const handleSend = async () => {
    const input = inputRef.current;
    const value = input?.value.trim() ?? "";
    if (!value) return;
    if (input) input.value = "";
    inputHasTextRef.current = false;
    inputRef.current?.focus();
    await send(value);
  };

  return (
    <div
      className="fixed left-0 right-0 z-50 flex flex-col overflow-hidden overscroll-none"
      style={{
        top: "var(--chat-top, 0px)",
        height: "var(--chat-vh, 100dvh)",
        background: "#000",
        color: "#fff",
      }}
    >
      <header className="relative z-10 shrink-0">
        <div className="flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <Link
            to="/chat"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-white/90 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-2 active:opacity-80"
            aria-label={`Ver perfil de ${peer.name}`}
          >
            <div className="relative">
              <div className="h-14 w-14 overflow-hidden rounded-full">
                {peer.photo ? (
                  <img src={peer.photo} alt={peer.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-flame" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-black">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: activity?.dot ?? "#6b6f76" }}
                />
              </span>
            </div>
            <div
              className="rounded-full bg-black px-4 py-1 text-[15px] font-bold text-white"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}
            >
              {peer.name}
            </div>
          </button>

          <div className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06]">
            <ChatActionsMenu matchId={matchId} otherUserId={peer.id} otherName={peer.name} />
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <DateSeparator label={formatDateLabel(messages[0]?.created_at)} />

        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {(() => {
              const peerReadMs = peerLastReadAt ? new Date(peerLastReadAt).getTime() : 0;
              let lastReadOwnIdx = -1;
              for (let i = messages.length - 1; i >= 0; i--) {
                const m = messages[i];
                if (m.sender_id !== user?.id) continue;
                if (peerReadMs && new Date(m.created_at).getTime() <= peerReadMs) {
                  lastReadOwnIdx = i;
                  break;
                }
              }
              return messages.map((m, i) => {
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const me = m.sender_id === user?.id;
                const prevMe = prev ? prev.sender_id === user?.id : null;
                const nextMe = next ? next.sender_id === user?.id : null;
                const isFirstOfGroup = prevMe === null || prevMe !== me;
                const isLastOfGroup = nextMe === null || nextMe !== me;
                return (
                  <Bubble
                    key={m.id}
                    msg={m}
                    me={me}
                    isFirstOfGroup={isFirstOfGroup}
                    isLastOfGroup={isLastOfGroup}
                    avatar={peer.photo}
                    name={peer.name}
                    showReadReceipt={entitlements.canReadReceipts && me && i === lastReadOwnIdx}
                  />
                );
              });
            })()}
          </AnimatePresence>
        </ul>

        <AnimatePresence>
          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-end gap-2"
            >
              {peer.photo ? (
                <img src={peer.photo} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-flame" />
              )}
              <div className="rounded-3xl rounded-bl-md bg-[#101010] px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="overflow-hidden px-3 pt-2 pb-3"
          style={{ background: "#000" }}
        >
          <div className="flex w-full items-center gap-2">
            <button
              type="button"
              aria-label="GIF"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/15 text-[11px] font-bold tracking-wide text-white/80"
            >
              GIF
            </button>

            <div className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-white/10 bg-white/[0.04] px-4">
              <input
                ref={inputRef}
                type="text"
                onBeforeInput={() => { inputHasTextRef.current = true; broadcastTyping(); }}
                onInput={(e) => {
                  inputHasTextRef.current = e.currentTarget.value.length > 0;
                  if (inputHasTextRef.current) broadcastTyping();
                }}
                onFocus={() => requestAnimationFrame(() => scrollToLatest("auto"))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Type a message"
                autoCapitalize="sentences"
                spellCheck={false}
                enterKeyHint="send"
                className="block h-10 min-w-0 flex-1 appearance-none bg-transparent px-1 py-0 text-[16px] text-white outline-none placeholder:text-white/40 [-webkit-appearance:none]"
                style={{ lineHeight: "40px", WebkitTextFillColor: "currentColor" }}
              />
              <motion.button
                type="submit"
                whileTap={{ scale: 0.9 }}
                onMouseDown={(e) => e.preventDefault()}
                aria-label="Enviar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70"
              >
                <Send className="h-4 w-4 translate-x-[1px]" />
              </motion.button>
            </div>
          </div>
        </form>
      </div>

      <PeerProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        userId={peer.id}
        fallbackName={peer.name}
        fallbackPhoto={peer.photo}
      />
    </div>
  );
}

function formatDateLabel(iso?: string) {
  if (!iso) return "Hoje";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).replace(",", " at");
}


type BubbleProps = {
  msg: ChatMessage;
  me: boolean;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  avatar: string;
  name: string;
  showReadReceipt?: boolean;
};

function Bubble({ msg, me, isFirstOfGroup, isLastOfGroup, avatar, name, showReadReceipt }: BubbleProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`flex items-end gap-2 ${me ? "justify-end" : "justify-start"} ${
        isFirstOfGroup ? "mt-3" : "mt-0.5"
      }`}
    >
      {!me &&
        (isLastOfGroup ? (
          avatar ? (
            <img src={avatar} alt={name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-flame" />
          )
        ) : (
          <div className="h-7 w-7 shrink-0" />
        ))}

      <div className={`flex w-fit max-w-[78%] flex-col ${me ? "ml-auto items-end" : "items-start"}`}>
        <div
          className={[
            "px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap",
            me ? "bg-gradient-flame text-flame-foreground shadow-rose" : "bg-muted text-foreground",
            "rounded-2xl",
            me
              ? `${isFirstOfGroup ? "rounded-tr-2xl" : "rounded-tr-md"} ${
                  isLastOfGroup ? "rounded-br-md" : "rounded-br-2xl"
                }`
              : `${isFirstOfGroup ? "rounded-tl-2xl" : "rounded-tl-md"} ${
                  isLastOfGroup ? "rounded-bl-md" : "rounded-bl-2xl"
                }`,
          ].join(" ")}
        >
          {msg.content}
        </div>
        {isLastOfGroup && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">
            {new Date(msg.created_at).toLocaleTimeString("pt-PT", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {me && showReadReceipt && <span className="ml-1.5 text-flame font-medium">· Lido</span>}
          </span>
        )}
      </div>
    </motion.li>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-2 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span className="font-semibold">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
