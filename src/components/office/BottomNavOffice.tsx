import React from "react";
import { createPortal } from "react-dom";
import { Home, ShoppingCart, BarChart3, LayoutDashboard, Search as SearchIcon } from "lucide-react";

export type OfficeNavKey = "home" | "order" | "sales" | "admin" | "search";

interface BottomNavOfficeProps {
  /** Which tab is currently active (highlighted pill). */
  active: OfficeNavKey | null;
  /** Called with the tapped tab key; each page decides routing / overlay behaviour. */
  onSelect: (key: OfficeNavKey) => void;
  /** Lift the nav above a fixed bottom footer (e.g. the collapsed Order Summary bar). */
  raised?: boolean;
}

const items = [
  { key: "home", Icon: Home, label: "Home" },
  { key: "order", Icon: ShoppingCart, label: "Order" },
  { key: "sales", Icon: BarChart3, label: "Sales" },
  { key: "search", Icon: SearchIcon, label: "Search" },
  { key: "admin", Icon: LayoutDashboard, label: "Admin Portal" },
] as const;

/**
 * Office variant of the branch BottomNav (src/components/branch/BottomNav.tsx):
 * same floating pill, same page-slide coupling, same icon button styling — but
 * with the Office tab set (Home / Order / Sales / Search / Admin Portal) and a
 * page-driven active/onSelect API, since Sales is an overlay on the Office page
 * while Order, Search and Admin Portal are separate routes.
 * (Sync was moved into the OfficeHeader hamburger dropdown.)
 */
export const BottomNavOffice = ({ active, onSelect, raised = false }: BottomNavOfficeProps) => {
  return createPortal(
    <nav
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        // Follow the page slide transition (vars driven by useSlideExit/useSlideEnter)
        translate: "var(--page-slide-x, 0vw) 0",
        opacity: "var(--page-slide-o, 1)",
        transition: "translate 0.3s ease-in-out, opacity 0.3s ease-in-out",
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${raised ? 60 : 16}px)`,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "999px",
        // Glassmorphism: translucent gradient pane, blur + saturation of the
        // content behind it, a bright top rim (inset highlight) and a soft drop shadow.
        background: "linear-gradient(135deg, hsl(var(--background) / 0.42), hsl(var(--background) / 0.2))",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        border: "0.5px solid hsl(var(--foreground) / 0.14)",
        boxShadow: "0 8px 32px hsl(0 0% 0% / 0.14), inset 0 1px 0 hsl(0 0% 100% / 0.45), inset 0 -1px 0 hsl(0 0% 0% / 0.04)",
      }}
    >
      {items.map(({ key, Icon, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            aria-label={label}
            title={label}
            onClick={() => onSelect(key)}
            style={{
              background: isActive ? "hsl(var(--foreground) / 0.08)" : "none",
              border: "none",
              cursor: "pointer",
              width: 52,
              height: 38,
              borderRadius: "999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(var(--foreground))",
              opacity: isActive ? 1 : 0.7,
              transition: "opacity 0.2s ease, background 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = isActive ? "1" : "0.7";
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
