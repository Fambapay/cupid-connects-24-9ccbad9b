import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { conversations, matches, getProfile, type Message } from "@/data/profiles";

export const Route = createFileRoute("/chat/$matchId")({
  component: ChatRoom,
});

function ChatRoom() {
  const { matchId } = useParams({ from: "/chat/$matchId" });
  const match = matches.find((m) => m.id === matchId);
  const profile = match ? getProfile(match.profileId) : undefined;
  const [msgs, setMsgs] = useState<Message[]>(conversations[matchId] ?? []);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p>Conversa não encontrada.</p>
        <Link to="/chat" className="text-flame underline">Voltar</Link>
      </div>
    );
  }

  const send = () => {
    if (!text.trim()) return;
    setMsgs((m) => [
      ...m,
      { id: String(Date.now()), text: text.trim(), fromMe: true, time: "agora" },
    ]);
    setText("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        { id: String(Date.now() + 1), text: "Que legal! 😊", fromMe: false, time: "agora" },
      ]);
    }, 900);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-background/90 px-3 py-3 backdrop-blur-xl">
        <Link to="/chat" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-flame/40">
          <img src={profile.photo} alt={profile.name} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{profile.name}</p>
          <p className="text-xs text-muted-foreground">online agora</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
          Vocês deram match! 🔥
        </div>
        {msgs.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                m.fromMe
                  ? "bg-gradient-flame text-flame-foreground rounded-br-md shadow-glow"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-border bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mensagem"
          className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm outline-none ring-flame focus:ring-2"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid h-11 w-11 place-items-center rounded-full bg-gradient-flame text-flame-foreground shadow-glow transition-opacity disabled:opacity-40"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
