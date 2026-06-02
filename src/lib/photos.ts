import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";

export async function signPhoto(path: string, expires = 3600): Promise<string> {
  if (!path) return "";
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, expires);
  return data?.signedUrl ?? "";
}

export async function signPhotos(paths: string[], expires = 3600): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expires);
  return (data ?? []).map((d) => d.signedUrl ?? "");
}
