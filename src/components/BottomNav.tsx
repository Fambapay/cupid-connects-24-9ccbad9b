import { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
} from 'framer-motion';
import { Flame, User, Heart, MessageCircle, type LucideIcon } from 'lucide-react';
import { hapticTap } from '@/hooks/useNativePlatform';

type Tab = 'discover' | 'likes' | 'chat' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  likesCount?: number;
  /** Docks the nav flush to the viewport bottom, removing the floating gap. */
  dockToBottom?: boolean;
  /** Additional bottom offset in px (used to lift the nav above other floating bars) */
  bottomOffsetPx?: number;
  /** Deprecated: ambient color no longer used on BottomNav. Kept for compatibility. */
  ambientColor?: { r: number; g: number; b: number };
}

export const BottomNavBase = ({
  activeTab,
  onTabChange,
  likesCount = 0,
  dockToBottom = false,
  bottomOffsetPx = 0,
}: BottomNavProps) => {
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const pillContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pillX = useMotionValue(0);

  const handleTabChange = (tab: Tab) => {
    hapticTap();
    onTabChange(tab);
  };

  const tabs = [
    { id: 'discover' as Tab, icon: Flame, label: 'Descobrir' },
    { id: 'likes' as Tab, icon: Heart, label: 'Likes', badge: likesCount },
    { id: 'chat' as Tab, icon: MessageCircle, label: 'Chat' },
    { id: 'profile' as Tab, icon: User, label: 'Perfil' },
  ];

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === activeTab));
  const tabWidth = containerWidth / tabs.length;

  // Pill refraction intensity follows press/drag state
  const pillBlur = isPressed || isDragging ? 18 : 10;
  const pillSat = isPressed || isDragging ? 220 : 160;

  // Measure container
  useEffect(() => {
    const el = pillContainerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Snap pill to active tab when activeTab/width changes (and not dragging)
  useEffect(() => {
    if (isDragging || tabWidth === 0) return;
    const target = activeIndex * tabWidth;
    const controls = animate(pillX, target, {
      type: 'spring',
      stiffness: 520,
      damping: 38,
      mass: 0.55,
      restDelta: 0.001,
    });
    return () => controls.stop();
  }, [activeIndex, tabWidth, isDragging, pillX]);

  const bottomStyle = dockToBottom
    ? { bottom: '0px' }
    : bottomOffsetPx
      ? { bottom: `${bottomOffsetPx}px` }
      : undefined;

  return (
    <nav
      ref={navRef as any}
      className="tab-bar"
      style={bottomStyle}
    >
      <div className="tab-bar-pill">
      {/* SVG filter — RGB chromatic split + slight displacement for liquid glass refraction */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id="hunie-liquid-glass" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" result="disp" />
            {/* split R / G / B channels with horizontal offsets to simulate chromatic aberration */}
            <feColorMatrix in="disp" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feColorMatrix in="disp" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="disp" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="r" dx="-2.2" dy="0" result="rOff" />
            <feOffset in="g" dx="0" dy="0" result="gOff" />
            <feOffset in="b" dx="2.2" dy="0" result="bOff" />
            <feBlend in="rOff" in2="gOff" mode="screen" result="rg" />
            <feBlend in="rg" in2="bOff" mode="screen" />
          </filter>
        </defs>
      </svg>
      <div ref={pillContainerRef} className="relative flex items-stretch w-full h-full">
        {/* Draggable active pill — slides between tabs */}
        {tabWidth > 0 && (
          <>
          {/* Visual pill — sits behind icons, no pointer events */}
          <motion.div
            className="absolute top-0 bottom-0 z-0 pointer-events-none"
            style={{
              x: pillX,
              width: tabWidth,
              left: 0,
              padding: '0 4px',
              willChange: 'transform',
            }}
            animate={{ scale: isPressed || isDragging ? 1.08 : 1 }}
            transition={{ type: 'spring', stiffness: 560, damping: 34, mass: 0.5 }}
          >
            <div
              className="w-full h-full nav-active-pill"
              style={{
                borderRadius: '22px',
              }}
            />
          </motion.div>

          {/* Transparent drag handle — on top of active tab, captures gestures */}
          <motion.div
            className="absolute top-0 bottom-0 z-30"
            style={{
              x: pillX,
              width: tabWidth,
              left: 0,
              touchAction: 'none',
              cursor: 'grab',
            }}
            drag="x"
            dragConstraints={{ left: 0, right: (tabs.length - 1) * tabWidth }}
            dragElastic={0.08}
            dragMomentum={false}
            onPointerDown={() => {
              setIsPressed(true);
              hapticTap();
            }}
            onPointerUp={() => setIsPressed(false)}
            onPointerCancel={() => setIsPressed(false)}
            onDragStart={() => setIsDragging(true)}
            onDrag={(_, info) => {
              // live snap preview: highlight nearest tab
              const idx = Math.round((pillX.get() ?? 0) / tabWidth);
              const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
              if (tabs[clamped].id !== activeTab) {
                onTabChange(tabs[clamped].id);
              }
            }}
            onDragEnd={() => {
              const idx = Math.round((pillX.get() ?? 0) / tabWidth);
              const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
              setIsDragging(false);
              setIsPressed(false);
              hapticTap();
              if (tabs[clamped].id !== activeTab) {
                onTabChange(tabs[clamped].id);
              } else {
                // snap back
                animate(pillX, clamped * tabWidth, {
                  type: 'spring',
                  stiffness: 380,
                  damping: 32,
                });
              }
            }}
          />
          </>
        )}

      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const shouldAnimate = false;

        return (
          <TabButton
            key={tab.id}
            tabId={tab.id}
            Icon={tab.icon}
            label={tab.label}
            badge={tab.badge}
            shouldAnimate={shouldAnimate}
            isActive={isActive}
            index={index}
            tabWidth={tabWidth}
            pillX={pillX}
            pointerStartRef={pointerStartRef}
            onTap={() => handleTabChange(tab.id)}
          />
        );
      })}
      </div>
      </div>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TabButton — proximity-driven liquid-glass reflection as the pill drags over
// ─────────────────────────────────────────────────────────────────────────────
interface TabButtonProps {
  tabId: Tab;
  Icon: LucideIcon;
  label: string;
  badge?: number;
  shouldAnimate: boolean;
  isActive: boolean;
  index: number;
  tabWidth: number;
  pillX: MotionValue<number>;
  pointerStartRef: React.MutableRefObject<{ x: number; y: number; time: number } | null>;
  onTap: () => void;
}

const TabButton = ({
  tabId,
  Icon,
  label,
  badge,
  shouldAnimate,
  isActive,
  index,
  tabWidth,
  pillX,
  pointerStartRef,
  onTap,
}: TabButtonProps) => {
  return (
    <motion.button
      data-nav-tab={tabId}
      type="button"
      onPointerDown={(e) => {
        pointerStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          time: Date.now(),
        };
      }}
      onPointerUp={(e) => {
        const start = pointerStartRef.current;
        pointerStartRef.current = null;
        if (!start) return;
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        const dt = Date.now() - start.time;
        if (dx > 8 || dy > 8 || dt > 300) return;
        e.preventDefault();
        e.stopPropagation();
        onTap();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="relative flex flex-col items-center justify-center gap-[3px] h-full flex-1 z-10"
      style={{ background: 'none', border: 'none' }}
      aria-label={label}
    >
      <div className="relative flex items-center z-10 text-foreground">
        <Icon
          className={`w-[22px] h-[22px] ${shouldAnimate ? 'animate-notification-bounce' : ''}`}
          style={{ fill: 'none' }}
          strokeWidth={isActive ? 2.5 : 2}
        />
        <AnimatePresence mode="wait">
          {badge !== undefined && badge > 0 && (
            <motion.span
              key={`badge-${badge}`}
              className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] text-[9px] rounded-full flex items-center justify-center font-bold px-1 ${
                tabId === 'likes'
                  ? 'bg-[#C89B0C] text-black'
                  : 'bg-primary text-primary-foreground'
              }`}
              style={{ boxShadow: '0 0 0 1.5px hsl(var(--background))' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span className="relative text-[10px] leading-none z-10 text-foreground font-medium">
        {label}
      </span>
    </motion.button>
  );
};

// ─── Router-aware wrapper used across the app ───────────────────────────────
import { useLocation, useNavigate } from "@tanstack/react-router";

const TAB_TO_PATH = {
  discover: "/",
  likes: "/matches",
  chat: "/chat",
  profile: "/profile",
} as const;

type TabId = keyof typeof TAB_TO_PATH;

function pathToTab(pathname: string): TabId {
  if (pathname === "/" || pathname.startsWith("/explore")) return "discover";
  if (pathname.startsWith("/matches")) return "likes";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/profile")) return "profile";
  return "discover";
}

export function BottomNav(
  props: Omit<BottomNavProps, "activeTab" | "onTabChange"> = {},
) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <BottomNavBase
      {...props}
      activeTab={pathToTab(pathname)}
      onTabChange={(t) => navigate({ to: TAB_TO_PATH[t] })}
    />
  );
}
