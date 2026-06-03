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
  boostRemainingMinutes = 0,
}: DiscoverTopBarProps) => {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-30"
      style={{ pointerEvents: 'none' }}
    >
      {/* Frosted blur band */}
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

        {/* Boost — premium animated */}
        {onBoost && (
          <motion.button
            onClick={() => { hapticTap(); onBoost(); }}
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            whileTap={{ scale: 0.88 }}
            aria-label="Boost"
          >
            {boostActive && (
              <>
                {/* Outer soft halo (breathing) */}
                <span
                  aria-hidden
                  className="boost-halo"
                  style={{
                    position: 'absolute',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background:
                      'radial-gradient(circle, rgba(236,72,153,0.5) 0%, rgba(168,85,247,0.25) 45%, transparent 72%)',
                    filter: 'blur(6px)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Rotating conic ring — pure CSS, no flicker */}
                <span
                  aria-hidden
                  className="boost-ring"
                  style={{
                    position: 'absolute',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background:
                      'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.95) 50deg, rgba(236,72,153,1) 95deg, rgba(168,85,247,0.6) 130deg, transparent 170deg, transparent 360deg)',
                    WebkitMask:
                      'radial-gradient(circle, transparent 16px, black 17px, black 19px, transparent 20px)',
                    mask: 'radial-gradient(circle, transparent 16px, black 17px, black 19px, transparent 20px)',
                    pointerEvents: 'none',
                  }}
                />

              </>
            )}

            {/* Lightning icon */}
            <span
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                filter: boostActive
                  ? 'drop-shadow(0 0 8px rgba(236,72,153,0.9)) drop-shadow(0 0 3px rgba(255,255,255,0.6))'
                  : 'drop-shadow(0 0 6px rgba(192,38,211,0.55))',
              }}
            >
              <Zap
                size={26}
                fill={boostActive ? '#fff' : '#C026D3'}
                stroke="none"
              />
            </span>

            <style>{`
              @keyframes boost-ring-spin {
                to { transform: rotate(360deg); }
              }
              .boost-ring {
                animation: boost-ring-spin 3.5s linear infinite;
                will-change: transform;
              }
              @keyframes boost-halo-breathe {
                0%, 100% { opacity: 0.55; transform: scale(1); }
                50% { opacity: 0.9; transform: scale(1.06); }
              }
              .boost-halo {
                animation: boost-halo-breathe 2.6s ease-in-out infinite;
                will-change: opacity, transform;
              }
            `}</style>
          </motion.button>
        )}
      </div>
    </div>
  );
};
