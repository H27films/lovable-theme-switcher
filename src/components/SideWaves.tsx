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
// The boundary stays within x ≈ 55–110 (a narrow band close to the edge) and
// the a→b morph deltas are small (≤13 viewBox units) with slow cycles, so the
// waves only breathe gently instead of swinging across the band.
const LAYERS: WaveLayer[] = [
  {
    // Front layer — main visible wave, flush to left edge
    a: "M0,0 L85,0 C85,50 105,50 105,100 C105,150 70,150 70,200 C70,250 110,250 110,300 C110,350 75,350 75,400 C75,450 105,450 105,500 C105,550 80,550 80,600 C80,650 100,650 100,700 C100,750 85,750 85,800 L0,800 Z",
    b: "M0,0 L95,0 C95,50 92,50 92,100 C92,150 82,150 82,200 C82,250 98,250 98,300 C98,350 87,350 87,400 C87,450 93,450 93,500 C93,550 92,550 92,600 C92,650 90,650 90,700 C90,750 78,750 78,800 L0,800 Z",
    dur: 14,
    opacity: 0.35,
  },
  {
    // Deeper layer — lighter echo that also runs the full height
    a: "M0,0 L60,0 C60,50 80,50 80,100 C80,150 55,150 55,200 C55,250 85,250 85,300 C85,350 60,350 60,400 C60,450 82,450 82,500 C82,550 58,550 58,600 C58,650 78,650 78,700 C78,750 62,750 62,800 L0,800 Z",
    b: "M0,0 L68,0 C68,50 70,50 70,100 C70,150 64,150 64,200 C64,250 74,250 74,300 C74,350 69,350 69,400 C69,450 72,450 72,500 C72,550 66,550 66,600 C66,650 70,650 70,700 C70,750 55,750 55,800 L0,800 Z",
    dur: 18,
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
