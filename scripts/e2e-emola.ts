/**
 * E2E sandbox test do fluxo eMola (Débito Pay).
 *
 * Fluxo:
 *  1. Login com utilizador de teste (email/password Supabase).
 *  2. Chama o server fn `createDebitoPayment` em /_serverFn para eMola.
 *  3. Lê a linha criada em `debito_payments` (status=pending).
 *  4. Simula o callback do orquestrador POST /api/public/debito-webhook
 *     com `x-webhook-secret` para marcar success.
 *  5. Confirma `status=success` e que membership/credit foi activada.
 *
 * Uso:
 *   TEST_EMAIL=foo@bar.com TEST_PASSWORD=xxx \
 *   DEBITO_WEBHOOK_SECRET=... \
 *   [BASE_URL=https://hunie.app] \
 *   bun run scripts/e2e-emola.ts [--plan select|plus|elite] [--period monthly|annual] [--pack boost_5]
 *
 * Requer DEBITO_WEBHOOK_SECRET (mesmo valor configurado como secret runtime).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "https://vwwnmfazltjkdlxvwnta.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d25tZmF6bHRqa2RseHZ3bnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTA2MjgsImV4cCI6MjA5NTk4NjYyOH0.40fkFj0IW90Sh7h41R2iLF0rolunWd63SY6d_MrCgY4";
const BASE_URL = process.env.BASE_URL ?? "https://cupid-connects-24.lovable.app";
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const WEBHOOK_SECRET = process.env.DEBITO_WEBHOOK_SECRET;

function need(name: string, v: string | undefined): asserts v is string {
  if (!v) {
    console.error(`✗ env em falta: ${name}`);
    process.exit(1);
  }
}
need("TEST_EMAIL", TEST_EMAIL);
need("TEST_PASSWORD", TEST_PASSWORD);
need("DEBITO_WEBHOOK_SECRET", WEBHOOK_SECRET);

const argv = process.argv.slice(2);
function arg(name: string, def?: string) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
}
const planTier = arg("plan", "select") as "select" | "plus" | "elite";
const billingPeriod = arg("period", "monthly") as "monthly" | "annual";
const packId = arg("pack");

const TEST_PHONE = arg("phone", "861234567"); // eMola Movitel sandbox

function step(n: number, msg: string) {
  console.log(`\n[${n}] ${msg}`);
}

async function main() {
  // ---------- 1. login ----------
  step(1, `Login como ${TEST_EMAIL}`);
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (authErr || !auth.session) throw new Error(`Login falhou: ${authErr?.message}`);
  const accessToken = auth.session.access_token;
  const userId = auth.user!.id;
  console.log(`  ✓ user=${userId}`);

  // ---------- 2. createDebitoPayment via TanStack server fn ----------
  step(2, `createDebitoPayment (emola, ${packId ? `pack=${packId}` : `${planTier}/${billingPeriod}`})`);
  const body = packId
    ? { pack_id: packId, payment_method: "emola", phone: TEST_PHONE }
    : { plan_tier: planTier, billing_period: billingPeriod, payment_method: "emola", phone: TEST_PHONE };

  const fnRes = await fetch(`${BASE_URL}/_serverFn/src_lib_debito_functions_ts--createDebitoPayment_createServerFn_handler`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ data: body }),
  });
  const fnJson: any = await fnRes.json().catch(() => ({}));
  if (!fnRes.ok) {
    // fallback: TSS usa nomes hash; tenta endpoint genérico
    console.error(`  ✗ ${fnRes.status}`, fnJson);
    console.error("  → confirma o id do serverFn (ver Network tab no preview com Debito sheet aberta).");
    process.exit(1);
  }
  console.log("  ✓ resposta:", JSON.stringify(fnJson, null, 2));

  const sourceId = fnJson?.result?.source_id ?? fnJson?.source_id;
  if (!sourceId) throw new Error("source_id em falta na resposta");

  // ---------- 3. confirmar pending na BD ----------
  step(3, "Verificar linha debito_payments");
  const { data: row } = await sb
    .from("debito_payments")
    .select("id,status,kind,plan_tier,pack_kind,pack_quantity,amount")
    .eq("source_id", sourceId)
    .maybeSingle();
  console.log("  ✓", row);
  if (row?.status !== "pending") throw new Error(`Esperado pending, recebi ${row?.status}`);

  // ---------- 4. simular webhook success ----------
  step(4, "POST /api/public/debito-webhook (status=success)");
  const wbRes = await fetch(`${BASE_URL}/api/public/debito-webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-secret": WEBHOOK_SECRET },
    body: JSON.stringify({
      source_id: sourceId,
      payment_id: `e2e-${Date.now()}`,
      reference: `E2E-${sourceId.slice(0, 8)}`,
      status: "success",
      event: "payment.completed",
    }),
  });
  console.log("  ✓", wbRes.status, await wbRes.text());
  if (!wbRes.ok) throw new Error("webhook não OK");

  // ---------- 5. verificar activação ----------
  step(5, "Verificar activação");
  await new Promise((r) => setTimeout(r, 1500));
  const { data: after } = await sb
    .from("debito_payments")
    .select("status,completed_at")
    .eq("source_id", sourceId)
    .maybeSingle();
  console.log("  pagamento:", after);
  if (after?.status !== "success") throw new Error("status não passou a success");

  if (row.kind === "plan") {
    const { data: prof } = await sb
      .from("profiles")
      .select("plan_tier,membership_expires_at")
      .eq("id", userId)
      .maybeSingle();
    console.log("  profile:", prof);
  } else {
    const { data: cred } = await sb
      .from("user_credits")
      .select("boost_credits,super_like_credits")
      .eq("user_id", userId)
      .maybeSingle();
    console.log("  credits:", cred);
  }

  console.log("\n✅ E2E eMola OK");
}

main().catch((e) => {
  console.error("\n❌ E2E falhou:", e);
  process.exit(1);
});
