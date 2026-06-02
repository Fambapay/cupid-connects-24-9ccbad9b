// Compute a human-friendly "activity" status from a profile's
// `is_online` flag + `last_seen_at` timestamp.
//
// We don't blindly trust `is_online`: the presence heartbeat only flips it
// to false on visibility change, so a closed tab / killed app can leave the
// flag stuck as `true`. To call someone *live*, we also require that
// `last_seen_at` was updated within the last LIVE_WINDOW_MS (one heartbeat
// cycle + a small grace period).

export type ActivityLevel = 'live' | 'recent' | 'today' | 'week' | 'stale';

export interface ActivityStatus {
  level: ActivityLevel;
  label: string;     // e.g. "Ativa agora", "Ativa há 12 min"
  short: string;     // compact for tight UI ("agora", "12m", "3h", "2d")
  dot: string;       // hex color for the indicator dot
  isLive: boolean;
}

// ~2.5x heartbeat (30s) — gives one missed beat of slack before we
// stop calling the user "live".
const LIVE_WINDOW_MS = 75_000;

export function getActivityStatus(
  isOnline?: boolean | null,
  lastSeenAt?: string | Date | null,
): ActivityStatus {
  const last = lastSeenAt ? new Date(lastSeenAt).getTime() : NaN;
  const now = Date.now();
  const ageMs = Number.isFinite(last) ? now - last : Number.POSITIVE_INFINITY;

  const live = !!isOnline && ageMs <= LIVE_WINDOW_MS;

  if (live) {
    return {
      level: 'live',
      label: 'Ativa agora',
      short: 'agora',
      dot: '#1DB954',
      isLive: true,
    };
  }

  // No timestamp at all → unknown / never seen.
  if (!Number.isFinite(last)) {
    return {
      level: 'stale',
      label: 'Inativa',
      short: '',
      dot: '#8a8a8a',
      isLive: false,
    };
  }

  const min = Math.round(ageMs / 60_000);
  const hours = Math.round(ageMs / 3_600_000);
  const days = Math.round(ageMs / 86_400_000);

  if (min < 30) {
    return {
      level: 'recent',
      label: `Ativa há ${Math.max(min, 1)} min`,
      short: `${Math.max(min, 1)}m`,
      dot: '#1DB954',
      isLive: false,
    };
  }

  if (hours < 24) {
    return {
      level: 'today',
      label: hours <= 1 ? 'Ativa há 1 h' : `Ativa há ${hours} h`,
      short: `${hours}h`,
      dot: '#FFB020',
      isLive: false,
    };
  }

  if (days <= 7) {
    return {
      level: 'week',
      label: days <= 1 ? 'Ativa ontem' : `Ativa há ${days} dias`,
      short: `${days}d`,
      dot: '#9aa0a6',
      isLive: false,
    };
  }

  return {
    level: 'stale',
    label: 'Inativa',
    short: '',
    dot: '#6b6f76',
    isLive: false,
  };
}