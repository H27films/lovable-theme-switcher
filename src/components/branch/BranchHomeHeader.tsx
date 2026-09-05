import type { ReactNode } from "react";
import { BranchHeader } from "./BranchHeader";

interface BranchHomeHeaderProps {
  branch: string;
  onBack: () => void;
  onFavouritesSubmitted?: () => void;
  children?: ReactNode;
}

export const BranchHomeHeader = ({ branch, onBack, onFavouritesSubmitted, children }: BranchHomeHeaderProps) => {
  return (
    <div style={{ flexShrink: 0, position: "relative" }}>
      {/* Decorative tinted wave behind the home header: a single-colour band
          whose bottom edge is a soft organic curve (peak left-of-centre,
          easing back down to both edges). z-index -1 keeps it behind all page
          content; the page root's stacking context keeps it above the page
          background. Home view only — search uses plain BranchHeader. */}
      <svg
        viewBox="0 0 660 260"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "120px", zIndex: -1, pointerEvents: "none" }}
      >
        <path
          d="M0,0 L660,0 L660,206 C 620,204 560,196 510,175 C 450,150 410,118 372,120 C 340,122 310,162 260,180 C 180,208 90,212 0,210 Z"
          fill="hsl(20, 32%, 88%)"
        />
      </svg>
      <BranchHeader branch={branch} onBack={onBack} onFavouritesSubmitted={onFavouritesSubmitted} />
      {children && <div style={{ padding: "2px 12px 0" }}>{children}</div>}
    </div>
  );
};