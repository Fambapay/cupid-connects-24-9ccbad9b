import { motion, AnimatePresence } from 'framer-motion';
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
          className="relative flex-shrink-0 w-11 h-11 flex items-center justify-center"
          style={{
            background: 'transparent',
            border: 'none',
            filter: boostActive
              ? 'drop-shadow(0 0 14px rgba(236,72,153,0.95)) drop-shadow(0 0 28px rgba(192,38,211,0.8))'
              : 'drop-shadow(0 0 6px rgba(192,38,211,0.6))',
          }}
          whileTap={{ scale: 0.85 }}
          aria-label="Boost"
        >
          <AnimatePresence>
            {boostActive && (
              <>
                {/* Expanding shockwave rings */}
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={`ring-${i}`}
                    aria-hidden
                    initial={{ scale: 0.5, opacity: 0.9 }}
                    animate={{ scale: 2.8, opacity: 0 }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: i * 0.6,
                    }}
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: '2px solid rgba(236,72,153,0.85)',
                      boxShadow: '0 0 12px rgba(236,72,153,0.6)',
                    }}
                  />
                ))}

                {/* Radiating rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                  <motion.span
                    key={`ray-${deg}`}
                    aria-hidden
                    initial={{ opacity: 0.3, scaleY: 0.6 }}
                    animate={{ opacity: [0.3, 1, 0.3], scaleY: [0.6, 1.2, 0.6] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.08,
                    }}
                    className="absolute pointer-events-none"
                    style={{
                      top: '50%',
                      left: '50%',
                      width: 2,
                      height: 10,
                      marginLeft: -1,
                      marginTop: -5,
                      background: 'linear-gradient(to top, transparent, #fff 60%, #fbbf24)',
                      borderRadius: 2,
                      transformOrigin: 'center 18px',
                      transform: `rotate(${deg}deg)`,
                    }}
                  />
                ))}

                {/* Soft pulsing glow halo */}
                <motion.span
                  aria-hidden
                  animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.9, 1.15, 0.9] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(236,72,153,0.55) 0%, rgba(168,85,247,0.35) 40%, transparent 70%)',
                    filter: 'blur(4px)',
                  }}
                />
              </>
            )}
          </AnimatePresence>

          <motion.div
            animate={
              boostActive
                ? { scale: [1, 1.18, 1], rotate: [0, -8, 8, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={
              boostActive
                ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            style={{ position: 'relative', zIndex: 2 }}
          >
            <Zap
              size={26}
              fill={boostActive ? '#fff' : '#C026D3'}
              stroke={boostActive ? '#fff' : 'none'}
              strokeWidth={boostActive ? 1.5 : 0}
            />
          </motion.div>

          {boostActive && boostRemainingMinutes > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-px rounded-full text-[9px] font-bold leading-none"
              style={{
                background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(236,72,153,0.6)',
                whiteSpace: 'nowrap',
              }}
            >
              {boostRemainingMinutes}m
            </motion.div>
          )}
        </motion.button>
      )}
      </div>
    </div>
  );
};
