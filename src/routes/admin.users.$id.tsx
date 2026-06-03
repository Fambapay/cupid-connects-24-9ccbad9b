import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserDetail,
  setUserPaused,
  setUserVerified,
  setUserMembership,
  grantUserCredits,
  deleteUserPhoto,
  deleteUserPrompt,
  deleteUser,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/users/$id")({
  component: UserDetail,
});

const fmtDate = (d: string | null | undefined) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—");

function UserDetail() {
  const { id } = useParams({ from: "/admin/users/$id" });
  const getDetail = useServerFn(getUserDetail);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-user", id], queryFn: () => getDetail({ data: { userId: id } }) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-user", id] });

  const mPaused = useMutation({
    mutationFn: useServerFn(setUserPaused),
    onSuccess: () => { toast.success("Estado atualizado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mVerified = useMutation({
    mutationFn: useServerFn(setUserVerified),
    onSuccess: () => { toast.success("Verificação atualizada"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mMembership = useMutation({
    mutationFn: useServerFn(setUserMembership),
    onSuccess: () => { toast.success("Membership atualizado"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mCredits = useMutation({
    mutationFn: useServerFn(grantUserCredits),
    onSuccess: (r: { new_balance: number }) => { toast.success(`Saldo: ${r.new_balance}`); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mPhoto = useMutation({
    mutationFn: useServerFn(deleteUserPhoto),
    onSuccess: () => { toast.success("Foto removida"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mPrompt = useMutation({
    mutationFn: useServerFn(deleteUserPrompt),
    onSuccess: () => { toast.success("Prompt removido"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mDelete = useMutation({
    mutationFn: useServerFn(deleteUser),
    onSuccess: () => { toast.success("Utilizador eliminado"); window.history.back(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [membershipTier, setMembershipTier] = useState<"free" | "plus" | "gold" | "platinum">("plus");
  const [membershipDays, setMembershipDays] = useState(30);
  const [boostQty, setBoostQty] = useState(5);
  const [superQty, setSuperQty] = useState(5);

  if (q.isLoading) return <p className="text-sm text-muted-foreground">A carregar…</p>;
  if (q.error) return <p className="text-sm text-red-500">{(q.error as Error).message}</p>;
  const d = q.data;
  if (!d?.profile) return <p>Não encontrado.</p>;
  const p = d.profile;

  return (
    <div className="space-y-5">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{p.name ?? "Sem nome"}</h1>
          <p className="text-sm text-muted-foreground">{d.email ?? "sem email"}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.is_verified && <Badge className="bg-blue-500/10 text-blue-500">verified</Badge>}
            {p.membership_status === "active" && <Badge className="bg-gradient-flame text-flame-foreground">{p.membership_tier}</Badge>}
            {p.is_paused && <Badge variant="destructive">pausado</Badge>}
            {!p.onboarding_completed && <Badge variant="outline">onboarding incompleto</Badge>}
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm("Apagar utilizador definitivamente?")) mDelete.mutate({ data: { userId: id } });
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KV k="Idade" v={String(p.age ?? "—")} />
        <KV k="Cidade" v={`${p.city ?? "—"}${p.country ? ", " + p.country : ""}`} />
        <KV k="Género" v={p.gender ?? "—"} />
        <KV k="Criada em" v={fmtDate(p.created_at)} />
        <KV k="Último login" v={fmtDate(d.lastSignInAt)} />
        <KV k="Última atividade" v={fmtDate(p.last_active_at)} />
        <KV k="Email confirmado" v={fmtDate(d.emailConfirmedAt)} />
        <KV k="Membership até" v={fmtDate(p.membership_expires_at)} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KV k="Swipes" v={String(d.stats.swipes)} />
        <KV k="Matches" v={String(d.stats.matches)} />
        <KV k="Mensagens" v={String(d.stats.messages)} />
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Ações</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={p.is_verified ? "outline" : "default"}
            onClick={() => mVerified.mutate({ data: { userId: id, verified: !p.is_verified } })}>
            {p.is_verified ? "Remover verificação" : "Verificar"}
          </Button>
          <Button size="sm" variant={p.is_paused ? "outline" : "destructive"}
            onClick={() => mPaused.mutate({ data: { userId: id, paused: !p.is_paused } })}>
            {p.is_paused ? "Reativar" : "Pausar (ban)"}
          </Button>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Membership</p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={membershipTier} onValueChange={(v) => setMembershipTier(v as typeof membershipTier)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">free</SelectItem>
                <SelectItem value="plus">plus</SelectItem>
                <SelectItem value="gold">gold</SelectItem>
                <SelectItem value="platinum">platinum</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={membershipDays} onChange={(e) => setMembershipDays(Number(e.target.value))} className="w-24" />
            <span className="text-xs text-muted-foreground">dias</span>
            <Button size="sm" onClick={() => mMembership.mutate({ data: { userId: id, tier: membershipTier, days: membershipDays } })}>
              Aplicar
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Créditos (atuais: boost {d.credits?.boost_balance ?? 0} · super {d.credits?.super_like_balance ?? 0})</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs">Boost</span>
            <Input type="number" value={boostQty} onChange={(e) => setBoostQty(Number(e.target.value))} className="w-20" />
            <Button size="sm" variant="outline" onClick={() => mCredits.mutate({ data: { userId: id, kind: "boost", quantity: boostQty } })}>
              Adicionar
            </Button>
            <span className="ml-3 text-xs">Super</span>
            <Input type="number" value={superQty} onChange={(e) => setSuperQty(Number(e.target.value))} className="w-20" />
            <Button size="sm" variant="outline" onClick={() => mCredits.mutate({ data: { userId: id, kind: "super_like", quantity: superQty } })}>
              Adicionar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Fotos ({d.photos.length})</h2>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {d.photos.map((ph) => (
            <div key={ph.id} className="relative">
              {ph.url ? (
                <img src={ph.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ) : (
                <div className="aspect-square w-full rounded-lg bg-muted" />
              )}
              <button
                onClick={() => mPhoto.mutate({ data: { photoId: ph.id } })}
                className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-90 hover:opacity-100"
                aria-label="Remover foto"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {d.photos.length === 0 && <p className="col-span-full text-xs text-muted-foreground">Sem fotos.</p>}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Bio & Prompts</h2>
        {p.bio && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">{p.bio}</p>}
        <ul className="space-y-2">
          {d.prompts.map((pr) => (
            <li key={pr.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">{pr.question}</p>
                  <p className="mt-0.5 text-sm">{pr.answer}</p>
                </div>
                <button
                  onClick={() => mPrompt.mutate({ data: { promptId: pr.id } })}
                  className="shrink-0 rounded-md p-1 text-red-500 hover:bg-red-500/10"
                  aria-label="Remover prompt"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {d.prompts.length === 0 && <p className="text-xs text-muted-foreground">Sem prompts.</p>}
        </ul>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="font-semibold">Pagamentos Débito ({d.payments.length})</h2>
        <ul className="divide-y divide-border text-sm">
          {d.payments.map((pay) => (
            <li key={pay.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="font-medium">{Number(pay.amount).toLocaleString("pt-PT")} {pay.currency}</p>
                <p className="text-xs text-muted-foreground">{pay.kind} · {pay.payment_method} · {fmtDate(pay.created_at)}</p>
              </div>
              <Badge variant={pay.status === "paid" ? "default" : pay.status === "pending" ? "secondary" : "destructive"}>
                {pay.status}
              </Badge>
            </li>
          ))}
          {d.payments.length === 0 && <li className="py-2 text-xs text-muted-foreground">Sem pagamentos.</li>}
        </ul>
      </Card>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{v}</p>
    </div>
  );
}
