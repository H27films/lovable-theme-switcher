import React from "react";

/**
 * Adds top padding equal to the device's safe-area inset so content
 * (notch / status bar on iOS, status bar on Android PWA) does not
 * overlap the page contents. Used to wrap mobile-first "Simple" pages.
 */
export default function SafeAreaTop({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "hsl(var(--background))",
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
