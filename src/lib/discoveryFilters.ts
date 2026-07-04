/**
 * Discovery filter contracts — UI ↔ RPC (`public.get_discovery_feed`).
 *
 * The RPC does the actual UI→DB translation for gender (see the CASE block
 * near the top of the function). This file mirrors that contract so any
 * change on one side is a lot harder to make silently: if you add a new UI
 * gender value, TypeScript here forces you to also decide the DB values,
 * and a mismatch versus the SQL becomes obvious in code review.
 *
 * IF YOU EDIT THIS MAP: update the CASE in the RPC migration in the same
 * change, and vice-versa. The mapping is duplicated on purpose.
 */
import type { DiscoveryFilters } from "@/components/FiltersSheet";
import { DEFAULT_FILTERS } from "@/components/FiltersSheet";

export type UiGender = DiscoveryFilters["gender"];

/**
 * Source-of-truth documentation of the gender values `get_discovery_feed`
 * expects in `_filters->>'gender'` and the DB `profiles.gender` values each
 * one expands to server-side. Not consumed at runtime — the RPC owns the
 * translation. Keep in sync with the RPC.
 */
export const GENDER_UI_TO_DB: Record<Exclude<UiGender, "todos">, readonly string[]> = {
  feminino: ["woman", "transwoman"],
  masculino: ["man", "transman"],
  nao_binario: ["nonbinary", "genderfluid", "agender", "other"],
} as const;

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

// Scoped per-user so signing in as a different account starts clean.
const STORAGE_PREFIX = "hunie:filters:";

function keyFor(uid: string | null | undefined): string | null {
  return uid ? STORAGE_PREFIX + uid : null;
}

export function loadFilters(uid: string | null | undefined): DiscoveryFilters | null {
  const key = keyFor(uid);
  if (!key || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiscoveryFilters>;
    // Merge over defaults so newly-added fields don't come back undefined
    // for users who saved an older shape.
    return { ...DEFAULT_FILTERS, ...parsed, lifestyle: { ...DEFAULT_FILTERS.lifestyle, ...(parsed.lifestyle ?? {}) } };
  } catch {
    return null;
  }
}

export function saveFilters(uid: string | null | undefined, filters: DiscoveryFilters): void {
  const key = keyFor(uid);
  if (!key || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(filters));
  } catch {
    /* quota / private mode — ignore */
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Zero-out premium-gated fields so a cancelled subscription doesn't leave
 * "ghost" filters ready to revive on the next upgrade. Called whenever
 * `isPremium` flips to false.
 */
export function sanitizeForNonPremium(f: DiscoveryFilters): DiscoveryFilters {
  return {
    ...f,
    verifiedOnly: false,
    hasBio: false,
    heightMin: DEFAULT_FILTERS.heightMin,
    heightMax: DEFAULT_FILTERS.heightMax,
    interests: [],
    lifestyle: {},
    zodiac: [],
    education: [],
  };
}

/**
 * Count of filter groups diverging from wide-open defaults — used to badge
 * the filters button so the user knows the feed is narrowed.
 */
export function countActiveFilters(f: DiscoveryFilters): number {
  let n = 0;
  if (f.gender !== DEFAULT_FILTERS.gender) n++;
  if (f.ageMin !== DEFAULT_FILTERS.ageMin || f.ageMax !== DEFAULT_FILTERS.ageMax) n++;
  if (f.distance !== DEFAULT_FILTERS.distance) n++;
  if (f.onlineNow) n++;
  if (f.verifiedOnly) n++;
  if (f.hasBio) n++;
  if (f.heightMin !== DEFAULT_FILTERS.heightMin || f.heightMax !== DEFAULT_FILTERS.heightMax) n++;
  if (f.interests.length) n++;
  if (f.lifestyle.smoke || f.lifestyle.drink || f.lifestyle.workout) n++;
  if (f.zodiac.length) n++;
  if (f.education.length) n++;
  return n;
}

