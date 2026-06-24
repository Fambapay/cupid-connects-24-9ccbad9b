import { createClient } from "@supabase/supabase-js";
import * as React from "react";
import { render } from "@react-email/components";
import { TEMPLATES } from "../src/lib/email-templates/registry";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = "arnaldomeque33@gmail.com";
const SITE_NAME = "Hunie";
const FROM_DOMAIN = "love.hunie.app";
const SENDER_DOMAIN = "love.hunie.app";

async function sendAuth() {
  console.log("\n=== AUTH EMAILS ===");
  // Recovery
  const r1 = await admin.auth.resetPasswordForEmail(EMAIL, {
    redirectTo: "https://hunie.app/reset-password",
  });
  console.log("recovery:", r1.error?.message ?? "triggered");

  // Magic link
  const r2 = await admin.auth.signInWithOtp({
    email: EMAIL,
    options: { emailRedirectTo: "https://hunie.app/discover", shouldCreateUser: false },
  });
  console.log("magic-link:", r2.error?.message ?? "triggered");

  // Invite (new throwaway email so it doesn't conflict)
  const inviteEmail = `arnaldomeque33+invite${Date.now()}@gmail.com`;
  const r3 = await admin.auth.admin.inviteUserByEmail(inviteEmail, {
    redirectTo: "https://hunie.app/onboarding",
  });
  console.log("invite:", r3.error?.message ?? `triggered -> ${inviteEmail}`);

  // Email change (generateLink)
  const r4 = await admin.auth.admin.generateLink({
    type: "email_change_current",
    email: EMAIL,
    newEmail: `arnaldomeque33+new${Date.now()}@gmail.com`,
  });
  console.log("email_change:", r4.error?.message ?? "triggered");

  // Reauthentication
  const r5 = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: EMAIL,
  });
  console.log("magiclink-admin:", r5.error?.message ?? "triggered");
}

async function sendTransactional() {
  console.log("\n=== TRANSACTIONAL EMAILS ===");
  for (const [name, entry] of Object.entries(TEMPLATES)) {
    const props = {
      siteName: SITE_NAME,
      siteUrl: `https://${FROM_DOMAIN}`,
      recipient: EMAIL,
      ...(entry.previewData ?? {}),
    };
    const element = React.createElement(entry.component, props);
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof entry.subject === "function" ? entry.subject(props) : entry.subject;

    const messageId = crypto.randomUUID();
    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: name,
      recipient_email: EMAIL,
      status: "pending",
    });

    // Ensure unsubscribe token exists for this recipient
    const unsubToken = crypto.randomUUID().replace(/-/g, "");
    await admin
      .from("email_unsubscribe_tokens")
      .upsert({ token: unsubToken, email: EMAIL.toLowerCase() }, { onConflict: "email" });
    const { data: tokenRow } = await admin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", EMAIL.toLowerCase())
      .single();

    const { error } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: EMAIL,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: name,
        idempotency_key: `test-${name}-${Date.now()}`,
        unsubscribe_token: tokenRow?.token ?? unsubToken,
        queued_at: new Date().toISOString(),
      },
    });
    console.log(`${name}:`, error?.message ?? "queued");
  }
}

async function run() {
  await sendAuth();
  await sendTransactional();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
