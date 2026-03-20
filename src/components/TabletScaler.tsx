import React from "react";
import { useTabletMode } from "@/hooks/useTabletMode";

export default function TabletScaler({ children }: { children: React.ReactNode }) {
  const { tablet } = useTabletMode();

  if (!tablet) return <>{children}</>;

  return (
    <div
      style={{
        zoom: 1.3,
        // ensure the zoomed content still fills the screen correctly
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}
