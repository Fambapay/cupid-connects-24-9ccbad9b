import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import { User, Heart, MessageCircle, Compass, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { hapticTap } from "@/hooks/useNativePlatform";
import { useLikesCount } from "@/hooks/useLikesCount";
import { useUnreadChats } from "@/hooks/useUnreadChats";
import NativeTabs, { nativeTabsAvailable } from "@/lib/native/nativeTabs";

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
  const [visualTab, setVisualTab] = useState<Tab>(activeTab);
  const dragHoverIndexRef = useRef<number | null>(null);
  const pillX = useMotionValue(0);

  const handleTabChange = (tab: Tab) => {
    setVisualTab(tab);
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
    tabs.findIndex((t) => t.id === visualTab),
  );
  const tabWidth = containerWidth / tabs.length;

  useEffect(() => {
    if (!isDragging) setVisualTab(activeTab);
  }, [activeTab, isDragging]);

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
      type: "tween",
      duration: 0.38,
      ease: [0.32, 0.72, 0, 1],
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
      <div
        ref={pillRef}
        className="tab-bar-pill"
        data-interacting={isPressed || isDragging}
        data-dragging={isDragging}
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
                animate={{
                  scaleX: isDragging ? 1.14 : isPressed ? 1.07 : 1,
                  scaleY: isPressed || isDragging ? 0.96 : 1,
                }}
                transition={{ type: "spring", stiffness: 420, damping: 42, mass: 0.7 }}
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
                dragElastic={0}
                dragMomentum={false}
                onPointerDown={() => {
                  setIsPressed(true);
                  hapticTap();
                }}
                onPointerUp={() => setIsPressed(false)}
                onPointerCancel={() => setIsPressed(false)}
                onDragStart={() => {
                  setIsDragging(true);
                  dragHoverIndexRef.current = activeIndex;
                  setDragHoverIndex(activeIndex);
                }}
                onDrag={() => {
                  // Haptic feedback when crossing into a new tab cell —
                  // do NOT navigate yet, only commit on release.
                  const idx = Math.round((pillX.get() ?? 0) / tabWidth);
                  const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
                  if (dragHoverIndexRef.current !== clamped) {
                    dragHoverIndexRef.current = clamped;
                    setDragHoverIndex(clamped);
                    hapticTap();
                  }
                }}
                onDragEnd={() => {
                  const idx = Math.round((pillX.get() ?? 0) / tabWidth);
                  const clamped = Math.max(0, Math.min(tabs.length - 1, idx));
                  setIsDragging(false);
                  setIsPressed(false);
                  dragHoverIndexRef.current = null;
                  setDragHoverIndex(null);
                  hapticTap();
                  const nextTab = tabs[clamped].id;
                  setVisualTab(nextTab);
                  if (nextTab !== activeTab) {
                    onTabChange(nextTab);
                  } else {
                    animate(pillX, clamped * tabWidth, {
                      type: "tween",
                      duration: 0.28,
                      ease: [0.32, 0.72, 0, 1],
                    });
                  }
                }}
              />
            </>
          )}

          {tabs.map((tab, index) => {
            const isActive = visualTab === tab.id;
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
// TabButton
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
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
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
            tabId === "chat" ? (
              <motion.span
                key="chat-dot"
                aria-label="Novas mensagens"
                className="absolute -top-1 -right-1.5 h-[10px] w-[10px] rounded-full bg-red-500"
                style={{
                  boxShadow: "0 0 0 2px hsl(var(--background)), 0 0 10px rgba(239,68,68,0.55)",
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              />
            ) : (
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
            )
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
const TAB_ORDER: TabId[] = ["discover", "likes", "chat", "profile"];

// SF Symbols nativos — em iOS 26 a UITabBar aplica Liquid Glass real.
const TAB_SYMBOLS: Record<TabId, string> = {
  discover: "safari",
  likes: "heart.fill",
  chat: "message.fill",
  profile: "person.fill",
};

const TAB_LABELS: Record<TabId, string> = {
  discover: "Descobrir",
  likes: "Likes",
  chat: "Chat",
  profile: "Perfil",
};

function pathToTab(pathname: string): TabId | null {
  if (pathname.startsWith("/discover") || pathname.startsWith("/explore")) return "discover";
  if (pathname.startsWith("/matches")) return "likes";
  if (pathname.startsWith("/chat")) return "chat";
  if (pathname.startsWith("/profile") || pathname.startsWith("/settings")) return "profile";
  return null;
}

function formatBadge(n: number): string {
  if (!n || n <= 0) return "";
  return n > 99 ? "99+" : String(n);
}

/** Versão nativa: monta UITabBar via plugin, esconde HTML. */
function NativeBottomNav({
  activeTab,
  likesCount,
  unreadChats,
  onTabChange,
  onNativeUnavailable,
}: {
  activeTab: TabId;
  likesCount: number;
  unreadChats: number;
  onTabChange: (t: TabId) => void;
  onNativeUnavailable: () => void;
}) {
  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;
  const onNativeUnavailableRef = useRef(onNativeUnavailable);
  onNativeUnavailableRef.current = onNativeUnavailable;

  // Mount: cria a barra uma vez.
  useEffect(() => {
    let cancelled = false;
    let selectListener: { remove: () => void } | undefined;
    let heightListener: { remove: () => void } | undefined;
    let nativeOk = false;

    (async () => {
      try {
        await NativeTabs.show({
          items: TAB_ORDER.map((id) => ({
            id,
            title: TAB_LABELS[id],
            symbol: TAB_SYMBOLS[id],
            badge:
              id === "likes"
                ? formatBadge(likesCount)
                : id === "chat"
                  ? (unreadChats > 0 ? "•" : "")
                  : "",
            selected: id === activeTab,
          })),
        });
        if (cancelled) return;
        nativeOk = true;

        selectListener = await NativeTabs.addListener("tabSelected", ({ index }) => {
          const next = TAB_ORDER[index];
          if (next) {
            hapticTap();
            onTabChangeRef.current(next);
          }
        });

        heightListener = await NativeTabs.addListener("heightChanged", ({ height }) => {
          document.documentElement.style.setProperty(
            "--native-tabs-height",
            `${Math.round(height)}px`,
          );
        });
      } catch (err) {
        console.warn("[NativeTabs] show failed — falling back to HTML bar", err);
        if (!cancelled) onNativeUnavailableRef.current();
      }
    })();

    return () => {
      cancelled = true;
      selectListener?.remove();
      heightListener?.remove();
      if (nativeOk) NativeTabs.hide().catch(() => {});
      document.documentElement.style.removeProperty("--native-tabs-height");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza seleção quando o pathname muda.
  useEffect(() => {
    const index = TAB_ORDER.indexOf(activeTab);
    if (index >= 0) NativeTabs.setSelected({ index }).catch(() => {});
  }, [activeTab]);

  // Sincroniza badges.
  useEffect(() => {
    NativeTabs.setBadge({
      index: TAB_ORDER.indexOf("likes"),
      value: formatBadge(likesCount),
    }).catch(() => {});
  }, [likesCount]);

  useEffect(() => {
    NativeTabs.setBadge({
      index: TAB_ORDER.indexOf("chat"),
      value: unreadChats > 0 ? "•" : "",
    }).catch(() => {});
  }, [unreadChats]);

  return null;
}

export function BottomNav(props: Omit<BottomNavProps, "activeTab" | "onTabChange"> = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const activeTab = pathToTab(pathname) ?? "profile";
  const likesCount = useLikesCount();
  const unreadChats = useUnreadChats();

  // Hide nav inside a conversation (overlay screen). Matches /chat/<id>.
  const inConversation = /^\/chat\/[^/]+/.test(pathname);

  // Warm all main tab routes so switches feel instant.
  useEffect(() => {
    const paths = ["/discover", "/matches", "/chat", "/profile"] as const;
    paths.forEach((to) => {
      router.preloadRoute({ to }).catch(() => {});
    });
  }, [router]);

  const handleTabChange = (t: TabId) => {
    navigate({ to: TAB_TO_PATH[t] });
  };
  const [nativeFailed, setNativeFailed] = useState(false);

  // Hide entirely inside a conversation (chat detail overlays the list).
  if (inConversation) return null;

  // Web/Android/failure → HTML pill fallback.
  if (nativeTabsAvailable() && !nativeFailed) {
    return (
      <NativeBottomNav
        activeTab={activeTab}
        likesCount={likesCount}
        unreadChats={unreadChats}
        onTabChange={handleTabChange}
        onNativeUnavailable={() => setNativeFailed(true)}
      />
    );
  }


  return (
    <BottomNavBase
      likesCount={likesCount}
      unreadChats={unreadChats}
      {...props}
      activeTab={activeTab}
      onTabHover={(t) => {
        router.preloadRoute({ to: TAB_TO_PATH[t] }).catch(() => {});
      }}
      onTabChange={handleTabChange}
    />
  );
}



