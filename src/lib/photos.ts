import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";

type TransformOpts = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
};

// In-memory cache so navigating away and back is instant.
// Key = `${path}|${width}x${height}|${resize}|${quality}`
const cache = new Map<string, { url: string; expiresAt: number }>();

function cacheKey(path: string, t?: TransformOpts) {
  if (!t) return `${path}||`;
  return `${path}|${t.width ?? ""}x${t.height ?? ""}|${t.resize ?? ""}|${t.quality ?? ""}`;
}

export async function signPhoto(
  path: string,
  expires = 3600,
  transform?: TransformOpts,
): Promise<string> {
  if (!path) return "";
  const key = cacheKey(path, transform);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expires, transform ? { transform } : undefined);
  const url = data?.signedUrl ?? "";
  if (url) cache.set(key, { url, expiresAt: Date.now() + expires * 1000 });
  return url;
}

export async function signPhotos(
  paths: string[],
  expires = 3600,
  transform?: TransformOpts,
): Promise<string[]> {
  if (!paths.length) return [];

  const results = new Array<string>(paths.length);
  const missingIdx: number[] = [];
  const missingPaths: string[] = [];

  paths.forEach((p, i) => {
    if (!p) {
      results[i] = "";
      return;
    }
    const hit = cache.get(cacheKey(p, transform));
    if (hit && hit.expiresAt > Date.now() + 60_000) {
      results[i] = hit.url;
    } else {
      missingIdx.push(i);
      missingPaths.push(p);
    }
  });

  if (missingPaths.length) {
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(missingPaths, expires, transform ? { transform } : undefined);
    (data ?? []).forEach((d, j) => {
      const url = d.signedUrl ?? "";
      const idx = missingIdx[j];
      results[idx] = url;
      if (url) {
        cache.set(cacheKey(missingPaths[j], transform), {
          url,
          expiresAt: Date.now() + expires * 1000,
        });
      }
    });
  }

  return results;
}
