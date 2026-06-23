import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, Send } from "lucide-react";
import { useMessages, type ChatMessage } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TypingDots } from "@/components/chat/TypingDots";
import { ChatActionsMenu } from "@/components/chat/ChatActionsMenu";
import { PeerProfileSheet } from "@/components/chat/PeerProfileSheet";
import { getActivityStatus } from "@/lib/activityStatus";
import { useSubscription } from "@/hooks/useSubscription";

import { requireAuthAndOnboarding } from "@/lib/authGuard";



export const Route = createFileRoute("/chat/$matchId")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
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
    el.scrollTo({ top: el.scrollHeight, behavior });
    requestAnimationFrame(() => {
      const e = scrollRef.current;
      if (e) e.scrollTo({ top: e.scrollHeight, behavior });
    });
  }, []);

  // Single effect: scroll on mount, on match change, and on new messages/typing.
  useLayoutEffect(() => {
    scrollToLatest("auto");
  }, [matchId, messages.length, typing, scrollToLatest]);

  // Mark conversation as read on open and whenever new messages arrive (debounced)
  useEffect(() => {
    if (!user || !matchId) return;
    const t = window.setTimeout(() => {
      supabase
        .from("match_reads")
        .upsert(
          { match_id: matchId, user_id: user.id, last_read_at: new Date().toISOString() },
          { onConflict: "match_id,user_id" },
        )
        .then(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
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
    const setKb = () => {
      const winH = window.innerHeight;
      const vH = vv ? vv.height : winH;
      const vTop = vv ? vv.offsetTop : 0;
      const keyboardInset = Math.max(0, winH - vH - vTop);
      root.style.setProperty("--chat-kb", `${keyboardInset}px`);
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    setKb();
    vv?.addEventListener("resize", setKb);
    vv?.addEventListener("scroll", setKb);
    window.addEventListener("resize", setKb);
    window.addEventListener("scroll", setKb, { passive: true });
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", setKb);
      vv?.removeEventListener("scroll", setKb);
      window.removeEventListener("resize", setKb);
      window.removeEventListener("scroll", setKb);
      root.style.removeProperty("--chat-kb");
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // RT-01: Typing indicator. Only subscribe after we know the peer id so we
  // can reject any broadcast that doesn't claim to be from the actual peer
  // of this match — stops a third party (or self) from spoofing "is typing".
  useEffect(() => {
    if (!matchId || !user || !peer?.id) return;
    const peerId = peer.id;
    const ch = supabase.channel(`typing-${matchId}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "typing" }, (payload) => {
      const senderId = (payload.payload as { userId?: string })?.userId;
      // Must claim to be the peer AND must not be us. Self echo is already
      // filtered by `self: false`, but defense-in-depth.
      if (!senderId || senderId === user.id || senderId !== peerId) return;
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
      setTyping(false);
    };
  }, [matchId, user, peer?.id]);

  const broadcastTyping = useCallback(() => {
    const ch = typingChannelRef.current;
    if (!ch || !user) return;
    const now = Date.now();
    if (now - lastSentTypingRef.current < 1200) return;
    lastSentTypingRef.current = now;
    ch.send({ type: "broadcast", event: "typing", payload: { userId: user.id } });
  }, [user]);

  // Pre-compute per-row metadata once per messages/receipt change
  const rows = useMemo(() => {
    const peerReadMs = peerLastReadAt ? new Date(peerLastReadAt).getTime() : 0;
    let lastReadOwnIdx = -1;
    if (peerReadMs && entitlements.canReadReceipts) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.sender_id !== user?.id) continue;
        if (new Date(m.created_at).getTime() <= peerReadMs) { lastReadOwnIdx = i; break; }
      }
    }
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const me = m.sender_id === user?.id;
      const prevMe = prev ? prev.sender_id === user?.id : null;
      const nextMe = next ? next.sender_id === user?.id : null;
      return {
        msg: m,
        me,
        isFirstOfGroup: prevMe === null || prevMe !== me,
        isLastOfGroup: nextMe === null || nextMe !== me,
        showReadReceipt: entitlements.canReadReceipts && me && i === lastReadOwnIdx,
      };
    });
  }, [messages, user?.id, peerLastReadAt, entitlements.canReadReceipts]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height,
    getItemKey: (i) => rows[i].msg.id,
  });



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
      <div className="fixed inset-0 flex flex-col bg-background" aria-busy="true" aria-label="A carregar conversa">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <div className="h-9 w-9 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-11 w-11 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/[0.05] animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-3 p-4">
          <div className="h-10 w-2/3 rounded-2xl bg-white/[0.05] animate-pulse" />
          <div className="h-10 w-1/2 rounded-2xl bg-white/[0.05] animate-pulse self-end" />
          <div className="h-10 w-3/5 rounded-2xl bg-white/[0.05] animate-pulse" />
        </div>
      </div>
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
      className="fixed inset-0 z-50 flex flex-col overflow-hidden overscroll-none"
      style={{
        height: "100dvh",
        paddingBottom: "var(--chat-kb, 0px)",
        background: "#000",
        color: "#fff",
      }}
    >
      <header className="relative z-10 shrink-0">
        <div className="flex items-start justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <Link
            to="/chat"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full text-white active:scale-95"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35)",
            }}
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
              className="rounded-full px-4 py-1.5 text-[15px] text-white"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35)",
              }}
            >
              {peer.name}
            </div>
          </button>

          <div
            className="grid h-10 w-10 place-items-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35)",
            }}
          >
            <ChatActionsMenu matchId={matchId} otherUserId={peer.id} otherName={peer.name} />
          </div>
        </div>
      </header>


      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ WebkitOverflowScrolling: "touch", contain: "layout paint" }}>
        <DateSeparator label={formatDateLabel(messages[0]?.created_at)} />

        <div style={{ position: "relative", height: rowVirtualizer.getTotalSize(), width: "100%" }}>
          {rowVirtualizer.getVirtualItems().map((vi) => {
            const r = rows[vi.index];
            return (
              <div
                key={r.msg.id}
                data-index={vi.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${vi.start}px)`,
                  contentVisibility: "auto",
                  containIntrinsicSize: "0 56px",
                }}
              >
                <Bubble
                  msg={r.msg}
                  me={r.me}
                  isFirstOfGroup={r.isFirstOfGroup}
                  isLastOfGroup={r.isLastOfGroup}
                  avatar={peer.photo}
                  name={peer.name}
                  showReadReceipt={r.showReadReceipt}
                />
              </div>
            );
          })}
        </div>


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
                placeholder="Escreve uma mensagem"
                autoCapitalize="sentences"
                spellCheck={false}
                enterKeyHint="send"
                maxLength={2000}
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
  const datePart = d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
  const timePart = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} às ${timePart}`;
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

function BubbleImpl({ msg, me, isFirstOfGroup, isLastOfGroup, avatar, name, showReadReceipt }: BubbleProps) {
  return (
    <div
      className={`flex items-end gap-2 ${me ? "justify-end" : "justify-start"} ${
        isFirstOfGroup ? "mt-3" : "mt-0.5"
      }`}
      style={{ contain: "layout paint" }}
    >
      {!me &&
        (isLastOfGroup ? (
          avatar ? (
            <img src={avatar} alt={name} width={32} height={32} loading="lazy" decoding="async" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-flame" />
          )
        ) : (
          <div className="h-8 w-8 shrink-0" />
        ))}

      <div className={`flex w-fit max-w-[78%] flex-col ${me ? "ml-auto items-end" : "items-start"}`}>
        <div
          className="px-4 py-2.5 text-[15px] font-normal leading-snug break-words whitespace-pre-wrap rounded-[22px]"
          style={
            me
              ? { background: "#F3E7DD", color: "#0a0a0a", fontWeight: 400 }
              : { background: "#000", color: "#fff", border: "1px solid rgba(255,255,255,0.06)", fontWeight: 400 }
          }
        >
          {msg.content}
        </div>
        {me && showReadReceipt && isLastOfGroup && (
          <span className="mt-1 px-1 text-[11px] text-white/45">Lido</span>
        )}
      </div>
    </div>

  );
}

const Bubble = memo(BubbleImpl, (a, b) =>
  a.msg.id === b.msg.id &&
  a.msg.content === b.msg.content &&
  a.me === b.me &&
  a.isFirstOfGroup === b.isFirstOfGroup &&
  a.isLastOfGroup === b.isLastOfGroup &&
  a.avatar === b.avatar &&
  a.showReadReceipt === b.showReadReceipt,
);

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center justify-center">
      <span className="text-[12px] font-normal text-white/40">{label}</span>
    </div>
  );
}

