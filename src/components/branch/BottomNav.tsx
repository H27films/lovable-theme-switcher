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
style={{
         position: "fixed",
         left: "50%",
         transform: "translateX(-50%)",
         bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
         zIndex: 99999,
         display: "flex",
         alignItems: "center",
         gap: "8px",
         padding: "8px 14px",
         borderRadius: "999px",
         background: "hsl(var(--background) / 0.8)",
         backdropFilter: "blur(12px)",
         WebkitBackdropFilter: "blur(12px)",
         border: "0.5px solid hsl(var(--border))",
         boxShadow: "0 8px 24px hsl(0 0% 0% / 0.18)",
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
              width: 52,
              height: 44,
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(var(--foreground))",
              opacity: active ? 1 : 0.55,
              transition: "opacity 0.2s ease, background 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = active ? "1" : "0.55";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Icon size={24} strokeWidth={1.5} />
          </button>
        );
      })}
    </nav>,
    document.body
  );
};
