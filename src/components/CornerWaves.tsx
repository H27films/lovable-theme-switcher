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
const DEFAULT_COLORS = ["hsl(152, 45%, 58%)", "hsl(150, 42%, 66%)", "hsl(145, 38%, 74%)"];

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
    // Front layer — hugs the corner most tightly.
    a: "M600,0 L400,0 C420,50 420,70 441,92 C470,120 530,95 553,113 C575,135 590,170 600,200 Z",
    b: "M600,0 L400,0 C420,20 460,30 486,47 C515,70 490,130 508,158 C530,190 570,175 600,170 Z",
    dur: 9,
    opacity: 0.3,
  },
  {
    // Middle layer — reaches a little further into the page.
    a: "M600,0 L320,0 C340,50 350,75 380,120 C410,165 495,135 527,167 C555,195 580,240 600,280 Z",
    b: "M600,0 L320,0 C345,25 410,40 438,68 C465,95 455,180 482,212 C510,245 565,215 600,235 Z",
    dur: 13,
    opacity: 0.24,
  },
  {
    // Deepest layer — faintest, reaching furthest along both edges.
    a: "M600,0 L240,0 C270,60 300,110 330,150 C360,190 475,185 505,215 C540,250 570,310 600,360 Z",
    b: "M600,0 L240,0 C280,30 360,55 390,90 C420,125 420,235 450,270 C480,305 555,275 600,300 Z",
    dur: 17,
    opacity: 0.18,
  },
];

interface CornerWavesProps {
  /** Override the default light-green palette with a single fill colour for all layers. */
  color?: string;
  /** Escape hatch to override the corner placement/sizing. */
  style?: CSSProperties;
}

export default function CornerWaves({ color, style }: CornerWavesProps) {
  // Respect users who prefer reduced motion: render the static resting shape
  // with no morphing and no entrance fade.
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  return (
    <>
      {!reducedMotion && (
        <style>{`
          @keyframes cornerWavesIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          .corner-waves {
            animation: cornerWavesIn 1.8s ease-out 0.3s both;
          }
        `}</style>
      )}
      <div
        aria-hidden="true"
        className={reducedMotion ? undefined : "corner-waves"}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "clamp(280px, 38vmin, 520px)",
          height: "clamp(280px, 38vmin, 520px)",
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
