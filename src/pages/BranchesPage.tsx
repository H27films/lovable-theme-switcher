import React from "react";
import { useNavigate } from "react-router-dom";

interface BranchesPageProps {
  onBack?: () => void;
  onSelectBranch?: (branch: "office" | "boudoir" | "chic" | "nuryadi") => void;
}

export default function BranchesPage({ onBack, onSelectBranch }: BranchesPageProps) {
  const navigate = useNavigate();

  const handleBack = onBack ?? (() => navigate("/simple/branches/admin"));
  const handleSelectBranch = onSelectBranch ?? ((branch: "office" | "boudoir" | "chic" | "nuryadi") =>
    branch === "office"
      ? navigate("/simple/office")
      : navigate(`/simple/${branch}`, { state: { from: "branches" } })
  );

  return (
    <div style={{ minHeight: "100dvh", background: "hsl(var(--background))", color: "hsl(var(--foreground))", fontFamily: "'Raleway', sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Branch list */}
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ display: "flex", position: "relative", minHeight: "100dvh", overflow: "hidden" }}>
          {/* Ghost menu on left */}
          <div
            onClick={handleBack}
            style={{
              position: "absolute", left: "-70%", top: 0, bottom: 0, width: "100%",
              display: "flex", flexDirection: "column", justifyContent: "center",
              paddingLeft: "0px", alignItems: "flex-end", cursor: "pointer",
              opacity: 0.45, userSelect: "none", zIndex: 1,
            }}
          >
            {(["BRANCHES", "SEARCH", "ORDER"] as const).map((item) => (
              <div key={item} style={{
                fontSize: "clamp(26px, 8vw, 44px)", fontWeight: 300, letterSpacing: "0.04em",
                color: "hsl(var(--foreground))", lineHeight: 1, padding: "2px 0",
                overflow: "hidden", whiteSpace: "nowrap",
                filter: item === "BRANCHES" ? "blur(0.5px)" : "blur(1px)",
              }}>{item}</div>
            ))}
          </div>

          {/* Branch name buttons */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "35%", width: "100%" }}>
            {([
              { label: "OFFICE",   key: "office"   },
              { label: "BOUDOIR",  key: "boudoir"  },
              { label: "CHIC",     key: "chic"     },
              { label: "NUR YADI", key: "nuryadi"  },
            ] as { label: string; key: "office" | "boudoir" | "chic" | "nuryadi" }[]).map(({ label, key }) => (
              <button
                key={key}
                onClick={() => handleSelectBranch(key)}
                style={{
                  display: "block", textAlign: "left", padding: "2px 0",
                  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                  fontSize: "clamp(26px, 8vw, 44px)", fontWeight: 300, letterSpacing: "0.05em",
                  color: "hsl(var(--foreground))", lineHeight: 1,
                  transition: "opacity 0.2s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.5")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
