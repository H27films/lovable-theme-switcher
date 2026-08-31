import React from "react";
import { useTabletMode } from "@/hooks/useTabletMode";

/** The zoom factor applied to /simple pages in tablet mode. */
export const TABLET_SCALE = 1.3;

/**
 * Fractional viewport sizes that, when zoomed by TABLET_SCALE, render at
 * exactly 100vw × 100dvh (100 / 1.3 = 76.92308). Keeps the zoomed page
 * inside the visible viewport instead of overflowing (which creates scroll).
 */
export const TABLET_FIT_WIDTH = "76.92308vw";
export const TABLET_FIT_HEIGHT = "76.92308dvh";

interface TabletScalerProps {
  children: React.ReactNode;
  /**
   * Constrain the zoomed page to exactly one viewport (no vertical/horizontal
   * scrolling). Use for single-screen menus (BranchesPage, AdminPortal) where
   * a zoomed 100dvh page would otherwise overflow and allow scrolling.
   */
  fitViewport?: boolean;
}

export default function TabletScaler({ children, fitViewport = false }: TabletScalerProps) {
  const { tablet } = useTabletMode();

  if (!tablet) return <>{children}</>;

  if (fitViewport) {
    return (
      <div
        style={{
          zoom: TABLET_SCALE,
          // Zoomed back up these render at exactly 100vw × 100dvh → no scroll.
          width: TABLET_FIT_WIDTH,
          height: TABLET_FIT_HEIGHT,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        zoom: TABLET_SCALE,
        // ensure the zoomed content still fills the screen correctly
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
