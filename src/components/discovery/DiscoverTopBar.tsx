import { SlidersHorizontal, Zap } from "lucide-react";

interface DiscoverTopBarProps {
  onOpenFilters?: () => void;
  onBoost?: () => void;
  logoSrc?: string;
  boostActive?: boolean;
  boostMultiplier?: number;
}

export const DiscoverTopBar = ({
  onOpenFilters,
  onBoost,
  logoSrc,
  boostActive = false,
  boostMultiplier = 10,
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
      ) : null}


      <button
        onClick={onBoost}
        aria-label="Boost"
        className={boostActive ? "boost-pulse-btn" : ""}
        style={{
          position: "relative",
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: boostActive ? "1.5px solid rgba(236,72,153,0.9)" : "none",
          background: boostActive
            ? "linear-gradient(135deg, rgba(168,85,247,0.95), rgba(236,72,153,0.95))"
            : "rgba(0,0,0,0.45)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: boostActive ? "#fff" : "#8B5CF6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          pointerEvents: "auto",
          boxShadow: boostActive
            ? "0 0 24px rgba(236,72,153,0.7), 0 0 48px rgba(168,85,247,0.5)"
            : "none",
          transition: "all 0.3s ease",
        }}
      >
        {boostActive && (
          <>
            {/* Expanding ripple rings */}
            <span className="boost-ring boost-ring-1" />
            <span className="boost-ring boost-ring-2" />
            {/* Radiating rays */}
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <span
                key={deg}
                className="boost-ray"
                style={{ transform: `rotate(${deg}deg) translateY(-26px)` }}
              />
            ))}
          </>
        )}
        <Zap
          size={18}
          fill={boostActive ? "#fff" : "#8B5CF6"}
          style={{
            position: "relative",
            zIndex: 2,
            filter: boostActive ? "drop-shadow(0 0 6px rgba(255,255,255,0.9))" : "none",
          }}
          className={boostActive ? "boost-zap-icon" : ""}
        />
        {boostActive && (
          <span className="boost-multiplier-badge" aria-hidden>
            ×{boostMultiplier}
          </span>
        )}
      </button>

      <style>{`
        @keyframes boost-btn-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .boost-pulse-btn {
          animation: boost-btn-pulse 1.8s ease-in-out infinite;
        }
        @keyframes boost-ring-expand {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .boost-ring {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 2px solid rgba(236,72,153,0.7);
          pointer-events: none;
        }
        .boost-ring-1 { animation: boost-ring-expand 1.6s ease-out infinite; }
        .boost-ring-2 { animation: boost-ring-expand 1.6s ease-out infinite; animation-delay: 0.8s; }
        @keyframes boost-ray-flash {
          0%, 100% { opacity: 0.2; transform-origin: center; }
          50% { opacity: 1; }
        }
        .boost-ray {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 2px;
          height: 8px;
          margin-left: -1px;
          margin-top: -4px;
          background: linear-gradient(to top, transparent, #fff);
          border-radius: 2px;
          transform-origin: center;
          animation: boost-ray-flash 1.4s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes boost-zap-bolt {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.15) rotate(-6deg); }
          75% { transform: scale(1.15) rotate(6deg); }
        }
        .boost-zap-icon {
          animation: boost-zap-bolt 1.2s ease-in-out infinite;
        }
        @keyframes boost-mult-pop {
          0%   { transform: translate(35%, -35%) scale(0.4); opacity: 0; }
          25%  { transform: translate(35%, -35%) scale(1.25); opacity: 1; }
          60%  { transform: translate(35%, -35%) scale(1); }
          100% { transform: translate(35%, -35%) scale(1); opacity: 1; }
        }
        @keyframes boost-mult-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.0), 0 0 10px rgba(236,72,153,0.55); }
          50%      { box-shadow: 0 0 0 4px rgba(251,191,36,0.18), 0 0 16px rgba(236,72,153,0.85); }
        }
        .boost-multiplier-badge {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 3;
          min-width: 22px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: linear-gradient(135deg, #FBBF24, #F59E0B);
          color: #1a0a02;
          font-size: 10px;
          font-weight: 900;
          line-height: 16px;
          letter-spacing: -0.02em;
          text-align: center;
          border: 1.5px solid rgba(255,255,255,0.95);
          transform-origin: top right;
          animation:
            boost-mult-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1) both,
            boost-mult-glow 1.8s ease-in-out 360ms infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};
      `}</style>
    </div>
  );
};
