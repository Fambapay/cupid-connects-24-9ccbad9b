/**
 * E2E Playwright test — Paywall (mpesa + emola).
 *
 * Este teste é a versão UI-driven do fluxo já testado em `scripts/e2e-emola.ts`.
 * Ele valida o caminho completo pelo browser + creditação por webhook.
 *
 * Fluxo por método (mpesa, emola):
 *   1. Restaura sessão Supabase (env LOVABLE_BROWSER_SUPABASE_* ou email/senha).
 *   2. Abre /shop → clica no pack `boost_1` (mais barato) → chega ao /checkout.
 *   3. Seleciona o método + preenche telefone Movitel de teste.
 *   4. Clica "Pagar" e captura o URL do server-fn na Network para o run seguinte.
 *   5. Lê a linha `debito_payments` criada (RLS: user vê só as suas).
 *   6. POST assinado (HMAC-SHA256 com DEBITO_WEBHOOK_SECRET) para
 *      /api/public/debito-webhook simulando `status=success`.
 *   7. Verifica: linha ficou `success` + `user_credits.boost_balance` incrementou.
 *
 * Uso:
 *   DEBITO_WEBHOOK_SECRET=... \
 *   TEST_EMAIL=foo@bar.com TEST_PASSWORD=xxx \
 *   [BASE_URL=http://localhost:8080] \
 *   bun run scripts/e2e-paywall-playwright.ts
 *
 * Notas:
 *   • Requer `bun add -d playwright` (usa a API sync através do runtime Bun).
 *   • O orquestrador Debito é chamado a sério — usa uma conta de teste.
 *   • Se orquestrador devolver `failed` (nº bogus), o webhook ainda credita
 *     porque procura por source_id e só bloqueia idempotency ao 2º call.
 */
import { chromium, type Page, type Request } from "playwright";
import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://vwwnmfazltjkdlxvwnta.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d25tZmF6bHRqa2RseHZ3bnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTA2MjgsImV4cCI6MjA5NTk4NjYyOH0.40fkFj0IW90Sh7h41R2iLF0rolunWd63SY6d_MrCgY4";
const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const SECRET = process.env.DEBITO_WEBHOOK_SECRET;
if (!SECRET) {
  console.error("✗ Falta DEBITO_WEBHOOK_SECRET");
  process.exit(1);
}

// ── Session bootstrap (browser injection OR email/password) ────────────────
async function getSession() {
  const raw = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  if (raw) return JSON.parse(raw);
  const email = process.env.TEST_EMAIL;
  const pass = process.env.TEST_PASSWORD;
  if (!email || !pass) {
    console.error("✗ Falta LOVABLE_BROWSER_SUPABASE_SESSION_JSON ou TEST_EMAIL/PASSWORD");
    process.exit(1);
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error || !data.session) throw new Error(`Login falhou: ${error?.message}`);
  return data.session;
}

const step = (n: string, msg: string) => console.log(`\n▸ ${n}  ${msg}`);

const METHODS: Array<{ code: "mpesa" | "emola"; phone: string; label: string }> = [
  { code: "mpesa", phone: "841234567", label: "M-Pesa" },
  { code: "emola", phone: "861234567", label: "e-Mola" },
];

async function seedSession(page: Page, session: any) {
  const storageKey =
    process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY ??
    "sb-vwwnmfazltjkdlxvwnta-auth-token";
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([k, v]) => window.localStorage.setItem(k, v),
    [storageKey, JSON.stringify(session)] as [string, string],
  );
}

async function runOne(
  page: Page,
  admin: ReturnType<typeof createClient>,
  userId: string,
  m: (typeof METHODS)[number],
) {
  step(m.code, `Checkout via UI (${m.label})`);

  // 1) navigate to /checkout?packId=boost_1 directly (evita cliques no shop)
  await page.goto(`${BASE_URL}/checkout?packId=boost_1&amount=99&title=Boost+1`, {
    waitUntil: "networkidle",
  });
  await page.screenshot({ path: `/tmp/browser/paywall/${m.code}-1-form.png` });

  // 2) Select method by clicking the tile that contains the label
  const tile = page.locator(`button:has-text("${m.label}")`).first();
  await tile.click();

  // 3) Fill phone
  await page.getByPlaceholder(/\d{6,}/).fill(m.phone);

  // 4) Capture server-fn URL from Network on Pay click
  const serverFnReq = page.waitForRequest(
    (req: Request) =>
      req.method() === "POST" &&
      /_serverFn/i.test(req.url()) &&
      /createDebitoPayment/i.test(req.url()),
    { timeout: 20_000 },
  );
  await page.getByRole("button", { name: /Pagar/i }).click();
  const req = await serverFnReq.catch(() => null);
  console.log("  server-fn URL:", req?.url()?.slice(0, 90) ?? "N/A");

  // 5) Aguarda o UI mostrar pending OR error
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `/tmp/browser/paywall/${m.code}-2-after-submit.png` });

  // 6) Lê a linha criada
  const { data: rows } = await admin
    .from("debito_payments")
    .select("id,source_id,status,pack_kind,pack_quantity")
    .eq("user_id", userId)
    .eq("payment_method", m.code)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = rows?.[0] as any;
  if (!row) throw new Error("Linha debito_payments não encontrada");
  console.log("  DB row:", row);

  // 7) Baseline de créditos
  const { data: before } = await admin
    .from("user_credits")
    .select("boost_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const balBefore = (before as any)?.boost_balance ?? 0;

  // 8) Webhook assinado
  const payload = JSON.stringify({
    source_id: row.source_id,
    payment_id: `e2e-${m.code}-${Date.now()}`,
    reference: `E2E-${row.source_id.slice(0, 8)}`,
    status: "success",
    event: "payment.completed",
  });
  const sig = createHmac("sha256", SECRET!).update(payload).digest("hex");
  const wh = await fetch(`${BASE_URL}/api/public/debito-webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-debito-signature": sig },
    body: payload,
  });
  console.log("  webhook:", wh.status, await wh.text());
  if (!wh.ok) throw new Error("Webhook falhou");

  // 9) Verifica
  await new Promise((r) => setTimeout(r, 1500));
  const { data: after } = await admin
    .from("user_credits")
    .select("boost_balance")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: rowAfter } = await admin
    .from("debito_payments")
    .select("status")
    .eq("id", row.id)
    .maybeSingle();

  const balAfter = (after as any)?.boost_balance ?? 0;
  const delta = balAfter - balBefore;
  console.log(`  status=${(rowAfter as any)?.status}  boost: ${balBefore} → ${balAfter} (Δ ${delta})`);
  if ((rowAfter as any)?.status !== "success") throw new Error("row.status != success");
  if (delta < row.pack_quantity) throw new Error(`Créditos não incrementaram (esperado +${row.pack_quantity})`);

  await page.screenshot({ path: `/tmp/browser/paywall/${m.code}-3-final.png` });
  console.log(`  ✅ ${m.label} OK`);
}

async function main() {
  const session = await getSession();
  const userId = session.user.id;
  console.log(`user_id: ${userId}`);

  // client autenticado (RLS como o utilizador) — usado como "leitor" da BD.
  const admin = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false },
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await seedSession(page, session);
    for (const m of METHODS) {
      await runOne(page, admin, userId, m);
    }
    console.log("\n✅ E2E Paywall (mpesa + emola) OK");
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("\n❌ E2E falhou:", e);
  process.exit(1);
});
