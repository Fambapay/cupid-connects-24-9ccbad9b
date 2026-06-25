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
import { LiquidGlass, isLiquidGlassSupported, onLiquidGlassReady } from "@/lib/native/liquidGlass";
import {
  NativeTabBar,
  isNativeTabBarSupported,
  onTabSelected,
} from "@/lib/native/nativeTabBar";

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
  const pillRef = useRef<HTMLDivElement | null>(null);
  const innerPillRef = useRef<HTMLDivElement | null>(null);
  const pillContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHoverIndex, setDragHoverIndex] = useState<number | null>(null);
  const pillX = useMotionValue(0);
  const useNativeGlass = isLiquidGlassSupported();
  const [nativeGlassReady, setNativeGlassReady] = useState(false);
  useEffect(() => {
    return onLiquidGlassReady((ready) => {
      setNativeGlassReady(ready);
    });
  }, [useNativeGlass]);


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

  // Native Apple Liquid Glass — outer tab bar surface (id: "default", behind WebView).
  useEffect(() => {
    if (!useNativeGlass) return;
    const el = pillRef.current;
    if (!el) return;

    let raf = 0;
    let lastKey = "";
    let started = false;

    const syncNow = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const round = (v: number) => Math.round(v * dpr) / dpr;
      const rect = {
        x: round(r.left),
        y: round(r.top),
        width: round(r.width),
        height: round(r.height),
        cornerRadius: round(r.height / 2),
      };
      const key = `${rect.x}|${rect.y}|${rect.width}|${rect.height}`;
      if (key === lastKey) return;
      lastKey = key;
      if (!started) {
        started = true;
        LiquidGlass.show(rect);
      } else {
        LiquidGlass.update(rect);
      }
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncNow);
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", schedule);
    vv?.addEventListener("scroll", schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      vv?.removeEventListener("resize", schedule);
      vv?.removeEventListener("scroll", schedule);
      LiquidGlass.hide();
    };
  }, [useNativeGlass]);

  // Native Apple Liquid Glass — INNER sliding pill (id: "inner", above WebView).
  // Optimised path: subscribe to pillX changes (no idle rAF loop), cache the
  // base rect (no per-frame layout reads), coalesce bursts into one rAF, and
  // skip sub-pixel deltas. Intensity is pushed via a ref so press/drag state
  // changes don't tear down the subscription.
  // Inner glass now renders BEHIND the WebView (see native plugin), so icons
  // stay perfectly crisp on top of it — we can keep full intensity at all
  // times without blurring the icon glyphs.
  const intensityRef = useRef(1.0);
  useEffect(() => {
    intensityRef.current = 1.0;
  }, [isPressed, isDragging]);

  useEffect(() => {
    if (!useNativeGlass) return;
    const el = innerPillRef.current;
    const container = pillContainerRef.current;
    if (!el || !container || tabWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const round = (v: number) => Math.round(v * dpr) / dpr;

    // Base rect captured from the container — the pill's X is pillX + base.left.
    // The native glass tracks the pill's actual screen position by composing
    // these without re-querying the DOM per frame.
    let baseLeft = 0;
    let baseTop = 0;
    let height = 0;
    let radius = 0;

    const measureBase = () => {
      // Anchor to the container — it is stable and does not depend on the
      // current motion transform. The inner pill at translateX=0 aligns with
      // the container's left edge (left:0, full width = tabWidth).
      const cr = container.getBoundingClientRect();
      baseLeft = cr.left;
      baseTop = cr.top;
      height = cr.height;
      radius = cr.height / 2;
    };
    measureBase();

    let started = false;
    let lastX = NaN;
    let lastIntensity = NaN;
    let pending = false;
    let rafId = 0;

    const flush = () => {
      pending = false;
      rafId = 0;
      const x = pillX.get();
      const intensity = intensityRef.current;
      // Sub-pixel guard — skip if nothing meaningful changed.
      if (Math.abs(x - lastX) < 0.5 && intensity === lastIntensity) return;
      lastX = x;
      lastIntensity = intensity;
      const rect = {
        id: "inner" as const,
        x: round(baseLeft + x),
        y: round(baseTop),
        width: round(tabWidth),
        height: round(height),
        cornerRadius: round(radius),
        intensity,
      };
      if (!started) {
        started = true;
        LiquidGlass.show(rect);
      } else {
        LiquidGlass.update(rect);
      }
    };

    const schedule = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(flush);
    };

    // Initial paint + subscriptions.
    schedule();
    const unsubX = pillX.on("change", schedule);

    // Re-measure base on layout-affecting events (rare).
    const remeasure = () => { measureBase(); schedule(); };
    const ro = new ResizeObserver(remeasure);
    ro.observe(container);
    window.addEventListener("resize", remeasure);
    window.addEventListener("orientationchange", remeasure);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", remeasure);
    vv?.addEventListener("scroll", remeasure);

    // Intensity-only updates from the press/drag effect above.
    const intensityPoll = setInterval(() => {
      if (intensityRef.current !== lastIntensity) schedule();
    }, 80);

    return () => {
      cancelAnimationFrame(rafId);
      unsubX();
      ro.disconnect();
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("orientationchange", remeasure);
      vv?.removeEventListener("resize", remeasure);
      vv?.removeEventListener("scroll", remeasure);
      clearInterval(intensityPoll);
      LiquidGlass.hide({ id: "inner" });
    };
  }, [useNativeGlass, tabWidth, pillX]);





  const bottomStyle = dockToBottom
    ? { bottom: "0px" }
    : bottomOffsetPx
      ? { bottom: `${bottomOffsetPx}px` }
      : undefined;

  return (
    <nav ref={navRef} className="tab-bar" style={bottomStyle}>
      <div
        ref={pillRef}
        className={`tab-bar-pill${nativeGlassReady ? " tab-bar-pill--native" : ""}`}
      >
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
                <div
                  ref={innerPillRef}
                  className="w-full h-full nav-active-pill"
                  style={{ borderRadius: "9999px" }}
                />
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
                dragElastic={0.06}
                dragMomentum={false}
                onPointerDown={() => {
                  setIsPressed(true);
                  hapticTap();
                }}
                onPointerUp={() => setIsPressed(false)}
                onPointerCancel={() => setIsPressed(false)}
                onDragStart={() => {
                  setIsDragging(true);
                  setDragHoverIndex(activeIndex);
                }}
                onDrag={() => {
                  // Haptic feedback when crossing into a new tab cell —
                  // do NOT navigate yet, only commit on release.
                  const idx = Math.round((pillX.get() ?? 0) / tabWidth);
                  const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
                  setDragHoverIndex((prev) => {
                    if (prev !== clamped) hapticTap();
                    return clamped;
                  });
                }}
                onDragEnd={() => {
                  const idx = Math.round((pillX.get() ?? 0) / tabWidth);
                  const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
                  setIsDragging(false);
                  setIsPressed(false);
                  setDragHoverIndex(null);
                  hapticTap();
                  if (tabs[clamped].id !== activeTab) {
                    onTabChange(tabs[clamped].id);
                  } else {
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
            const isHover = dragHoverIndex === index && dragHoverIndex !== activeIndex;
            const shouldAnimate = false;

            return (
              <TabButton
                key={tab.id}
                tabId={tab.id}
                Icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                shouldAnimate={shouldAnimate}
                isActive={isActive || isHover}
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

  // NOTE: We intentionally do NOT render the system UITabBar on iOS — the
  // custom BottomNavBase already uses the native Liquid Glass plugin for
  // refraction and keeps page transitions in sync with the rest of the app.
  // Mixing UITabBar (instant) with framer-motion page transitions produced
  // a "broken / not fluid" feel on the simulator.
  void NativeBottomNav;
  void isNativeTabBarSupported;

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

// ─── Native iOS UITabBar wrapper ────────────────────────────────────────────

function NativeBottomNav({
  activeTab,
  likesCount,
  unreadChats,
}: {
  activeTab: TabId;
  likesCount: number;
  unreadChats: number;
}) {
  const navigate = useNavigate();

  // Configure tabs once on mount + wire the tabSelected listener.
  useEffect(() => {
    NativeTabBar.configure({
      tabs: [
        { id: "discover", title: "Descobrir", sfSymbol: "sparkles" },
        { id: "likes", title: "Likes", sfSymbol: "heart.fill", badge: likesCount || undefined },
        { id: "chat", title: "Chat", sfSymbol: "message.fill", badge: unreadChats || undefined },
        { id: "profile", title: "Perfil", sfSymbol: "person.fill" },
      ],
      activeId: activeTab,
    });
    NativeTabBar.show();

    const unsubscribe = onTabSelected((id) => {
      hapticTap();
      const path = TAB_TO_PATH[id as TabId];
      if (path) navigate({ to: path });
    });

    return () => {
      unsubscribe();
      NativeTabBar.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync active tab when the route changes.
  useEffect(() => {
    NativeTabBar.setActiveTab({ id: activeTab });
  }, [activeTab]);

  // Sync badges.
  useEffect(() => {
    NativeTabBar.setBadge({ id: "likes", value: likesCount > 0 ? likesCount : null });
  }, [likesCount]);

  useEffect(() => {
    NativeTabBar.setBadge({ id: "chat", value: unreadChats > 0 ? unreadChats : null });
  }, [unreadChats]);

  return null;
}

