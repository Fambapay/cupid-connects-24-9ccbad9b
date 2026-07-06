import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const setPassportSchema = z.object({
  city: z.string().min(1).max(80),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const setPassport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof setPassportSchema>) => setPassportSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("set_passport", { _city: data.city, _lat: data.lat, _lng: data.lng });
    if (error) throw error;
    return res as { success: boolean; reason?: string; city?: string; expires_at?: string };
  });

export const clearPassport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: res, error } = await (context.supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown; error: unknown }>;
    }).rpc("clear_passport");
    if (error) throw error;
    return res as { success: boolean };
  });
