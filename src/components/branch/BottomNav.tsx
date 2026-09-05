import React from "react";
import { createPortal } from "react-dom";
import { Home, ClipboardList, ShoppingCart, Search as SearchIcon } from "lucide-react";

interface BottomNavProps {
  activePanel: "USAGE" | "ORDER" | null;
  setActivePanel: (panel: "USAGE" | "ORDER" | null) => void;
  isSearchActive: boolean;
  toggleSearch: () => void;
  goHome: () => void;
  isHome: boolean;
  compact?: boolean;
  /** Lift the nav above a fixed bottom bar (e.g. the collapsed past-data footer). */
  raised?: boolean;
}

const items = [
  { key: "HOME", Icon: Home, label: "Home" },
  { key: "USAGE", Icon: ClipboardList, label: "Usage" },
  { key: "ORDER", Icon: ShoppingCart, label: "Order" },
  { key: "SEARCH", Icon: SearchIcon, label: "Search" },
] as const;

export const BottomNav = ({
  activePanel,
  setActivePanel,
  isSearchActive,
  toggleSearch,
  goHome,
  isHome,
  compact = false,
  raised = false,
}: BottomNavProps) => {
  const isActive = (key: string) => {
    if (key === "HOME") return isHome;
    if (key === "SEARCH") return isSearchActive;
    return activePanel === key;
  };

  const onPress = (key: string) => {
    if (key === "HOME") return goHome();
    if (key === "SEARCH") {
      setActivePanel(null);
      return toggleSearch();
    }
    setActivePanel(activePanel === key ? null : (key as "USAGE" | "ORDER"));
  };

  return createPortal(
    <nav
      // Stable hook for BottomNavQuickAdd to measure this pill's live width
      // so the standalone Quick Add circle can sit flush to its right.
      data-branch-bottom-nav
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        // Follow the page slide transition (vars driven by useSlideExit/useSlideEnter)
        translate: "var(--page-slide-x, 0vw) 0",
        opacity: "var(--page-slide-o, 1)",
        transition: "translate 0.3s ease-in-out, opacity 0.3s ease-in-out",
        bottom: compact ? "env(safe-area-inset-bottom, 0px)" : `calc(env(safe-area-inset-bottom, 0px) + ${raised ? 60 : 16}px)`,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: compact ? "5px" : "8px",
        padding: compact ? "5px 12px" : "6px 14px",
        borderRadius: compact ? "16px" : "999px",
        // Glassmorphism (matches BottomNavOffice): translucent gradient pane,
        // blur + saturation of the content behind it, a bright top rim (inset
        // highlight) and a soft drop shadow.
        background: "linear-gradient(135deg, hsl(var(--background) / 0.42), hsl(var(--background) / 0.2))",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "0.5px solid hsl(var(--foreground) / 0.14)",
        boxShadow: "0 8px 32px hsl(0 0% 0% / 0.14), inset 0 1px 0 hsl(0 0% 100% / 0.45), inset 0 -1px 0 hsl(0 0% 0% / 0.04)",
      }}
    >
      {items.map(({ key, Icon, label }) => {
        const active = isActive(key);
        return (
          <button
            key={key}
            aria-label={label}
            onClick={() => onPress(key)}
            style={{
              background: active ? "hsl(var(--foreground) / 0.08)" : "none",
              border: "none",
              cursor: "pointer",
              width: compact ? 48 : 56,
              height: compact ? 38 : 46,
              borderRadius: "999px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "2px",
              color: "hsl(var(--foreground))",
              opacity: active ? 1 : 0.7,
              transition: "opacity 0.2s ease, background 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = active ? "1" : "0.7";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Icon size={compact ? 18 : 21} strokeWidth={1.5} />
            <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.03em", fontFamily: "Raleway, inherit", lineHeight: 1 }}>{label}</span>
          </button>
        );
      })}
    </nav>,
    document.body
  );
};
