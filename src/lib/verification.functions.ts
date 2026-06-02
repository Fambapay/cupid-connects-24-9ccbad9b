import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const POSES = {
  hand_right_cheek: "mão direita aberta ao lado da bochecha direita",
  thumbs_up: "polegar para cima junto ao queixo",
  peace_sign: "sinal de paz (V com dois dedos) ao lado da cara",
} as const;
export type PoseCode = keyof typeof POSES;

export const VERIFICATION_POSES = POSES;

export function pickRandomPose(): PoseCode {
  const keys = Object.keys(POSES) as PoseCode[];
  return keys[Math.floor(Math.random() * keys.length)];
}

const INPUT = z.object({
  selfie_path: z.string().min(3).max(512),
  pose_code: z.enum(["hand_right_cheek", "thumbs_up", "peace_sign"]),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAsDataUrl(client: any, bucket: string, path: string) {
  const { data, error } = await client.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Não foi possível abrir ${bucket}/${path}`);
  const buf = Buffer.from(await data.arrayBuffer());
  const mime = data.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify selfie belongs to the user's folder
    if (!data.selfie_path.startsWith(`${userId}/`)) {
      throw new Error("Caminho de selfie inválido");
    }

    // 2. Rate-limit: at most 5 pending/failed attempts in last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayAgo);
    if ((count ?? 0) >= 5) {
      throw new Error("Limite de tentativas diárias atingido. Tenta amanhã.");
    }

    // 3. Get up to 3 reference profile photos
    const { data: photos } = await supabase
      .from("profile_photos")
      .select("storage_path")
      .eq("profile_id", userId)
      .order("position", { ascending: true })
      .limit(3);

    if (!photos || photos.length === 0) {
      throw new Error("Adiciona pelo menos uma foto de perfil antes de verificar.");
    }

    // 4. Insert pending request
    const { data: row, error: insErr } = await supabaseAdmin
      .from("verification_requests")
      .insert({
        user_id: userId,
        selfie_path: data.selfie_path,
        pose_code: data.pose_code,
        status: "pending",
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error("Não foi possível registar pedido");

    // 5. Download selfie + reference photos as base64 data URLs (admin to bypass RLS)
    const selfieUrl = await fetchAsDataUrl(supabaseAdmin as never, "verification-selfies", data.selfie_path);
    const refUrls: string[] = [];
    for (const p of photos) {
      try {
        refUrls.push(await fetchAsDataUrl(supabaseAdmin as never, "profile-photos", p.storage_path));
      } catch {
        /* skip broken */
      }
    }
    if (refUrls.length === 0) throw new Error("Fotos de perfil em falta");

    // 6. Ask Lovable AI (Gemini Flash) to compare
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("Lovable AI não configurada");

    const poseDescription = POSES[data.pose_code];
    const systemPrompt = `És um sistema de verificação de identidade para uma app de encontros. Recebes uma SELFIE (primeira imagem) e ${refUrls.length} FOTO(S) DE REFERÊNCIA (do perfil da pessoa). Responde APENAS em JSON com este shape exato:
{"same_person": boolean, "pose_correct": boolean, "live_selfie": boolean, "score": number entre 0 e 1, "reason": string curto em português}

Critérios:
- same_person: true se a pessoa na selfie é claramente a mesma das fotos de referência.
- pose_correct: true se a selfie mostra: "${poseDescription}".
- live_selfie: true se parece uma selfie real (NÃO uma foto de outra foto, NÃO um screenshot, NÃO uma imagem gerada). Cara nítida, ambiente real, perspetiva de braço estendido.
- score: confiança global de que devemos aprovar (0 = rejeitar, 1 = aprovar com certeza).
- reason: 1 frase explicativa.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "SELFIE submetida agora:" },
              { type: "image_url", image_url: { url: selfieUrl } },
              { type: "text", text: "FOTOS DE REFERÊNCIA do perfil:" },
              ...refUrls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
              { type: "text", text: "Devolve apenas JSON válido, sem markdown." },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      await supabaseAdmin
        .from("verification_requests")
        .update({ status: "failed", ai_reason: "Sistema sobrecarregado, tenta de novo." })
        .eq("id", row.id);
      throw new Error("Sistema de verificação sobrecarregado. Tenta novamente em alguns minutos.");
    }
    if (aiRes.status === 402) {
      throw new Error("Créditos de IA esgotados. Contacta o suporte.");
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Lovable AI error", aiRes.status, text);
      throw new Error("Falha no sistema de verificação");
    }

    const aiJson = (await aiRes.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      same_person?: boolean;
      pose_correct?: boolean;
      live_selfie?: boolean;
      score?: number;
      reason?: string;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reason: "Resposta da IA inválida" };
    }

    const approved =
      !!parsed.same_person &&
      !!parsed.pose_correct &&
      !!parsed.live_selfie &&
      (parsed.score ?? 0) >= 0.7;

    await supabaseAdmin
      .from("verification_requests")
      .update({
        status: approved ? "approved" : "rejected",
        ai_score: parsed.score ?? null,
        ai_reason: parsed.reason ?? null,
        ai_raw: parsed as never,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (approved) {
      await supabaseAdmin.from("profiles").update({ is_verified: true }).eq("id", userId);
    }

    return {
      approved,
      score: parsed.score ?? 0,
      reason: parsed.reason ?? "",
      checks: {
        same_person: !!parsed.same_person,
        pose_correct: !!parsed.pose_correct,
        live_selfie: !!parsed.live_selfie,
      },
    };
  });

export const getVerificationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", userId)
      .single();
    const { data: last } = await supabase
      .from("verification_requests")
      .select("status, ai_reason, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      is_verified: !!profile?.is_verified,
      last_attempt: last ?? null,
    };
  });
