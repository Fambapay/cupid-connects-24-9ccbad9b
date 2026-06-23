import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signPhoto } from "@/lib/photos";
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
const MIN_COMPRESS_SIZE = 400 * 1024;

// Resize on the edge so the profile page doesn't pull full 1600px JPEGs
// when we only render small thumbnails / a 68px avatar.
async function signUrl(path: string) {
  return signPhoto(path, 3600, { width: 480, quality: 75, resize: "cover" });
}

function makeUploadId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto?.getRandomValues?.(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || `${Date.now()}-${Math.random()}`;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

function extensionForType(type: string, fallbackName = "") {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  const fallback = fallbackName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return fallback || "jpg";
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler esta imagem."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  if (canvas.toBlob) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  }
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return Promise.resolve(new Blob([bytes], { type: mime }));
}

async function compressImage(file: File): Promise<Blob> {
  if (!isImageFile(file)) throw new Error("Formato de imagem inválido.");
  if (file.type === "image/gif") return file;

  try {
    const img = await loadImageFromFile(file);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return file;
    const scale = Math.min(1, MAX_DIM / Math.max(width, height));
    if (file.size < MIN_COMPRESS_SIZE && scale === 1 && file.type && file.type !== "image/heic" && file.type !== "image/heif") {
      return file;
    }
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await canvasToBlob(canvas);
    return blob && (blob.size < file.size || file.type === "image/heic" || file.type === "image/heif") ? blob : file;
  } catch {
    return file;
  }
}

const photosCache = new Map<string, PhotoRow[]>();

export function usePhotoUpload() {
  const { user } = useAuth();
  const cached = user ? photosCache.get(user.id) ?? [] : [];
  const [photos, setPhotos] = useState<PhotoRow[]>(cached);
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
    photosCache.set(user.id, withUrls);
    setPhotos(withUrls);
  }, [user]);

  useEffect(() => {
    if (user) {
      const c = photosCache.get(user.id);
      if (c) setPhotos(c);
    }
    load();
  }, [load, user]);


  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const reload = () => load();
    const reloadWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reloadWhenVisible);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reloadWhenVisible);
    };
  }, [user, load]);

  const upload = async (file: File, opts?: { position?: number }) => {
    // Fetch the current user directly from supabase to avoid race conditions
    // where the local `useAuth` state hasn't hydrated yet on mount.
    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData.user ?? user;
    if (!currentUser) throw new Error("Not authenticated");
    setLoading(true);

    // Optimistic preview using local object URL
    const tempId = `temp-${makeUploadId()}`;
    const previewUrl = URL.createObjectURL(file);
    const tempPos = photos.length;
    setPhotos((p) => [
      ...p,
      { id: tempId, storage_path: "", position: tempPos, url: previewUrl },
    ]);

    try {
      const compressed = await compressImage(file);
      const contentType = compressed.type || file.type || "image/jpeg";
      const path = `${currentUser.id}/${makeUploadId()}.${extensionForType(contentType, file.name)}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, compressed, { upsert: false, contentType });
      if (upErr) throw new Error(upErr.message || "Falha no upload");

      const { data, error } = await supabase
        .from("profile_photos")
        .insert({
          profile_id: currentUser.id,
          storage_path: path,
          position: tempPos,
        })
        .select()
        .single();
      if (error) throw new Error(error.message || "Falha no upload");

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
