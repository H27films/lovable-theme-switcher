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
// The darker gradient core stays slim (x ≈ 24–68) while the lighter layer
// behind it reaches much further (x ≈ 66–112), so the lighter shade is the
// dominant visible band. Both boundaries start further right at the TOP and
// curve back in as they descend, so the band leans right at the top instead
// of ending on the same vertical plane as the bottom. The a→b morph swings
// ~14–18 units over slow cycles (12s / 16s) — gentle but clearly visible.
const LAYERS: WaveLayer[] = [
  {
    // Front layer — slim darker gradient core, flush to left edge; top leans right
    a: "M0,0 L62,0 C62,50 68,50 68,100 C68,150 40,150 40,200 C40,250 56,250 56,300 C56,350 44,350 44,400 C44,450 54,450 54,500 C54,550 46,550 46,600 C46,650 52,650 52,700 C52,750 48,750 48,800 L0,800 Z",
    b: "M0,0 L46,0 C46,50 52,50 52,100 C52,150 24,150 24,200 C24,250 40,250 40,300 C40,350 28,350 28,400 C28,450 36,450 36,500 C36,550 30,550 30,600 C30,650 36,650 36,700 C36,750 34,750 34,800 L0,800 Z",
    dur: 12,
    opacity: 0.35,
  },
  {
    // Deeper layer — lighter shade reaching beyond the dark core
    a: "M0,0 L104,0 C104,50 112,50 112,100 C112,150 82,150 82,200 C82,250 112,250 112,300 C112,350 86,350 86,400 C86,450 106,450 106,500 C106,550 90,550 90,600 C90,650 104,650 104,700 C104,750 92,750 92,800 L0,800 Z",
    b: "M0,0 L88,0 C88,50 102,50 102,100 C102,150 66,150 66,200 C66,250 94,250 94,300 C94,350 70,350 70,400 C70,450 90,450 90,500 C90,550 74,550 74,600 C74,650 88,650 88,700 C88,750 78,750 78,800 L0,800 Z",
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
            from {
              opacity: 0;
              transform: translateX(-100%); /* sweep in from beyond the left edge */
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          .side-waves {
            /* starts almost immediately so the sweep stays tight with the page slide */
            animation: sideWavesIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
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
