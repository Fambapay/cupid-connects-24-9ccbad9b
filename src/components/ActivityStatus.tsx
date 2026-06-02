import { getActivityStatus } from '@/lib/activityStatus';

interface Props {
  isOnline?: boolean | null;
  lastSeenAt?: string | Date | null;
  variant?: 'pill' | 'dot' | 'inline';
  /** Hide entirely once activity falls below this level. */
  hideBelow?: 'live' | 'recent' | 'today' | 'week';
  className?: string;
  style?: React.CSSProperties;
}

const order = { live: 4, recent: 3, today: 2, week: 1, stale: 0 } as const;

export const ActivityStatus = ({
  isOnline,
  lastSeenAt,
  variant = 'pill',
  hideBelow,
  className,
  style,
}: Props) => {
  const s = getActivityStatus(isOnline, lastSeenAt);
  if (hideBelow && order[s.level] < order[hideBelow]) return null;
  if (s.level === 'stale') return null;

  if (variant === 'dot') {
    return (
      <span
        aria-label={s.label}
        title={s.label}
        className={className}
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: s.dot,
          boxShadow: s.isLive ? `0 0 0 2px ${s.dot}33` : 'none',
          ...style,
        }}
      />
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 500,
          color: 'inherit',
          ...style,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: s.dot,
            boxShadow: s.isLive ? `0 0 0 3px ${s.dot}25` : 'none',
          }}
        />
        <span style={{ letterSpacing: -0.1 }}>{s.label}</span>
      </span>
    );
  }

  // pill
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: s.isLive ? s.dot : 'rgba(0,0,0,0.55)',
        borderRadius: 12,
        padding: '3px 10px',
        ...style,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#fff',
          opacity: s.isLive ? 1 : 0.9,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: -0.1,
        }}
      >
        {s.label}
      </span>
    </span>
  );
};

export default ActivityStatus;