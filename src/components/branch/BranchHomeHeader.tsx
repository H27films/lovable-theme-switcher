import { useId } from "react";
import type { ReactNode } from "react";
import { BranchHeader } from "./BranchHeader";

/**
 * BranchHomeHeader — decorated header shown ONLY on the branch home views
 * (Boudoir / Chic / Nur Yadi landing pages). It wraps the shared
 * BranchHeader (branch title + hamburger) and the log-view tab row inside a
 * soft, branch-tinted gradient that fades out toward the page background,
 * then finishes with a gentle wavy SVG divider that transitions into the
 * content below.
 *
 * Never rendered on Search, Order, Sales, Admin or product-detail views —
 * call sites gate it on the home state (no search active, no product open).
 *
 * Colour inspiration: the SideWaves palette (muted warm tones,
 * hsl(20, 27%, 49%) / hsl(20, 32%, 64%)) re-tinted per branch:
 * Boudoir = soft blush, Chic = soft teal, Nur Yadi = soft gold.
 */

/** Branch tint sets: gradient top/bottom stops + divider wave stroke. */
const TINTS: Record<string, { top: string; bottom: string; wave: string }> = {
  BOUDOIR: { top: "hsl(348, 50%, 84%)", bottom: "hsl(348, 38%, 94%)", wave: "hsl(348, 32%, 58%)" },
  CHIC: { top: "hsl(178, 38%, 77%)", bottom: "hsl(178, 28%, 91%)", wave: "hsl(178, 26%, 46%)" },
  "NUR YADI": { top: "hsl(42, 58%, 81%)", bottom: "hsl(42, 46%, 93%)", wave: "hsl(35, 42%, 52%)" },
};

/** Muted brown taken from the SideWaves palette — used for the soft echo wave. */
const SIDEWAVE_BROWN = "hsl(20, 27%, 49%)";

interface BranchHomeHeaderProps {
  branch: string;
  onBack: () => void;
  onFavouritesSubmitted?: () => void;
  /** Tab row (All Data / Salon / Sold / Orders) rendered inside the gradient, under the title. */
  children?: ReactNode;
}

export const BranchHomeHeader = ({ branch, onBack, onFavouritesSubmitted, children }: BranchHomeHeaderProps) => {
  const tint = TINTS[(branch ?? "").trim().toUpperCase()] ?? TINTS.BOUDOIR;
  const waveGradientId = useId();

  return (
    <div style={{ flexShrink: 0, position: "relative" }}>
      {/* Faded branch-tinted gradient behind the title + hamburger + tabs */}
      <div style={{ background: `linear-gradient(180deg, ${tint.top} 0%, ${tint.bottom} 55%, transparent 100%)` }}>
        <BranchHeader branch={branch} onBack={onBack} onFavouritesSubmitted={onFavouritesSubmitted} />
        {children && <div style={{ padding: "2px 12px 0" }}>{children}</div>}
        <div style={{ height: "12px" }} />
      </div>

      {/* Gentle wavy divider — smooth C-curve waves (no jagged segments) that
          transition the gradient header into the main content below */}
      <svg
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", width: "100%", height: "22px", marginTop: "-14px", position: "relative", pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id={waveGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={tint.wave} stopOpacity="0.15" />
            <stop offset="50%" stopColor={tint.wave} stopOpacity="0.7" />
            <stop offset="100%" stopColor={SIDEWAVE_BROWN} stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <path
          d="M0,18 C150,4 300,32 450,18 C600,4 750,32 900,18 C1050,4 1150,28 1200,16"
          fill="none"
          stroke={`url(#${waveGradientId})`}
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Soft echo wave below the main one, in the SideWaves brown */}
        <path
          d="M0,24 C150,12 300,38 450,24 C600,10 750,38 900,24 C1050,12 1150,34 1200,22"
          fill="none"
          stroke={SIDEWAVE_BROWN}
          strokeOpacity="0.16"
          strokeWidth="1.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};
