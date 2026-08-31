import { useState } from "react";
import type { CSSProperties } from "react";

/**
 * CornerWaves — slow, organic waves flowing diagonally out of the top-right
 * corner: one edge of the wave field emerges from the TOP of the page, the
 * other from the RIGHT side, with a soft wavy boundary running at ~45° facing
 * the page interior (so it never covers the title, buttons or bottom bar).
 *
 * Implementation: a square SVG whose viewBox corner (600, 0) sits exactly on
 * the page corner — the waves are anchored to the viewBox top edge (= page
 * top) and right edge (= page right side), so no CSS rotation tricks are
 * needed and nothing gets clipped unexpectedly.
 *
 * Layers morph via SMIL (<animate d="…">), which works on iOS Safari / Chrome
 * / Firefox (CSS `d: path()` morphing is Chromium-only, so it was avoided on
 * purpose). Each layer morphs between two shapes with a different duration,
 * so the waves drift in and out of phase — that desync is what makes the
 * motion feel like water instead of a loop.
 */

/** Light-green triad (front → deep) that harmonises with the cream theme. */
const DEFAULT_COLORS = ["hsl(20, 27%, 49%)", "hsl(20, 32%, 64%)", "hsl(30, 38%, 86%)"];

interface WaveLayer {
  /** Shape A of the morph (also the resting shape for reduced-motion users). */
  a: string;
  /** Shape B of the morph. Must share the exact command structure of `a`. */
  b: string;
  /** Seconds for one A → B → A cycle. */
  dur: number;
  /** Layer opacity — deeper layers are fainter, mimicking depth. */
  opacity: number;
}

// viewBox is a 600×600 square; the page's top-right corner sits at (600, 0).
// Each wave hugs the top edge (from the corner leftward) and the right edge
// (from the corner downward), with a wavy diagonal edge sweeping between them.
// Command structure: M L C C C Z — kept identical between shapes per layer so
// SMIL can interpolate.
const LAYERS: WaveLayer[] = [
  {
    // Front layer — hugs the corner most tightly (reaches ~340/600 along the
    // top edge and ~250/600 down the right side).
    a: "M600,0 L340,0 C355,50 355,80 390,120 C425,160 500,110 545,145 C585,175 592,215 600,250 Z",
    b: "M600,0 L340,0 C355,25 415,35 455,60 C495,85 470,175 495,210 C520,245 565,185 600,205 Z",
    dur: 9,
    opacity: 0.3,
  },
  {
    // Middle layer — reaches further into the page (~240/600 top, ~370/600 right).
    a: "M600,0 L240,0 C265,60 275,120 315,175 C355,230 480,180 520,215 C560,250 585,320 600,370 Z",
    b: "M600,0 L240,0 C270,30 345,50 395,85 C445,120 410,255 440,300 C470,345 555,300 600,330 Z",
    dur: 13,
    opacity: 0.24,
  },
  {
    // Deepest layer — faintest, sweeping ~130/600 along the top edge and
    // ~490/600 down the right side for maximum corner coverage.
    a: "M600,0 L130,0 C160,80 175,160 230,220 C285,280 445,240 490,280 C540,320 580,420 600,490 Z",
    b: "M600,0 L130,0 C180,35 270,65 330,105 C390,145 340,320 390,370 C440,420 545,380 600,430 Z",
    dur: 17,
    opacity: 0.18,
  },
];

interface CornerWavesProps {
  /** Override the default light-green palette with a single fill colour for all layers. */
  color?: string;
  /** Escape hatch to override the corner placement/sizing. */
  style?: CSSProperties;
  /** Play the fade-in on mount. Pass false when the page enters via a slide
   *  transition so the waves appear instantly with the rest of the content. */
  animateIn?: boolean;
}

export default function CornerWaves({ color, style, animateIn = true }: CornerWavesProps) {
  // Respect users who prefer reduced motion: render the static resting shape
  // with no morphing and no entrance fade.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  return (
    <>
      {animateIn && !reducedMotion && (
        <style>{`
          @keyframes cornerWavesIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .corner-waves {
            animation: cornerWavesIn 1.2s ease-out 0.15s both;
          }
        `}</style>
      )}
      <div
        aria-hidden="true"
        className={animateIn && !reducedMotion ? "corner-waves" : undefined}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: -1, // behind all page content — translucent panels reveal it subtly
          width: "clamp(290px, 85vmin, 1700px)",
          height: "clamp(290px, 85vmin, 1700px)",
          pointerEvents: "none",
          overflow: "hidden",
          ...style,
        }}
      >
        <svg viewBox="0 0 600 600" width="100%" height="100%" focusable="false">
          {LAYERS.map((layer, i) => (
            <path
              key={i}
              d={layer.a}
              fill={color ?? DEFAULT_COLORS[i]}
              fillOpacity={layer.opacity}
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
