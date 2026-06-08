import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
} from "framer-motion";
import { User, Heart, MessageCircle, Compass, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { hapticTap } from "@/hooks/useNativePlatform";
import { useLikesCount } from "@/hooks/useLikesCount";
import { useUnreadChats } from "@/hooks/useUnreadChats";

type Tab = "discover" | "likes" | "chat" | "profile";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onTabHover?: (tab: Tab) => void;
  likesCount?: number;
  unreadChats?: number;
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
  onTabHover,
  likesCount = 0,
  unreadChats = 0,
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
    { id: "discover" as Tab, icon: Compass, label: "Descobrir" },
    { id: "likes" as Tab, icon: Heart, label: "Likes", badge: likesCount },
    { id: "chat" as Tab, icon: MessageCircle, label: "Chat", badge: unreadChats },
    { id: "profile" as Tab, icon: User, label: "Perfil" },
  ];

  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const tabWidth = containerWidth / tabs.length;

  // Pill refraction intensity follows press/drag state
  const pillBlur = isPressed || isDragging ? 18 : 10;
  const pillSat = isPressed || isDragging ? 220 : 160;

  // Measure container
  useLayoutEffect(() => {
    const el = pillContainerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Snap pill to active tab when activeTab/width changes (and not dragging)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (isDragging || tabWidth === 0) return;
    const target = activeIndex * tabWidth;
    if (!didInitRef.current) {
      // First measurement after mount: jump instantly, no animation
      pillX.set(target);
      didInitRef.current = true;
      return;
    }
    const controls = animate(pillX, target, {
      type: "spring",
      stiffness: 520,
      damping: 38,
      mass: 0.55,
      restDelta: 0.001,
    });
    return () => controls.stop();
  }, [activeIndex, tabWidth, isDragging, pillX]);

  const bottomStyle = dockToBottom
    ? { bottom: "0px" }
    : bottomOffsetPx
      ? { bottom: `${bottomOffsetPx}px` }
      : undefined;

  return (
    <nav ref={navRef} className="tab-bar" style={bottomStyle}>
      <div className="tab-bar-pill">
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
                  padding: "0 4px",
                  willChange: "transform",
                }}
                animate={{ scale: isPressed || isDragging ? 1.08 : 1 }}
                transition={{ type: "spring", stiffness: 560, damping: 34, mass: 0.5 }}
              >
                <div className="w-full h-full nav-active-pill" style={{ borderRadius: "20px" }} />
              </motion.div>

              {/* Transparent drag handle — on top of active tab, captures gestures */}
              <motion.div
                className="absolute top-0 bottom-0 z-30"
                style={{
                  x: pillX,
                  width: tabWidth,
                  left: 0,
                  touchAction: "none",
                  cursor: "grab",
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
                      type: "spring",
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
                onHover={onTabHover ? () => onTabHover(tab.id) : undefined}
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
  onHover?: () => void;
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
  onHover,
}: TabButtonProps) => {
  return (
    <motion.button
      data-nav-tab={tabId}
      data-active={isActive}
      type="button"
      onPointerDown={(e) => {
        pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        onHover?.();
      }}
      onPointerEnter={() => onHover?.()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        pointerStartRef.current = null;
        onTap();
      }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="tab-bar-item relative flex flex-col items-center justify-center gap-[3px] h-full flex-1 z-10"
      style={{ background: "none", border: "none" }}
      aria-label={label}
    >
      <div className="relative flex items-center z-10">
        <Icon
          className={`tab-bar-icon w-[22px] h-[22px] ${shouldAnimate ? "animate-notification-bounce" : ""}`}
          style={{ fill: "none" }}
          strokeWidth={isActive ? 2.1 : 1.7}
        />
        <AnimatePresence mode="wait">
          {badge !== undefined && badge > 0 && (
            <motion.span
              key={`badge-${badge}`}
              className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] text-[9px] rounded-full flex items-center justify-center font-bold px-1 ${
                tabId === "likes" ? "bg-[#C89B0C] text-black" : "bg-red-500 text-white"
              }`}
              style={{ boxShadow: "0 0 0 1.5px hsl(var(--background))" }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              {badge > 99 ? "99+" : badge}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <span
        className="relative text-[10px] leading-none z-10 tracking-wide"
        style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, opacity: isActive ? 0.95 : 0.6 }}
      >
        {label}
      </span>
    </motion.button>
  );
};

// ─── Router-aware wrapper used across the app ───────────────────────────────

const TAB_TO_PATH = {
  discover: "/discover",
  likes: "/matches",
  chat: "/chat",
  profile: "/profile",
} as const;

type TabId = keyof typeof TAB_TO_PATH;

function pathToTab(pathname: string): TabId | null {
  if (pathname.startsWith("/discover") || pathname.startsWith("/explore")) return "discover";
  if (pathname.startsWith("/matches")) return "likes";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) return "profile";
  return null;
}

export function BottomNav(props: Omit<BottomNavProps, "activeTab" | "onTabChange"> = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const activeTab = pathToTab(pathname) ?? "profile";
  const likesCount = useLikesCount();
  const unreadChats = useUnreadChats();

  // Warm all main tab routes (code chunks + loader data) on mount so tab
  // switches feel instantaneous instead of waiting on network/JS chunks.
  useEffect(() => {
    const paths = ["/discover", "/matches", "/chat", "/profile"] as const;
    paths.forEach((to) => {
      router.preloadRoute({ to }).catch(() => {});
    });
  }, [router]);

  return (
    <BottomNavBase
      likesCount={likesCount}
      unreadChats={unreadChats}
      {...props}
      activeTab={activeTab}
      onTabHover={(t) => {
        router.preloadRoute({ to: TAB_TO_PATH[t] }).catch(() => {});
      }}
      onTabChange={(t) => {
        navigate({ to: TAB_TO_PATH[t] });
      }}
    />
  );
}
