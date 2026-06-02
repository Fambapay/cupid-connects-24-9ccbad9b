import { SlidersHorizontal, Zap } from "lucide-react";

interface DiscoverTopBarProps {
  onOpenFilters?: () => void;
  onBoost?: () => void;
  logoSrc?: string;
}

export const DiscoverTopBar = ({
  onOpenFilters,
  onBoost,
  logoSrc,
}: DiscoverTopBarProps) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 15,
        padding: "calc(env(safe-area-inset-top, 0px) + 8px) 16px 8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}
    >
      <button
        onClick={onOpenFilters}
        aria-label="Filtros"
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        <SlidersHorizontal size={18} />
      </button>

      {logoSrc ? (
        <img src={logoSrc} alt="" style={{ height: 28, pointerEvents: "auto" }} />
      ) : (
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.5px",
            pointerEvents: "auto",
          }}
        >
          🍯
        </div>
      )}

      <button
        onClick={onBoost}
        aria-label="Boost"
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "none",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#8B5CF6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        <Zap size={18} fill="#8B5CF6" />
      </button>
    </div>
  );
};
