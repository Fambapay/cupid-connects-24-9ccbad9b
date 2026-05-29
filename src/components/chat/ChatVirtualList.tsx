import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AnimatePresence, motion } from "framer-motion";
import { Bubble } from "./Bubble";
import { TypingDots } from "./TypingDots";
import type { Message } from "@/data/profiles";

export type ChatVirtualListHandle = {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  isNearBottom: () => boolean;
};

type Props = {
  messages: Message[];
  typing: boolean;
  avatar: string;
  name: string;
  header?: React.ReactNode;
};

/**
 * Virtualized message list with:
 * - dynamic-height measurement
 * - bottom-anchored scroll
 * - "new message" pill when user is scrolled up
 * - content-visibility for off-viewport rows
 */
export const ChatVirtualList = forwardRef<ChatVirtualListHandle, Props>(
  function ChatVirtualList({ messages, typing, avatar, name, header }, ref) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [showPill, setShowPill] = useState(false);

    // Group flags (first/last in author run) — memo'd so bubbles stay referentially stable
    const grouped = useMemo(() => {
      return messages.map((m, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        return {
          msg: m,
          isFirstOfGroup: !prev || prev.fromMe !== m.fromMe,
          isLastOfGroup: !next || next.fromMe !== m.fromMe,
        };
      });
    }, [messages]);

    const rowVirtualizer = useVirtualizer({
      count: grouped.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 56,
      overscan: 8,
      measureElement: (el) => el.getBoundingClientRect().height,
      getItemKey: (i) => grouped[i].msg.id,
    });

    const isNearBottom = () => {
      const el = parentRef.current;
      if (!el) return true;
      return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    };

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
      const el = parentRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    };

    useImperativeHandle(ref, () => ({ scrollToBottom, isNearBottom }), []);

    // First mount → jump to bottom instantly
    useLayoutEffect(() => {
      scrollToBottom("auto");
      // double-RAF guarantees images/layout settled
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToBottom("auto")));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // New message: auto-scroll only if user is near bottom, else show pill
    useEffect(() => {
      if (isNearBottom()) {
        scrollToBottom("smooth");
        setShowPill(false);
      } else {
        setShowPill(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages.length, typing]);

    const onScroll = () => {
      if (isNearBottom()) setShowPill(false);
    };

    return (
      <div className="relative min-h-0 flex-1">
        <div
          ref={parentRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain px-4 py-5"
          style={{
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            // isolate scroll repaints to this container
            contain: "strict",
          }}
        >
          {header}

          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
              width: "100%",
            }}
          >
            <AnimatePresence initial={false}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const item = grouped[vi.index];
                return (
                  <div
                    key={item.msg.id}
                    data-index={vi.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${vi.start}px)`,
                      // skip painting offscreen rows entirely
                      contentVisibility: "auto",
                      containIntrinsicSize: "0 56px",
                    }}
                  >
                    <ul className="m-0 list-none p-0">
                      <Bubble
                        msg={item.msg}
                        isFirstOfGroup={item.isFirstOfGroup}
                        isLastOfGroup={item.isLastOfGroup}
                        avatar={avatar}
                        name={name}
                      />
                    </ul>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          {typing && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 flex items-end gap-2"
            >
              <img
                src={avatar}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
                style={{ aspectRatio: "1 / 1" }}
              />
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </div>

        {/* New-message pill */}
        <AnimatePresence>
          {showPill && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              onClick={() => {
                scrollToBottom("smooth");
                setShowPill(false);
              }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-flame px-4 py-2 text-xs font-semibold text-flame-foreground shadow-glow"
            >
              ↓ Nova mensagem
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  },
);
