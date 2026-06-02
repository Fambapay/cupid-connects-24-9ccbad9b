import { motion } from 'framer-motion';
import { SlidersHorizontal, Zap } from 'lucide-react';
import { hapticTap } from '@/hooks/useNativePlatform';

interface DiscoverTopBarProps {
  onOpenFilters: () => void;
  onBoost?: () => void;
}

export const DiscoverTopBar = ({
  onOpenFilters,
  onBoost,
}: DiscoverTopBarProps) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {/* Frosted blur band behind tabs (Tinder-style) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 'calc(max(var(--sat, 54px), 54px) + 52px)',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 75%, transparent 100%)',
          backdropFilter: 'blur(14px) saturate(160%)',
          WebkitBackdropFilter: 'blur(14px) saturate(160%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 65%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, black 65%, transparent 100%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        className="relative flex items-center gap-2"
        style={{
          paddingTop: 'max(var(--sat, 54px), 54px)',
          paddingBottom: 0,
          paddingLeft: 12,
          paddingRight: 12,
          pointerEvents: 'auto',
          zIndex: 1,
        }}
      >
      {/* Filters — dark glass round (36px) */}
      <motion.button
        onClick={() => { hapticTap(); onOpenFilters(); }}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-white"
        style={{ background: 'transparent', border: 'none' }}
        whileTap={{ scale: 0.9 }}
        aria-label="Filtros"
      >
        <SlidersHorizontal size={24} strokeWidth={1.8} color="#fff" />
      </motion.button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Boost — purple lightning */}
      {onBoost && (
        <motion.button
          onClick={() => { hapticTap(); onBoost(); }}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
          style={{
            background: 'transparent',
            border: 'none',
            filter: 'drop-shadow(0 0 6px rgba(192,38,211,0.6))',
          }}
          whileTap={{ scale: 0.85 }}
          aria-label="Boost"
        >
          <Zap size={26} fill="#C026D3" stroke="none" />
        </motion.button>
      )}
      </div>
    </div>
  );
};
