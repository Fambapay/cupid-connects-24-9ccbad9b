import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";

export interface Liker {
  id: string;
  name: string;
  age: number;
  city: string;
  photo: string;
  isSuper: boolean;
  firstImpression?: string | null;
}

interface RpcRow {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  photo_path: string | null;
  teaser_photo_path: string | null;
  is_super: boolean;
  first_impression: string | null;
}

interface RpcResponse {
  reveal: boolean;
  likers: RpcRow[];
}

export function useLikedMe() {
  const { user } = useAuth();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLikers([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await (supabase.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: unknown; error: unknown }>)("get_who_liked_me");
      if (rpcError) throw rpcError;

      const resp = (data as RpcResponse | null) ?? { reveal: false, likers: [] };
      const rows = resp.likers ?? [];

      if (!rows.length) {
        setLikers([]);
        setLoading(false);
        return;
      }

      // Server decides reveal. Sign the appropriate photo path with the
      // matching size — teaser is pixelated and cannot be up-signed.
      const paths = rows
        .map((r) => (resp.reveal ? r.photo_path : r.teaser_photo_path))
        .filter((p): p is string => !!p);

      const signed = paths.length
        ? await signPhotos(
            paths,
            3600,
            resp.reveal
              ? { width: 240, height: 320, resize: "cover", quality: 65 }
              : { width: 32, height: 40, resize: "cover", quality: 25 },
          )
        : [];

      const urlByPath: Record<string, string> = {};
      paths.forEach((p, i) => (urlByPath[p] = signed[i] ?? ""));

      setLikers(
        rows.map((r) => {
          const path = resp.reveal ? r.photo_path : r.teaser_photo_path;
          return {
            id: r.id,
            name: resp.reveal ? r.name ?? "Alguém" : "",
            age: r.age ?? 0,
            city: resp.reveal ? r.city ?? "" : "",
            photo: path ? urlByPath[path] ?? "" : "",
            isSuper: !!r.is_super,
            firstImpression: r.first_impression,
          };
        }),
      );
      setLoading(false);
    } catch (e) {
      console.error("useLikedMe load failed", e);
      setError(e instanceof Error ? e.message : "Falha ao carregar likes");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { likers, loading, error, reload: load };
}
