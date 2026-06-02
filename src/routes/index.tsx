import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
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
        isOnline: Math.random() > 0.5,
        isVerified: true,
      })),
    [],
  );

  return (
    <AppShell fullHeight>
      <div className="relative mx-4 mt-3 flex-1 min-h-0">
        <DiscoveryPage profiles={items} />
      </div>
    </AppShell>
  );
}
