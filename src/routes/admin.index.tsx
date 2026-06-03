import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminKpis, getRevenueSeries } from "@/lib/admin.functions";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { Users, Sparkles, Heart, MessageSquare, ShieldCheck, BadgeCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const fmt = (n: number, currency = "MZN") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
const fmtInt = (n: number) => new Intl.NumberFormat("pt-PT").format(n);

function AdminDashboard() {
  const kpis = useServerFn(getAdminKpis);
  const series = useServerFn(getRevenueSeries);
  const kq = useQuery({ queryKey: ["admin-kpis"], queryFn: () => kpis() });
  const sq = useQuery({ queryKey: ["admin-revenue", 30], queryFn: () => series({ data: { days: 30 } }) });

  const k = kq.data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do app · {new Date().toLocaleDateString("pt-PT")}</p>
      </div>

      {kq.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
      {kq.error && <p className="text-sm text-red-500">{(kq.error as Error).message}</p>}

      {k && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Wallet} label="Receita hoje" value={fmt(k.revenue.today, k.revenue.currency)} accent />
            <Stat icon={Wallet} label="Receita mês" value={fmt(k.revenue.month, k.revenue.currency)} accent />
            <Stat icon={Wallet} label="Receita total" value={fmt(k.revenue.all, k.revenue.currency)} />
            <Stat icon={Sparkles} label="Premium ativos" value={fmtInt(k.users.premium)} />
          </div>

          <Card className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-semibold">Receita · últimos 30 dias</h2>
              {sq.isLoading && <span className="text-xs text-muted-foreground">a carregar…</span>}
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sq.data ?? []}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--flame))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--flame))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(d) => String(d).slice(5)} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                  <Tooltip
                    formatter={(v: number) => fmt(Number(v), k.revenue.currency)}
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--flame))" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Users} label="Utilizadores" value={fmtInt(k.users.total)} sub={`${fmtInt(k.users.onboarded)} onboarded`} />
            <Stat icon={Users} label="Ativos 7d" value={fmtInt(k.users.active7d)} />
            <Stat icon={Heart} label="Matches" value={fmtInt(k.engagement.matches)} />
            <Stat icon={MessageSquare} label="Mensagens" value={fmtInt(k.engagement.messages)} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Verificações pendentes</p>
                  <p className="text-2xl font-bold">{fmtInt(k.moderation.pendingVerifications)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Ações rápidas</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Link to="/admin/users" className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70">Ver users</Link>
                    <Link to="/admin/payments" className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70">Pagamentos</Link>
                    <Link to="/admin/audit" className="rounded-full bg-muted px-3 py-1 text-xs hover:bg-muted/70">Audit log</Link>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "bg-gradient-flame text-flame-foreground" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs ${accent ? "text-flame-foreground/80" : "text-muted-foreground"}`}>{label}</p>
          <p className="mt-1 text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className={`mt-0.5 text-[11px] ${accent ? "text-flame-foreground/70" : "text-muted-foreground"}`}>{sub}</p>}
        </div>
        <Icon className="h-5 w-5 opacity-70" />
      </div>
    </Card>
  );
}
