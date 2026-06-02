import { useEffect, useState } from "react";

export interface TypewriterOpts {
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}

export function useTypewriter(words: string[], opts: TypewriterOpts = {}) {
  const { typeMs = 70, deleteMs = 40, holdMs = 2200 } = opts;
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    if (!words.length) return;
    const word = words[idx % words.length];
    if (!del && sub === word) {
      const t = setTimeout(() => setDel(true), holdMs);
      return () => clearTimeout(t);
    }
    if (del && sub === "") {
      setDel(false);
      setIdx((i) => (i + 1) % words.length);
      return;
    }
    const t = setTimeout(
      () => setSub((s) => (del ? s.slice(0, -1) : word.slice(0, s.length + 1))),
      del ? deleteMs : typeMs,
    );
    return () => clearTimeout(t);
  }, [sub, del, idx, words, typeMs, deleteMs, holdMs]);

  return sub;
}
