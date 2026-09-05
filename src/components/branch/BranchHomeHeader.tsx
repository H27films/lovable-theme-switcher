import { useId } from "react";
import type { ReactNode } from "react";
import { BranchHeader } from "./BranchHeader";

/** Branch tint sets: lighter warm terracotta / tan inspired colors */
const TINTS: Record<string, { top: string; bottom: string }> = {
  BOUDOIR: { top: "hsl(20, 32%, 85%)", bottom: "hsl(30, 38%, 90%)" },
  CHIC: { top: "hsl(20, 32%, 85%)", bottom: "hsl(30, 38%, 90%)" },
  "NUR YADI": { top: "hsl(20, 32%, 85%)", bottom: "hsl(30, 38%, 90%)" },
};

interface BranchHomeHeaderProps {
  branch: string;
  onBack: () => void;
  onFavouritesSubmitted?: () => void;
  children?: ReactNode;
}

export const BranchHomeHeader = ({ branch, onBack, onFavouritesSubmitted, children }: BranchHomeHeaderProps) => {
  const tint = TINTS[(branch ?? "").trim().toUpperCase()] ?? TINTS.BOUDOIR;
  const clipPathId = useId();

  return (
    <div style={{ flexShrink: 0, position: "relative" }}>
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <clipPath id={clipPathId} clipPathUnits="objectBoundingBox">
            <path d="M0,0 L1,0 L1,0.7 C1,0.75 0.85,0.88 0.5,0.88 C0.15,0.88 0,0.75 0,0.7 L0,0 Z" />
          </clipPath>
        </defs>
      </svg>

      <div style={{ 
        background: `linear-gradient(180deg, ${tint.top} 0%, ${tint.bottom} 60%, transparent 100%)`,
        paddingBottom: "24px",
        clipPath: `url(#${clipPathId})`
      }}>
        <BranchHeader branch={branch} onBack={onBack} onFavouritesSubmitted={onFavouritesSubmitted} />
        {children && <div style={{ padding: "2px 12px 0" }}>{children}</div>}
        <div style={{ height: "12px" }} />
      </div>
    </div>
  );
};