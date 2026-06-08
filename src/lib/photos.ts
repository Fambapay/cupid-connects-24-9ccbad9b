import { supabase } from "@/integrations/supabase/client";

const BUCKET = "profile-photos";
const MIN_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

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

function isExternalUrl(p: string): boolean {
  return p.startsWith("http://") || p.startsWith("https://");
}

export async function signPhoto(
  path: string,
  expires = 3600,
  transform?: TransformOpts,
): Promise<string> {
  const effectiveExpires = Math.max(expires, MIN_SIGNED_URL_TTL_SECONDS);
  if (!path) return "";
  if (isExternalUrl(path)) return path;
  const key = cacheKey(path, transform);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now() + 60_000) return hit.url;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, effectiveExpires, transform ? { transform } : undefined);
  const url = data?.signedUrl ?? "";
  if (url) cache.set(key, { url, expiresAt: Date.now() + effectiveExpires * 1000 });
  return url;
}

export async function signPhotos(
  paths: string[],
  expires = 3600,
  transform?: TransformOpts,
): Promise<string[]> {
  const effectiveExpires = Math.max(expires, MIN_SIGNED_URL_TTL_SECONDS);
  if (!paths.length) return [];

  const results = new Array<string>(paths.length);
  const missingIdx: number[] = [];
  const missingPaths: string[] = [];

  paths.forEach((p, i) => {
    if (!p) {
      results[i] = "";
      return;
    }
    if (isExternalUrl(p)) {
      results[i] = p;
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
    if (transform) {
      // createSignedUrls (plural) doesn't accept transform — fan out singular calls in parallel.
      const signed = await Promise.all(
        missingPaths.map((p) =>
          supabase.storage.from(BUCKET).createSignedUrl(p, effectiveExpires, { transform }),
        ),
      );
      signed.forEach((res, j) => {
        const url = res.data?.signedUrl ?? "";
        const idx = missingIdx[j];
        results[idx] = url;
        if (url) {
          cache.set(cacheKey(missingPaths[j], transform), {
            url,
            expiresAt: Date.now() + effectiveExpires * 1000,
          });
        }
      });
    } else {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(missingPaths, effectiveExpires);
      (data ?? []).forEach((d, j) => {
        const url = d.signedUrl ?? "";
        const idx = missingIdx[j];
        results[idx] = url;
        if (url) {
          cache.set(cacheKey(missingPaths[j], transform), {
            url,
            expiresAt: Date.now() + effectiveExpires * 1000,
          });
        }
      });
    }
  }


  return results;
}
