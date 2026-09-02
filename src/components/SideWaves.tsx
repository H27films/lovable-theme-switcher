import { useState } from "react";
import type { CSSProperties } from "react";

/**
 * SideWaves — decorative filled waves flowing vertically from left side of page.
 * Positioned IN FRONT of the branches box with organic morphing animation.
 * Similar to CornerWaves but flowing downward along the left edge.
 */

/** Subtle two-color palette that works with the cream theme. */
const DEFAULT_COLORS = ["hsl(20, 27%, 49%)", "hsl(20, 32%, 64%)"];

interface WaveLayer {
  /** Shape A of the morph. */
  a: string;
  /** Shape B of the morph. Must share the exact command structure of `a`. */
  b: string;
  /** Seconds for one A → B → A cycle. */
  dur: number;
  /** Layer opacity. */
  opacity: number;
}

// Filled wave shapes flowing vertically down the left side. Every shape spans
// the FULL viewBox height (y = 0 → 800) and is anchored to the left edge
// (x = 0), so the band always reads as one continuous top-to-bottom wave.
// Command structure per shape: M L + 8×C + L Z — kept identical between the
// a/b shapes of each layer so SMIL can interpolate. Control points sit
// directly above/below their endpoints (vertical tangents at every joint),
// keeping the boundary smooth with no kinks or diagonal jumps.
// The darker gradient core stays slim (x ≈ 24–56) while the lighter layer
// behind it reaches much further (x ≈ 66–112), so the lighter shade is the
// dominant visible band. The a→b morph swings ~14–18 units over slow cycles
// (12s / 16s) — a gentle but clearly visible drift.
const LAYERS: WaveLayer[] = [
  {
    // Front layer — slim darker gradient core, flush to left edge
    a: "M0,0 L48,0 C48,50 54,50 54,100 C54,150 40,150 40,200 C40,250 56,250 56,300 C56,350 44,350 44,400 C44,450 54,450 54,500 C54,550 46,550 46,600 C46,650 52,650 52,700 C52,750 48,750 48,800 L0,800 Z",
    b: "M0,0 L32,0 C32,50 38,50 38,100 C38,150 24,150 24,200 C24,250 40,250 40,300 C40,350 28,350 28,400 C28,450 36,450 36,500 C36,550 30,550 30,600 C30,650 36,650 36,700 C36,750 34,750 34,800 L0,800 Z",
    dur: 12,
    opacity: 0.35,
  },
  {
    // Deeper layer — lighter shade reaching beyond the dark core
    a: "M0,0 L89,0 C89,50 108,50 108,100 C108,150 82,150 82,200 C82,250 112,250 112,300 C112,350 86,350 86,400 C86,450 106,450 106,500 C106,550 90,550 90,600 C90,650 104,650 104,700 C104,750 92,750 92,800 L0,800 Z",
    b: "M0,0 L74,0 C74,50 92,50 92,100 C92,150 66,150 66,200 C66,250 94,250 94,300 C94,350 70,350 70,400 C70,450 90,450 90,500 C90,550 74,550 74,600 C74,650 88,650 88,700 C88,750 78,750 78,800 L0,800 Z",
    dur: 16,
    opacity: 0.22,
  },
];

interface SideWavesProps {
  /** Override the default palette with a single fill colour. */
  color?: string;
  /** Escape hatch to override positioning/sizing. */
  style?: CSSProperties;
  /** Play the fade-in on mount. */
  animateIn?: boolean;
}

export default function SideWaves({ color, style, animateIn = true }: SideWavesProps) {
  // Respect users who prefer reduced motion
  const [reducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  return (
    <>
      {animateIn && !reducedMotion && (
        <style>{`
          @keyframes sideWavesIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .side-waves {
            animation: sideWavesIn 1.2s ease-out 0.3s both;
          }
        `}</style>
      )}
      <div
        aria-hidden="true"
        className={animateIn && !reducedMotion ? "side-waves" : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0, // anchored stretch — parent only sets min-height, so height:100% may not resolve
          zIndex: 15,
          width: "clamp(80px, 14vw, 120px)", // narrow band — stays close to the left edge
          pointerEvents: "none",
          overflow: "hidden",
          ...style,
        }}
      >
        <svg
          viewBox="0 0 200 800"
          width="100%"
          height="100%"
          preserveAspectRatio="none" // stretch to fill exactly → wave stays flush left, full height, no letterbox gap
          focusable="false"
        >
          <defs>
            <linearGradient id="sideGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color ?? DEFAULT_COLORS[0]} />
              <stop offset="100%" stopColor={color ?? DEFAULT_COLORS[1]} />
            </linearGradient>
            <filter id="sideBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
            </filter>
          </defs>
          {LAYERS.map((layer, i) => (
            <path
              key={i}
              d={layer.a}
              fill={i === 0 ? "url(#sideGradient)" : (color ?? DEFAULT_COLORS[i])}
              fillOpacity={layer.opacity}
              filter={i === 0 ? "url(#sideBlur)" : undefined}
            >
              {!reducedMotion && (
                <animate
                  attributeName="d"
                  dur={`${layer.dur}s`}
                  repeatCount="indefinite"
                  calcMode="spline"
                  keyTimes="0;0.5;1"
                  keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                  values={`${layer.a};${layer.b};${layer.a}`}
                />
              )}
            </path>
          ))}
        </svg>
      </div>
    </>
  );
}
