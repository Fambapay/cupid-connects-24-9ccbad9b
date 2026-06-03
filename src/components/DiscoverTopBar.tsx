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

        {/* Boost — premium animated lightning */}
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
            }}
            whileTap={{ scale: 0.88 }}
            aria-label="Boost"
          >
            <AnimatePresence>
              {boostActive && (
                <>
                  {/* Soft outer halo — slow breathe */}
                  <motion.span
                    aria-hidden
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 0.9, 0.5], scale: [0.95, 1.1, 0.95] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute pointer-events-none"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, rgba(236,72,153,0.55) 0%, rgba(168,85,247,0.3) 45%, transparent 72%)',
                      filter: 'blur(6px)',
                    }}
                  />

                  {/* Single elegant shockwave ring */}
                  <motion.span
                    aria-hidden
                    initial={{ scale: 0.7, opacity: 0.85 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute pointer-events-none"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      border: '1.5px solid rgba(236,72,153,0.9)',
                      boxShadow:
                        '0 0 16px rgba(236,72,153,0.55), inset 0 0 8px rgba(236,72,153,0.4)',
                    }}
                  />

                  {/* Conic-gradient rotating accent ring */}
                  <motion.span
                    aria-hidden
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute pointer-events-none"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background:
                        'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.85) 40deg, rgba(236,72,153,0.9) 80deg, transparent 140deg, transparent 360deg)',
                      WebkitMask:
                        'radial-gradient(circle, transparent 14px, black 15px, black 17px, transparent 18px)',
                      mask: 'radial-gradient(circle, transparent 14px, black 15px, black 17px, transparent 18px)',
                    }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Icon with subtle pulse when active */}
            <motion.div
              animate={
                boostActive
                  ? { scale: [1, 1.12, 1] }
                  : { scale: 1 }
              }
              transition={
                boostActive
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
              style={{
                position: 'relative',
                zIndex: 2,
                filter: boostActive
                  ? 'drop-shadow(0 0 10px rgba(236,72,153,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.6))'
                  : 'drop-shadow(0 0 6px rgba(192,38,211,0.55))',
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
