import { InAppReview } from "@capacitor-community/in-app-review";
import { Preferences } from "@capacitor/preferences";
import { isNative } from "./platform";

const REVIEW_LAST_SHOWN_KEY = "hunie:review:last_shown";
const REVIEW_MATCH_COUNT_KEY = "hunie:review:match_count";
const COOLDOWN_DAYS = 14;
const MIN_MATCHES = 3;

function daysBetween(a: number, b: number): number {
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

export async function maybeRequestReview(): Promise<void> {
  if (!isNative()) return;

  const [lastShownRes, matchCountRes] = await Promise.all([
    Preferences.get({ key: REVIEW_LAST_SHOWN_KEY }),
    Preferences.get({ key: REVIEW_MATCH_COUNT_KEY }),
  ]);

  const matchCount = parseInt(matchCountRes.value ?? "0", 10) || 0;
  const lastShown = lastShownRes.value ? parseInt(lastShownRes.value, 10) : 0;

  if (matchCount < MIN_MATCHES) return;
  if (lastShown && daysBetween(Date.now(), lastShown) < COOLDOWN_DAYS) return;

  try {
    await InAppReview.requestReview();
    await Preferences.set({
      key: REVIEW_LAST_SHOWN_KEY,
      value: String(Date.now()),
    });
    await Preferences.set({ key: REVIEW_MATCH_COUNT_KEY, value: "0" });
  } catch {
    // Silently ignore if the OS refuses (e.g. quota exhausted).
  }
}

export async function recordMatch(): Promise<void> {
  if (!isNative()) return;
  const res = await Preferences.get({ key: REVIEW_MATCH_COUNT_KEY });
  const count = (parseInt(res.value ?? "0", 10) || 0) + 1;
  await Preferences.set({ key: REVIEW_MATCH_COUNT_KEY, value: String(count) });
}
