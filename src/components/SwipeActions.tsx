import { useEffect, useRef } from 'react';
import { motion, useTransform, useMotionValue, AnimatePresence, type MotionValue } from 'framer-motion';
import { SwipeDirection } from '@/types/dating';
import { DailyLimits } from '@/hooks/useDiscovery';
import { useDominantColor } from '@/hooks/useDominantColor';

interface SwipeActionsProps {
  onSwipe: (direction: SwipeDirection) => void;
  onRewind?: () => void;
  onBoost?: () => void;
  onSendMessage?: () => void;
  disabled?: boolean;
  dailyLimits?: DailyLimits;
  canRewind?: boolean;
  canBoost?: boolean;
  boostActive?: boolean;
  boostRemainingMinutes?: number;
  onUpgradeClick?: () => void;
  cardX?: MotionValue<number>;
  /** Hide the "Enviar mensagem" pill — used in info panel bottom bar */
  hideMessagePill?: boolean;
  /** Photo URL used to drive the ambient-light tint on the buttons */
  photoUrl?: string;
  /** Saldo de Super Likes comprados (packs). Soma à quota diária. */
  purchasedSuperLikes?: number;
  /** When true, the rewind button is completely inactive (no click action). */
  rewindLocked?: boolean;
  /** Identifier of the current card — drives the enter (bubble-up) animation on change. */
  cardKey?: string | number;
}

