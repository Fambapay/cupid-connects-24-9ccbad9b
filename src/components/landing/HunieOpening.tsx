import { useEffect, useRef, useState, type CSSProperties } from "react";
import hunieMarkTransparent from "@/assets/hunie-mark-transparent.png.asset.json";
import "@/styles/hunie-opening.css";

type HunieOpeningProps = {
  canReveal: boolean;
};

type OpeningPhase = "loading" | "ready" | "revealing" | "hidden";

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

const milestoneProgress = (elapsed: number) => {
  if (elapsed >= 840) return 0.92;
  if (elapsed >= 600) return 0.74;
  if (elapsed >= 340) return 0.48;
  if (elapsed >= 130) return 0.22;
  return 0.04;
};

/**
 * Cinematic opening for the public landing route.
 *
 * It is intentionally independent from media loading: `canReveal` only tells
 * it that the landing route has resolved its auth gate. Existing video/media
 * playback behaviour remains untouched.
 */
export function HunieOpening({ canReveal }: HunieOpeningProps) {
  const canRevealRef = useRef(canReveal);
  const [progress, setProgress] = useState(4);
  const [phase, setPhase] = useState<OpeningPhase>("loading");
  const [lite, setLite] = useState(false);

  canRevealRef.current = canReveal;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const navigatorWithHints = navigator as Navigator & {
      connection?: NetworkInformationLike;
      deviceMemory?: number;
    };
    const connection = navigatorWithHints.connection;
    const lowPower = Boolean(
      connection?.saveData ||
      /(^|-)(2g|slow-2g)$/.test(connection?.effectiveType ?? "") ||
      (navigatorWithHints.deviceMemory && navigatorWithHints.deviceMemory <= 2),
    );

    setLite(lowPower);
    document.body.classList.add("hunie-opening-lock");

    let frame = 0;
    let lastTime = performance.now();
    const startedAt = lastTime;
    let shown = 0.04;
    let finishingAt: number | null = null;
    let completed = false;
    let lastWhole = 4;
    const timers: number[] = [];

    const finish = () => {
      if (completed) return;
      completed = true;
      setProgress(100);
      setPhase("ready");

      timers.push(window.setTimeout(() => setPhase("revealing"), reducedMotion ? 40 : 720));
      timers.push(
        window.setTimeout(
          () => {
            document.body.classList.remove("hunie-opening-lock");
            setPhase("hidden");
          },
          reducedMotion ? 220 : 1640,
        ),
      );
    };

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const deltaSeconds = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const minimumDuration = reducedMotion ? 140 : 1080;
      const mayFinish = canRevealRef.current && elapsed >= minimumDuration;
      if (mayFinish && finishingAt === null) finishingAt = now;

      const target = mayFinish ? 1 : milestoneProgress(elapsed);
      const response = mayFinish ? 0.09 : 0.2;
      shown += (target - shown) * (1 - Math.exp(-deltaSeconds / response));

      const whole = Math.min(100, Math.round(shown * 100));
      if (whole !== lastWhole) {
        lastWhole = whole;
        setProgress(whole);
      }

      if (
        mayFinish &&
        (shown >= 0.995 ||
          (finishingAt !== null && now - finishingAt >= (reducedMotion ? 40 : 420)))
      ) {
        finish();
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      document.body.classList.remove("hunie-opening-lock");
    };
  }, []);

  if (phase === "hidden") return null;

  const phaseText =
    progress < 36
      ? "A preparar o encontro"
      : progress < 76
        ? "A aproximar pessoas"
        : progress < 100
          ? "A afinar a experiência"
          : "Experiência pronta";

  const className = [
    "hunie-opening",
    phase === "ready" ? "is-ready" : "",
    phase === "revealing" ? "is-revealing" : "",
    lite ? "is-lite" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const openingStyle = {
    "--hunie-opening-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div
      className={className}
      style={openingStyle}
      aria-label="A carregar a Hunie"
      aria-busy={phase !== "revealing"}
    >
      <div className="hunie-opening__curtain" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="hunie-opening__piece" key={index}>
            <div className="hunie-opening__word">HUNIE</div>
          </div>
        ))}
      </div>

      <div className="hunie-opening__orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="hunie-opening__scanner" aria-hidden="true" />

      <div className="hunie-opening__wipe" aria-hidden="true">
        <div className="hunie-opening__wipe-brand">
          <strong>
            <img src={hunieMarkTransparent.url} alt="" />
            hunie
          </strong>
          <small>O encontro começa aqui</small>
        </div>
      </div>

      <div className="hunie-opening__light-leak" aria-hidden="true" />
      <div className="hunie-opening__vignette" aria-hidden="true" />
      <div className="hunie-opening__letterbox hunie-opening__letterbox--top" aria-hidden="true" />
      <div
        className="hunie-opening__letterbox hunie-opening__letterbox--bottom"
        aria-hidden="true"
      />
      <div className="hunie-opening__flare" aria-hidden="true" />
      <div className="hunie-opening__grain" aria-hidden="true" />

      <div className="hunie-opening__chrome">
        <div className="hunie-opening__top">
          <span className="hunie-opening__mini-brand">
            <img src={hunieMarkTransparent.url} alt="" width="13" height="18" />
            hunie
          </span>
          <span className="hunie-opening__status">
            <i aria-hidden="true" />
            <span>{phaseText}</span>
          </span>
        </div>

        <div className="hunie-opening__bottom">
          <p className="hunie-opening__promise">
            Pessoas reais
            <br />
            Ligações reais
          </p>
          <div className="hunie-opening__counter" aria-hidden="true">
            <span>{String(progress).padStart(2, "0")}</span>
            <small>%</small>
          </div>
        </div>
      </div>

      <div
        className="hunie-opening__line"
        role="progressbar"
        aria-label="Progresso do carregamento"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span aria-hidden="true" />
      </div>

      <span className="hunie-opening__sr-only" role="status" aria-live="polite" aria-atomic="true">
        {progress === 100 ? "Hunie pronta" : "A carregar a Hunie"}
      </span>
    </div>
  );
}
