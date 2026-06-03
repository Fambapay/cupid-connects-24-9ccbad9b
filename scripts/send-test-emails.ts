import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key, { auth: { persistSession: false } });

const email = "arnaldomeque33@gmail.com";
const redirectTo = "https://hunie.app/discover";

async function run() {
  // 1. Recovery (password reset)
  const r1 = await admin.auth.resetPasswordForEmail(email, { redirectTo: "https://hunie.app/reset-password" });
  console.log("recovery:", r1.error?.message ?? "sent");

  // 2. Magic link
  const r2 = await admin.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo, shouldCreateUser: false } });
  console.log("magic-link:", r2.error?.message ?? "sent");

  // 3. Signup confirmation (via admin generateLink, type=signup)
  const r3 = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password: "Hunie!" + Math.random().toString(36).slice(2, 10),
    options: { redirectTo: "https://hunie.app/onboarding?step=1" },
  });
  console.log("signup:", r3.error?.message ?? "sent");
}
run().catch((e) => { console.error(e); process.exit(1); });
