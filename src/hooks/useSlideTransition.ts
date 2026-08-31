import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CSSProperties } from "react";

/**
 * Slide transition used between the simple pages (Landing, Admin Portal,
 * Order, Search and the Boudoir / Chic / Nur Yadi branch pages). It mirrors
 * the old in-portal section transition: the current page slides out with a
 * blur + fade, then the destination page slides in from the opposite side.
 *
 * Usage on a page:
 *   const { exiting, slideTo } = useSlideExit();
 *   const enterStyle = useSlideEnter();
 *   <div style={{ ...enterStyle, ...slideExitStyle(exiting) }}> ...
 * and navigate with slideTo(path, state, "forward" | "back") instead of navigate().
 *
 * Forward: current page exits left, next page enters from the right.
 * Back:    current page exits right, next page enters from the left.
 */

/** How long the outgoing page slides before the navigation happens (ms). */
export const SLIDE_EXIT_MS = 280;

export type SlideDirection = "forward" | "back";

interface SlideRouterState {
  enterFrom?: "right" | "left";
  [key: string]: unknown;
}

const SLIDE_TRANSITION =
  "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out";

/** Style for the outgoing (exiting) page root. No-op when not exiting. */
export function slideExitStyle(exiting: SlideDirection | null): CSSProperties {
  if (!exiting) return {};
  return {
    transition: SLIDE_TRANSITION,
    transform: exiting === "forward" ? "translateX(-30%)" : "translateX(30%)",
    filter: "blur(6px)",
    opacity: 0,
  };
}

/**
 * Exit half of the transition. Returns the current `exiting` direction (feed
 * it into slideExitStyle) and `slideTo`, which plays the exit animation and
 * then navigates, tagging the destination so it knows which side to enter from.
 */
export function useSlideExit() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState<SlideDirection | null>(null);
  const timerRef = useRef<number | null>(null);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  // Let portaled fixed UI (the branch BottomNav) follow the page slide.
  useEffect(() => {
    if (!exiting) return;
    document.body.style.setProperty("--page-slide-x", exiting === "forward" ? "-30vw" : "30vw");
    document.body.style.setProperty("--page-slide-o", "0");
    return () => {
      document.body.style.removeProperty("--page-slide-x");
      document.body.style.removeProperty("--page-slide-o");
    };
  }, [exiting]);

  const slideTo = useCallback(
    (path: string, state?: Record<string, unknown>, direction: SlideDirection = "forward") => {
      if (exiting) return; // already animating out – ignore extra taps
      setExiting(direction);
      timerRef.current = window.setTimeout(() => {
        navigateRef.current(path, {
          state: {
            ...(state || {}),
            enterFrom: direction === "forward" ? "right" : "left",
          },
        });
      }, SLIDE_EXIT_MS);
    },
    [exiting]
  );

  return { exiting, slideTo };
}

/**
 * Enter half of the transition. Returns a style for the page root that slides
 * the page in from the side recorded in the router state (`enterFrom`), then
 * removes itself once finished so `position: fixed` children re-anchor to the
 * viewport exactly as they do without the animation. No-op when the page was
 * opened without a slide transition (e.g. cold load or instant navigation).
 */
export function useSlideEnter(): CSSProperties {
  const location = useLocation();
  const enterFrom = (location.state as SlideRouterState | null)?.enterFrom;
  // 0 = parked off-screen, 1 = animating in, 2 = done (styles removed)
  const [stage, setStage] = useState<0 | 1 | 2>(enterFrom ? 0 : 2);

  useEffect(() => {
    if (stage !== 0) return;
    // Double rAF so the translated first frame is painted before animating.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setStage(1));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 1) return;
    const t = window.setTimeout(() => setStage(2), 320);
    return () => window.clearTimeout(t);
  }, [stage]);

  // Keep portaled fixed UI (branch BottomNav) in sync with the entrance slide.
  useLayoutEffect(() => {
    if (stage === 0 && enterFrom) {
      document.body.style.setProperty("--page-slide-x", enterFrom === "right" ? "30vw" : "-30vw");
      document.body.style.setProperty("--page-slide-o", "0");
    } else if (stage === 1) {
      document.body.style.setProperty("--page-slide-x", "0vw");
      document.body.style.setProperty("--page-slide-o", "1");
    } else {
      document.body.style.removeProperty("--page-slide-x");
      document.body.style.removeProperty("--page-slide-o");
    }
  }, [stage, enterFrom]);

  if (!enterFrom || stage === 2) return {};
  if (stage === 0) {
    return {
      transform: enterFrom === "right" ? "translateX(30%)" : "translateX(-30%)",
      filter: "blur(6px)",
      opacity: 0,
    };
  }
  return {
    transition: SLIDE_TRANSITION,
    transform: "translateX(0)",
    filter: "blur(0px)",
    opacity: 1,
  };
}
