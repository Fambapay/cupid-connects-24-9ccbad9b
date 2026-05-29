import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Pencil, Sparkles, Shield, Bell, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import me from "@/assets/me.jpg";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Flama" },
      { name: "description", content: "Gerencie seu perfil." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [name, setName] = useState("Você");
  const [bio, setBio] = useState("Curioso, café forte e boas histórias.");
  const [editing, setEditing] = useState(false);

  return (
    <AppShell>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-44 bg-gradient-sunset" />
        <div className="relative px-5 pt-6">
          <div className="flex items-center justify-between text-flame-foreground">
            <h1 className="text-2xl font-bold">Meu perfil</h1>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-md">
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center">
            <div className="relative">
              <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-background shadow-card">
                <img src={me} alt="Você" className="h-full w-full object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full bg-gradient-flame text-flame-foreground shadow-glow">
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            {editing ? (
              <div className="mt-4 w-full space-y-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-flame"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-flame"
                />
                <button
                  onClick={() => setEditing(false)}
                  className="w-full rounded-full bg-gradient-flame py-2.5 text-sm font-semibold text-flame-foreground shadow-glow"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <>
                <h2 className="mt-4 text-2xl font-bold">{name}, 27</h2>
                <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">{bio}</p>
                <button
                  onClick={() => setEditing(true)}
                  className="mt-3 rounded-full border border-border px-4 py-1.5 text-xs font-semibold"
                >
                  Editar perfil
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-5 mt-6 grid grid-cols-3 gap-3">
        <Stat label="Matches" value="24" />
        <Stat label="Curtidas" value="143" />
        <Stat label="Visitas" value="89" />
      </div>

      <div className="mx-5 mt-6 overflow-hidden rounded-3xl bg-gradient-grape p-5 text-flame-foreground shadow-rose">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Flama Gold</h3>
            <p className="mt-1 text-sm opacity-90">
              Veja quem curtiu você, ganhe super likes e muito mais.
            </p>
            <button className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-bold text-grape">
              Saiba mais
            </button>
          </div>
        </div>
      </div>

      <ul className="mx-5 mt-6 divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-card">
        <Row icon={Bell} label="Notificações" />
        <Row icon={Shield} label="Privacidade" />
        <Row icon={LogOut} label="Sair" danger />
      </ul>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-card">
      <div className="text-2xl font-bold text-gradient-sunset">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  danger = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  danger?: boolean;
}) {
  return (
    <li>
      <button
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium ${
          danger ? "text-destructive" : ""
        }`}
      >
        <Icon className="h-5 w-5" />
        {label}
      </button>
    </li>
  );
}
