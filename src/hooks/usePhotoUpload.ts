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

async function signUrl(path: string) {
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl;
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
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      const nextPos = photos.length;
      const { data, error } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: user.id,
          storage_path: path,
          position: nextPos,
        })
        .select()
        .single();
      if (error) throw error;

      const url = await signUrl(path);
      setPhotos((p) => [...p, { ...(data as PhotoRow), url }]);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (!target) return;
    await supabase.storage.from(BUCKET).remove([target.storage_path]);
    await supabase.from("profile_photos").delete().eq("id", id);
    setPhotos((p) =>
      p.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i })),
    );
  };

  return { photos, loading, upload, remove, reload: load };
}
