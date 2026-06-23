import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listSeeds,
  toggleSeed,
  toggleAllSeeds,
  getSeedStats,
  setSeedThreshold,
  generateSeeds,
  populateExistingUsers,
} from "@/lib/seeds.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/seeds")({
  component: SeedsAdmin,
});

const CITIES = ["Maputo", "Beira", "Nampula", "Quelimane", "Tete"];
const GENDERS = [
  { v: "feminino", l: "Feminino" },
  { v: "masculino", l: "Masculino" },
  { v: "nao_binario", l: "Não-binário" },
];

function SeedsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(listSeeds);
  const toggle = useServerFn(toggleSeed);
  const toggleAll = useServerFn(toggleAllSeeds);
  const stats = useServerFn(getSeedStats);
  const setThr = useServerFn(setSeedThreshold);
  const generate = useServerFn(generateSeeds);

  const [city, setCity] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [thrInput, setThrInput] = useState<string>("");

  const statsQ = useQuery({ queryKey: ["seed-stats"], queryFn: () => stats() });
  const listQ = useQuery({
    queryKey: ["seeds", { city, gender, search, page }],
    queryFn: () =>
      list({
        data: {
          city: city || undefined,
          gender: gender || undefined,
          search: search || undefined,
          page,
          pageSize: 20,
        },
      }),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seeds"] });
      qc.invalidateQueries({ queryKey: ["seed-stats"] });
    },
  });

  const toggleAllMut = useMutation({
    mutationFn: (active: boolean) => toggleAll({ data: { active } }),
    onSuccess: (_d, active) => {
      qc.invalidateQueries({ queryKey: ["seeds"] });
      qc.invalidateQueries({ queryKey: ["seed-stats"] });
      toast.success(active ? "Todos os seeds ativados" : "Todos os seeds desativados");
    },
  });

  const thrMut = useMutation({
    mutationFn: (value: number) => setThr({ data: { value } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seed-stats"] });
      toast.success("Threshold atualizado");
      setThrInput("");
    },
  });

  const genMut = useMutation({
    mutationFn: (v: { city: string; count: number; gender: "feminino" | "masculino" | "nao_binario" }) =>
      generate({ data: v }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["seeds"] });
      qc.invalidateQueries({ queryKey: ["seed-stats"] });
      const msg = `Criados ${res.inserted} seeds${res.skipped ? ` (${res.skipped} falhas)` : ""}`;
      if (res.errors?.length) toast.warning(msg, { description: res.errors.join("; ") });
      else toast.success(msg);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = statsQ.data;
  const total = listQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Seeds</h1>
        <p className="text-sm text-muted-foreground">
          Perfis placeholder no Discover. Nunca dão match nem mensagens.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Seeds ativos" value={s ? `${s.activeSeeds} / ${s.totalSeeds}` : "—"} />
        <StatCard label="Likes recebidos (7d)" value={s ? `${s.likesThisWeek}` : "—"} sub="descartados" />
        <StatCard label="Utilizadores reais" value={s ? `${s.realUsers}` : "—"} />
        <StatCard
          label="Auto-desativação"
          value={s ? (s.autoDisabledAt ? "Disparado" : `aos ${s.threshold} users`) : "—"}
        />
      </div>

      {/* Generator */}
      <SeedGenerator onGenerate={(v) => genMut.mutate(v)} pending={genMut.isPending} />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <Button variant="secondary" onClick={() => toggleAllMut.mutate(true)} disabled={toggleAllMut.isPending}>
          Ativar todos
        </Button>
        <Button variant="destructive" onClick={() => toggleAllMut.mutate(false)} disabled={toggleAllMut.isPending}>
          Desativar todos
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="number"
            placeholder={`Threshold (${s?.threshold ?? "—"})`}
            value={thrInput}
            onChange={(e) => setThrInput(e.target.value)}
            className="w-40"
          />
          <Button
            variant="outline"
            disabled={!thrInput || thrMut.isPending}
            onClick={() => thrMut.mutate(Number(thrInput))}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Nome…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="w-48"
        />
        <Select value={city || "all"} onValueChange={(v) => { setCity(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas cidades</SelectItem>
            {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gender || "all"} onValueChange={(v) => { setGender(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Género" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos géneros</SelectItem>
            {GENDERS.map((g) => <SelectItem key={g.v} value={g.v}>{g.l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQ.isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">A carregar…</TableCell></TableRow>
            )}
            {listQ.data?.rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.photo ? (
                    <img src={r.photo} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.age}</TableCell>
                <TableCell>{r.city}</TableCell>
                <TableCell className="capitalize">{r.gender?.replace("_", "-")}</TableCell>
                <TableCell>
                  <Switch
                    checked={!!r.seed_active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: r.id, active: v })}
                    disabled={toggleMut.isPending}
                  />
                </TableCell>
              </TableRow>
            ))}
            {!listQ.isLoading && !listQ.data?.rows.length && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sem seeds.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} resultados</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

type GenInput = { city: string; count: number; gender: "feminino" | "masculino" | "nao_binario" };

function SeedGenerator({ onGenerate, pending }: { onGenerate: (v: GenInput) => void; pending: boolean }) {
  const [city, setCity] = useState<string>("Maputo");
  const [gender, setGender] = useState<GenInput["gender"]>("feminino");
  const [count, setCount] = useState<number>(20);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-medium">Gerar seeds</p>
      <Select value={city} onValueChange={(v) => setCity(v)}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={gender} onValueChange={(v) => setGender(v as GenInput["gender"])}>
        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {GENDERS.map((g) => <SelectItem key={g.v} value={g.v}>{g.l}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={1}
        max={50}
        value={count}
        onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
        className="w-24"
      />
      <Button onClick={() => onGenerate({ city, gender, count })} disabled={pending}>
        {pending ? "A gerar…" : "Gerar"}
      </Button>
      <p className="text-xs text-muted-foreground">Máx 50 por vez. Cria auth users + perfil + fotos.</p>
    </div>
  );
}
