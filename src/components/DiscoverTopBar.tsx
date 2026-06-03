import { motion } from 'framer-motion';
import { SlidersHorizontal, Zap } from 'lucide-react';
import { hapticTap } from '@/hooks/useNativePlatform';

interface DiscoverTopBarProps {
  onOpenFilters: () => void;
  onBoost?: () => void;
  boostActive?: boolean;
  boostRemainingMinutes?: number;
}

export const DiscoverTopBar = ({
  onOpenFilters,
  onBoost,
  boostActive = false,
}: DiscoverTopBarProps) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {/* Frosted blur band behind tabs */}
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
        {/* Filters */}
        <motion.button
          onClick={() => { hapticTap(); onOpenFilters(); }}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-white"
          style={{ background: 'transparent', border: 'none' }}
          whileTap={{ scale: 0.9 }}
          aria-label="Filtros"
        >
          <SlidersHorizontal size={24} strokeWidth={1.8} color="#fff" />
        </motion.button>

        <div className="flex-1" />

        {/* Boost — clean premium lightning */}
        {onBoost && (
          <motion.button
            onClick={() => { hapticTap(); onBoost(); }}
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              background: 'transparent',
              border: 'none',
              padding: 0,
              willChange: 'transform',
            }}
            whileTap={{ scale: 0.88 }}
            aria-label="Boost"
          >
            {boostActive && (
              <>
                {/* Outer breathing halo */}
                <motion.span
                  aria-hidden
                  animate={{ opacity: [0.45, 0.8, 0.45] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute pointer-events-none"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(236,72,153,0.55) 0%, rgba(168,85,247,0.28) 45%, transparent 72%)',
                    filter: 'blur(6px)',
                    willChange: 'opacity',
                  }}
                />
              </>
            )}

            {/* Lightning icon — gentle pulse */}
            <motion.div
              animate={
                boostActive
                  ? { scale: [1, 1.08, 1] }
                  : { scale: 1 }
              }
              transition={
                boostActive
                  ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
              style={{
                position: 'relative',
                zIndex: 2,
                filter: boostActive
                  ? 'drop-shadow(0 0 8px rgba(236,72,153,0.9)) drop-shadow(0 0 3px rgba(255,255,255,0.6))'
                  : 'drop-shadow(0 0 6px rgba(192,38,211,0.55))',
                willChange: 'transform',
              }}
            >
              <Zap
                size={26}
                fill={boostActive ? '#fff' : '#C026D3'}
                stroke="none"
              />
            </motion.div>
          </motion.button>
        )}
      </div>
    </div>
  );
};
