import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes } from "react";

/**
 * FadeInImage — an <img> that fades in gracefully once it has actually
 * finished loading, so slow-network fetches never "pop" into view.
 *
 * - Images served from cache (already complete before React attaches the
 *   load handler) are revealed immediately with no fade.
 * - Honours prefers-reduced-motion: reduced-motion users see it appear
 *   instantly the moment it loads.
 * - All standard <img> props (src, alt, style, …) are forwarded.
 */
interface FadeInImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Seconds for the reveal fade (default 0.9s). */
  duration?: number;
}

export default function FadeInImage({ duration = 0.9, ...imgProps }: FadeInImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Cover the cached-image race: the browser can finish loading before
    // React attaches onLoad, in which case `complete` is already true.
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={imgRef}
      {...imgProps}
      onLoad={(e) => {
        setLoaded(true);
        imgProps.onLoad?.(e);
      }}
      style={{
        ...(imgProps.style as CSSProperties | undefined),
        opacity: loaded ? 1 : 0,
        transition:
          loaded && !reducedMotion ? `opacity ${duration}s ease-out` : undefined,
      }}
    />
  );
}
