import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Message } from "@/data/profiles";

type Props = {
  msg: Message;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  avatar: string;
  name: string;
};

function BubbleImpl({ msg, isFirstOfGroup, isLastOfGroup, avatar, name }: Props) {
  const reduce = useReducedMotion();
  const me = msg.fromMe;

  return (
    <motion.li
      layout="position"
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }
      }
      style={{
        transformOrigin: me ? "bottom right" : "bottom left",
        // GPU promotion + isolate paint to this bubble
        willChange: "transform, opacity",
        contain: "layout paint",
      }}
      className={`flex items-end gap-2 ${me ? "justify-end" : "justify-start"} ${
        isFirstOfGroup ? "mt-3" : "mt-0.5"
      }`}
    >
      {!me &&
        (isLastOfGroup ? (
          <img
            src={avatar}
            alt={name}
            width={28}
            height={28}
            loading="lazy"
            decoding="async"
            className="h-7 w-7 shrink-0 rounded-full object-cover"
            style={{ aspectRatio: "1 / 1" }}
          />
        ) : (
          <div className="h-7 w-7 shrink-0" />
        ))}

      <div className={`flex max-w-[78%] flex-col ${me ? "items-end" : "items-start"}`}>
        <div
          className={[
            "px-4 py-2.5 text-[15px] leading-snug break-words whitespace-pre-wrap rounded-2xl",
            me
              ? "bg-gradient-flame text-flame-foreground shadow-rose"
              : "bg-muted text-foreground",
            me
              ? `${isFirstOfGroup ? "rounded-tr-2xl" : "rounded-tr-md"} ${
                  isLastOfGroup ? "rounded-br-md" : "rounded-br-2xl"
                }`
              : `${isFirstOfGroup ? "rounded-tl-2xl" : "rounded-tl-md"} ${
                  isLastOfGroup ? "rounded-bl-md" : "rounded-bl-2xl"
                }`,
          ].join(" ")}
        >
          {msg.text}
        </div>
        {isLastOfGroup && (
          <span className="mt-1 px-1 text-[10px] text-muted-foreground">{msg.time}</span>
        )}
      </div>
    </motion.li>
  );
}

export const Bubble = memo(BubbleImpl, (a, b) => {
  return (
    a.msg.id === b.msg.id &&
    a.msg.text === b.msg.text &&
    a.isFirstOfGroup === b.isFirstOfGroup &&
    a.isLastOfGroup === b.isLastOfGroup &&
    a.avatar === b.avatar
  );
});
