export function SettingsListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="px-4 space-y-3 pt-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-2xl bg-card border border-border animate-pulse"
        />
      ))}
    </div>
  );
}
