import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Send, Smile } from "lucide-react";
import { conversations, matches, getProfile, promoteNewMatch, appendMessage, type Message } from "@/data/profiles";

export const Route = createFileRoute("/chat/$matchId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = useParams({ from: "/chat/$matchId" });
  const existingMatch = matches.find((m) => m.id === matchId);
  const newProfileId = matchId.startsWith("new-") ? matchId.slice(4) : undefined;
  const profile = existingMatch
    ? getProfile(existingMatch.profileId)
    : newProfileId
      ? getProfile(newProfileId)
      : undefined;
  const [msgs, setMsgs] = useState<Message[]>(conversations[matchId] ?? []);

  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputHasTextRef = useRef(false);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;

    const pinToBottom = () => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    };

    pinToBottom();
    requestAnimationFrame(pinToBottom);
    requestAnimationFrame(() => requestAnimationFrame(pinToBottom));
    window.setTimeout(pinToBottom, 90);
    window.setTimeout(pinToBottom, 220);
  }, []);

  // Jump to the latest message instantly when the chat opens
  useLayoutEffect(() => {
    scrollToLatest("auto");
  }, [matchId, scrollToLatest]);

  // Scroll to bottom on new messages / typing (instant — smooth jitters while typing)
  useEffect(() => {
    scrollToLatest("auto");
  }, [msgs.length, typing, scrollToLatest]);

  // Pin the chat container to the real visible viewport (visualViewport).
  // iOS Safari shifts the LAYOUT viewport up when the keyboard opens — a
  // plain `fixed inset-0` would scroll the header off screen. We instead
  // anchor `top` and `height` to the actual visible region every frame.
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
      // Cancel any iOS layout-viewport shift so our `top` value is accurate.
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    setVh();
    vv?.addEventListener("resize", setVh);
    vv?.addEventListener("scroll", setVh);
    window.addEventListener("resize", setVh);
    window.addEventListener("scroll", setVh, { passive: true });
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", setVh);
      vv?.removeEventListener("scroll", setVh);
      window.removeEventListener("resize", setVh);
      window.removeEventListener("scroll", setVh);
      root.style.removeProperty("--chat-top");
      root.style.removeProperty("--chat-vh");
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p>Conversa não encontrada.</p>
        <Link to="/chat" className="text-flame underline">
          Voltar
        </Link>
      </div>
    );
  }

  const send = () => {
    const input = inputRef.current;
    const value = input?.value.trim() ?? "";
    if (!value) return;
    const myMsg: Message = { id: String(Date.now()), text: value, fromMe: true, time: nowLabel() };
    setMsgs((m) => [...m, myMsg]);
    // Promote a "new-X" match into the conversations list on first message.
    if (newProfileId && !existingMatch && msgs.length === 0) {
      promoteNewMatch(matchId, newProfileId, myMsg);
    } else {
      appendMessage(matchId, myMsg);
    }
    if (input) input.value = "";
    inputHasTextRef.current = false;
    inputRef.current?.focus();
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply: Message = {
        id: String(Date.now() + 1),
        text: pickReply(value),
        fromMe: false,
        time: nowLabel(),
      };
      setMsgs((m) => [...m, reply]);
      appendMessage(matchId, reply);
    }, 900);
  };


  return (
    <div
      className="fixed left-0 right-0 z-50 flex flex-col overflow-hidden overscroll-none bg-background"
      style={{
        top: "var(--chat-top, 0px)",
        height: "var(--chat-vh, 100dvh)",
      }}
    >
      {/* Fixed header */}
      <header className="relative z-10 shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-sunset opacity-80" />
        <div className="flex items-center gap-3 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
          <Link
            to="/chat"
            aria-label="Voltar"
            className="grid h-10 w-10 place-items-center rounded-full text-foreground/80 hover:bg-muted active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>

          <Link to="/chat" className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-flame/50">
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-background">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">{profile.name}</p>
              <p className="truncate text-xs text-emerald-600 dark:text-emerald-400">
                online agora
              </p>
            </div>
          </Link>

        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {/* Match intro */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-sunset blur-xl opacity-60" />
            <div className="relative h-full w-full overflow-hidden rounded-full ring-4 ring-background">
              <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold">
            Vocês deram match <span className="text-base">🔥</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Diga olá pra {profile.name}</p>
        </div>

        <DateSeparator label="Hoje" />

        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => {
              const prev = msgs[i - 1];
              const next = msgs[i + 1];
              const isFirstOfGroup = !prev || prev.fromMe !== m.fromMe;
              const isLastOfGroup = !next || next.fromMe !== m.fromMe;
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isFirstOfGroup={isFirstOfGroup}
                  isLastOfGroup={isLastOfGroup}
                  avatar={profile.photo}
                  name={profile.name}
                />
              );
            })}
            {typing && (
              <motion.li
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-2"
              >
                <img
                  src={profile.photo}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                  <TypingDots />
                </div>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 overflow-hidden border-t border-border/60 bg-background/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <div className="flex w-full items-center gap-2">
          <div className="flex h-12 min-w-0 flex-1 items-center gap-1 rounded-full bg-muted px-3 focus-within:ring-2 focus-within:ring-flame">
            <input
              ref={inputRef}
              type="text"
              onBeforeInput={() => {
                inputHasTextRef.current = true;
              }}
              onInput={(e) => {
                inputHasTextRef.current = e.currentTarget.value.length > 0;
              }}
              onFocus={() => requestAnimationFrame(() => scrollToLatest("auto"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Mensagem para ${profile.name}…`}
              autoCapitalize="sentences"
              spellCheck={false}
              enterKeyHint="send"
              className="block h-10 min-w-0 flex-1 appearance-none bg-transparent px-2 py-0 text-[16px] outline-none placeholder:text-muted-foreground [-webkit-appearance:none]"
              style={{ lineHeight: "40px", WebkitTextFillColor: "currentColor" }}
            />
            <button
              type="button"
              aria-label="Emoji"
              onMouseDown={(e) => e.preventDefault()}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-foreground/50 hover:text-foreground active:scale-95"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.9 }}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Enviar"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-flame text-flame-foreground shadow-glow transition-opacity"
          >
            <Send className="h-5 w-5 translate-x-[1px]" />
          </motion.button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  msg,
  isFirstOfGroup,
  isLastOfGroup,
  avatar,
  name,
}: {
  msg: Message;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  avatar: string;
  name: string;
}) {
  const me = msg.fromMe;
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
          <img src={avatar} alt={name} className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="h-7 w-7 shrink-0" />
        ))}

      <div
        className={`flex w-fit max-w-[78%] flex-col ${
          me ? "ml-auto items-end" : "items-start"
        }`}
      >
        <div
          className={[
            "px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap",
            me ? "bg-gradient-flame text-flame-foreground shadow-rose" : "bg-muted text-foreground",
            // bubble corners — tighter when grouped
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
          {msg.text}
        </div>
        {isLastOfGroup && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">{msg.time}</span>
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-muted-foreground"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function nowLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickReply(input: string) {
  const lower = input.toLowerCase();
  if (lower.includes("?")) return "Boa pergunta 😄 me conta mais!";
  if (lower.match(/oi|olá|hey|e ai|eai/)) return "Oi! Tudo bem com você? ✨";
  const replies = [
    "Que legal! 😊",
    "Adorei isso 💖",
    "Concordo demais!",
    "Hahaha você é divertido 😂",
    "Conta mais 👀",
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}
