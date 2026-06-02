import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell, TopBar } from "@/components/AppShell";
import { profiles } from "@/data/profiles";

import { requireAuthAndOnboarding } from "@/lib/authGuard";

export const Route = createFileRoute("/matches")({
  ssr: false,
  beforeLoad: requireAuthAndOnboarding,
  head: () => ({
    meta: [
      { title: "Likes — Hunie" },
      { name: "description", content: "Vê quem deu like em ti." },
    ],
  }),
  component: LikesPage,
});

function LikesPage() {
  const likers = profiles;

  return (
    <AppShell>
      <TopBar title="Likes" />

      <section className="px-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-flame" fill="currentColor" />
          <span>
            <span className="font-semibold text-foreground">{likers.length}</span> pessoas curtiram você
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {likers.map((p) => (
            <div
              key={p.id}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-card"
            >
              <img
                src={p.photo}
                alt={p.name}
                className="h-full w-full object-cover blur-md scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {p.name}, {p.age}
                  </p>
                  <p className="truncate text-xs text-white/80">{p.distance}</p>
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-flame text-flame-foreground shadow-lg">
                  <Heart className="h-4 w-4" fill="currentColor" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
