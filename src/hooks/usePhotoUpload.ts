import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface PhotoRow {
  id: string;
  storage_path: string;
  position: number;
  url?: string;
}

const BUCKET = "profile-photos";
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.82;

async function signUrl(path: string) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl;
}

async function compressImage(file: File): Promise<Blob> {
  // Skip compression for small files or non-images
  if (!file.type.startsWith("image/") || file.size < 400 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function usePhotoUpload() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("profile_id", user.id)
      .order("position", { ascending: true });
    const rows = (data ?? []) as PhotoRow[];
    const withUrls = await Promise.all(
      rows.map(async (r) => ({ ...r, url: await signUrl(r.storage_path) })),
    );
    setPhotos(withUrls);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File) => {
    if (!user) throw new Error("Not authenticated");
    setLoading(true);

    // Optimistic preview using local object URL
    const tempId = `temp-${crypto.randomUUID()}`;
    const previewUrl = URL.createObjectURL(file);
    const tempPos = photos.length;
    setPhotos((p) => [
      ...p,
      { id: tempId, storage_path: "", position: tempPos, url: previewUrl },
    ]);

    try {
      const compressed = await compressImage(file);
      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: false, contentType: "image/jpeg" });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: user.id,
          storage_path: path,
          position: tempPos,
        })
        .select()
        .single();
      if (error) throw error;

      const url = await signUrl(path);
      setPhotos((p) =>
        p.map((x) =>
          x.id === tempId ? { ...(data as PhotoRow), url: url ?? previewUrl } : x,
        ),
      );
      // Revoke preview shortly after the real URL is set
      setTimeout(() => URL.revokeObjectURL(previewUrl), 2000);
    } catch (err) {
      // Rollback optimistic entry
      setPhotos((p) => p.filter((x) => x.id !== tempId));
      URL.revokeObjectURL(previewUrl);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    if (target.storage_path) {
      await supabase.storage.from(BUCKET).remove([target.storage_path]);
      await supabase.from("profile_photos").delete().eq("id", id);
    }
    setPhotos((p) =>
      p.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i })),
    );
  };

  return { photos, loading, upload, remove, reload: load };
}
