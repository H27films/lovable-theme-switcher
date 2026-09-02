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
const LAYERS: WaveLayer[] = [
  {
    // Front layer — main visible wave, flush to left edge
    a: "M0,0 L100,0 C100,50 130,50 130,100 C130,150 80,150 80,200 C80,250 140,250 140,300 C140,350 90,350 90,400 C90,450 150,450 150,500 C150,550 100,550 100,600 C100,650 140,650 140,700 C140,750 90,750 90,800 L0,800 Z",
    b: "M0,0 L130,0 C130,50 90,50 90,100 C90,150 150,150 150,200 C150,250 100,250 100,300 C100,350 155,350 155,400 C155,450 95,450 95,500 C95,550 145,550 145,600 C145,650 85,650 85,700 C85,750 120,750 120,800 L0,800 Z",
    dur: 10,
    opacity: 0.35,
  },
  {
    // Deeper layer — lighter echo that also runs the full height
    a: "M0,0 L70,0 C70,50 120,50 120,100 C120,150 60,150 60,200 C60,250 125,250 125,300 C125,350 70,350 70,400 C70,450 130,450 130,500 C130,550 75,550 75,600 C75,650 115,650 115,700 C115,750 60,750 60,800 L0,800 Z",
    b: "M0,0 L95,0 C95,50 55,50 55,100 C55,150 130,150 130,200 C130,250 65,250 65,300 C65,350 135,350 135,400 C135,450 60,450 60,500 C60,550 125,550 125,600 C125,650 70,650 70,700 C70,750 95,750 95,800 L0,800 Z",
    dur: 13,
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
          width: "clamp(120px, 25vw, 200px)",
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
