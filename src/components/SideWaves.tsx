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
// The darker gradient core stays slim (x ≈ 30–48) while the lighter layer
// behind it reaches much further (x ≈ 68–98), so the lighter shade is the
// dominant visible band. Morph deltas are small (≤10 units) and the cycles
// slow, so the waves only breathe gently.
const LAYERS: WaveLayer[] = [
  {
    // Front layer — slim darker gradient core, flush to left edge
    a: "M0,0 L38,0 C38,50 45,50 45,100 C45,150 30,150 30,200 C30,250 48,250 48,300 C48,350 34,350 34,400 C34,450 44,450 44,500 C44,550 36,550 36,600 C36,650 42,650 42,700 C42,750 38,750 38,800 L0,800 Z",
    b: "M0,0 L45,0 C45,50 38,50 38,100 C38,150 37,150 37,200 C37,250 40,250 40,300 C40,350 42,350 42,400 C42,450 36,450 36,500 C36,550 44,550 44,600 C44,650 33,650 33,700 C33,750 30,750 30,800 L0,800 Z",
    dur: 14,
    opacity: 0.35,
  },
  {
    // Deeper layer — lighter shade reaching beyond the dark core
    a: "M0,0 L75,0 C75,50 95,50 95,100 C95,150 68,150 68,200 C68,250 98,250 98,300 C98,350 72,350 72,400 C72,450 92,450 92,500 C92,550 76,550 76,600 C76,650 90,650 90,700 C90,750 78,750 78,800 L0,800 Z",
    b: "M0,0 L84,0 C84,50 85,50 85,100 C85,150 76,150 76,200 C76,250 88,250 88,300 C88,350 80,350 80,400 C80,450 82,450 82,500 C82,550 84,550 84,600 C84,650 80,650 80,700 C80,750 70,750 70,800 L0,800 Z",
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