export const SwipeActions = ({
  onSwipe,
  onRewind,
  onSendMessage,
  disabled,
  dailyLimits,
  canRewind,
  onUpgradeClick,
  cardX,
  hideMessagePill: _hideMessagePill,
  photoUrl,
  purchasedSuperLikes = 0,
  rewindLocked,
  cardKey,
}: SwipeActionsProps) => {
  const likesDisabled = disabled || (dailyLimits?.likesRemaining ?? 1) <= 0;
  const totalSuperLikes = (dailyLimits?.superLikesRemaining ?? 0) + purchasedSuperLikes;
  const superLikesDisabled = disabled || totalSuperLikes <= 0;

  const fallbackX = useMotionValue(0);
  const x = cardX ?? fallbackX;
  const threshold = (typeof window !== 'undefined' ? window.innerWidth : 390) * 0.35;

  // Guard against NaN / undefined so transforms never get stuck
  const safeX = useTransform(x, (v) => (Number.isFinite(v) ? v : 0));

  // Flat, opinionated styling matching the reference: solid coral X,
  // dark glassy pill for "Send message", dark circles with vivid icons
  // (blue star, green outline heart). Ambient light intentionally NOT
  // used here — the buttons should read as bold and confident, not glassy.
  const darkBg = 'rgba(20,20,22,0.78)';
  const darkBorder = '1px solid rgba(255,255,255,0.08)';
  const darkShadow =
    'inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.35)';
  // (kept to avoid breaking the prop — color extraction is now unused)
  void useDominantColor(photoUrl);

  // NOPE — solid coral, scales up on left drag
  const nopeScale = useTransform(safeX, [-threshold, -threshold * 0.3, 0], [1.45, 1.15, 1]);
  const nopeOpacity = useTransform(safeX, [0, threshold * 0.3], [1, 0.25]);

  // LIKE — dark glass, green heart icon; scales up on right drag
  const likeScale = useTransform(safeX, [0, threshold * 0.3, threshold], [1, 1.15, 1.45]);
  const likeOpacity = useTransform(safeX, [-threshold * 0.3, 0], [0.25, 1]);

  // SUPER LIKE
  const superScale = useTransform(safeX, [-50, 0, 50], [0.9, 1, 0.9]);
  const superOpacity = useTransform(
    safeX,
    [-threshold * 0.3, 0, threshold * 0.3],
    [0.4, 1, 0.4]
  );

  // Local lock — once a button is tapped, ignore further taps for ~360ms
  // (slightly longer than the fly-off duration). Prevents double triggers
  // that re-render the card mid fly-off and cause a visible flash.
  const lockedRef = useRef(false);
  useEffect(() => {
    // Auto-release the lock if the card resets to 0 (new card mounted).
    const unsub = x.on('change', (v) => {
      if (v === 0) lockedRef.current = false;
    });
    return unsub;
  }, [x]);

  const guarded = (fn: () => void) => (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (lockedRef.current) return;
    lockedRef.current = true;
    // Safety release in case no reset arrives (e.g. limit-reached path).
    window.setTimeout(() => { lockedRef.current = false; }, 500);
    fn();
  };
  const stopPointer = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence mode="wait" initial={true}>
    <motion.div
      key={cardKey ?? 'swipe-actions'}
      className="w-full flex items-center justify-between px-5"
      data-no-select
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.6, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6, transition: { duration: 0.14, ease: 'easeOut' as const } }}
      transition={{ type: 'spring' as const, stiffness: 480, damping: 26, mass: 0.6, opacity: { duration: 0.22 } }}
      style={{ transformOrigin: '50% 100%' }}
    >
      {/* REWIND — small dark circle, orange icon */}
      <motion.button
        onPointerDown={stopPointer}
        onClick={guarded(() => {
          if (rewindLocked) return;
          if (canRewind) onRewind?.();
          else onUpgradeClick?.();
        })}
        whileTap={rewindLocked ? {} : { opacity: 0.85, scale: 0.95 }}
        style={{
          width: 48, height: 48, borderRadius: '50%',
          background: darkBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: darkBorder,
          boxShadow: darkShadow,
          cursor: rewindLocked ? 'default' : 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canRewind && !rewindLocked ? 1 : 0.4,
        }}
        aria-label="Rewind"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="#FFB020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 3v5h5" stroke="#FFB020" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>

      {/* NOPE — solid coral filled circle */}
      <motion.button
        onPointerDown={stopPointer}
        onClick={guarded(() => onSwipe('left'))}
        disabled={disabled}
        whileTap={{ opacity: 0.85 }}
        style={{
          width: 62, height: 62, borderRadius: '50%',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#FF3B6B',
          boxShadow: '0 8px 22px -6px rgba(255,59,107,0.55), inset 0 1px 0 rgba(255,255,255,0.18)',
          scale: nopeScale,
          opacity: nopeOpacity,
        }}
        aria-label="Passar"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </motion.button>

      {/* Super like */}
      <motion.button
        onPointerDown={stopPointer}
        onClick={guarded(() => onSwipe('up'))}
        disabled={superLikesDisabled}
        whileTap={superLikesDisabled ? {} : { opacity: 0.85 }}
        style={{
          position: 'relative',
          width: 54, height: 54, borderRadius: '50%',
          background: darkBg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: darkBorder, cursor: 'pointer', flexShrink: 0,
          boxShadow: darkShadow,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          scale: superScale,
          opacity: superLikesDisabled ? 0.5 : superOpacity,
        }}
        aria-label="Super like"
      >
        <svg width="26" height="26" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1A6FFF" />
              <stop offset="100%" stopColor="#5BB8FF" />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#starGrad)" />
        </svg>
        {totalSuperLikes > 0 && totalSuperLikes < 100 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              background: '#0A84FF',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid #0a0a0a',
              lineHeight: 1,
            }}
          >
            {totalSuperLikes}
          </span>
        )}
      </motion.button>

      {/* Like — dark glass circle, green outline heart */}
      <motion.button
        onPointerDown={stopPointer}
        onClick={guarded(() => (likesDisabled ? onUpgradeClick?.() : onSwipe('right')))}
        whileTap={likesDisabled ? {} : { opacity: 0.85 }}
        style={{
          width: 62, height: 62, borderRadius: '50%',
          border: darkBorder, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: darkBg,
          boxShadow: darkShadow,
          scale: likeScale,
          opacity: likesDisabled ? 0.55 : likeOpacity,
        }}
        aria-label="Like"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#30E37C" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      </motion.button>

    </motion.div>
    </AnimatePresence>
  );
};
