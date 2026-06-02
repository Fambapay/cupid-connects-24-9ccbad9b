import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { BottomNav } from "@/components/BottomNav";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import type { DiscoveryProfile } from "@/components/discovery/types";
import { profiles } from "@/data/profiles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flama — Descubra novas conexões" },
      {
        name: "description",
        content:
          "Conheça pessoas perto de você. Desliza pra curtir, encontra seu match.",
      },
    ],
  }),
  component: Discover,
});

function Discover() {
  const items: DiscoveryProfile[] = useMemo(
    () =>
      profiles.map((p) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        city: p.distance,
        bio: p.bio,
        photos: [p.photo],
        interests: p.interests,
        isOnline: true,
        isVerified: true,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <DiscoveryPage profiles={items} />
      </div>
      <BottomNav />
    </div>
  );
}
