import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  Building2,
  Sparkles,
  Scissors,
  User,
  Search as SearchIcon,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import Search from "./Search";
import Order from "./Order";

type BranchKey = "office" | "boudoir" | "chic" | "nuryadi";
type ToolKey = "search" | "order";

/** Unified Admin Portal entry: Branches + Search + Order on a single screen. */
const AdminPortal = () => {
  const navigate = useNavigate();
  const { tablet } = useTabletMode();

  const [activeSection, setActiveSection] = useState<ToolKey | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "at-menu" | "menu-leaving" | "section-entering" | "at-section" | "section-leaving" | "menu-entering"
  >("at-menu");

  // ── Inline section transitions (same slide + blur logic as SubLanding) ──
  const navigateTo = (section: ToolKey) => {
    setTransitionPhase("menu-leaving");
    setTimeout(() => {
      setActiveSection(section);
      setTransitionPhase("section-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-section")));
    }, 280);
  };

  const navigateBack = () => {
    setTransitionPhase("section-leaving");
    setTimeout(() => {
      setActiveSection(null);
      setTransitionPhase("menu-entering");
      requestAnimationFrame(() => requestAnimationFrame(() => setTransitionPhase("at-menu")));
    }, 280);
  };

  // ── Branch navigation (react-router, leaves the portal) ──
  const navigateToBranch = (branch: BranchKey) => {
    if (branch === "office") {
      navigate("/simple/office");
    } else {
      // Pass origin so the branch page's header title knows where to navigate back to
      navigate(`/simple/${branch}`, { state: { from: "adminportal" } });
    }
  };

  const menuTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "menu-leaving" ? "translateX(-30%)" :
      transitionPhase === "menu-entering" ? "translateX(-30%)" : "translateX(0)",
    filter:
      transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "menu-leaving" || transitionPhase === "menu-entering" ? 0 : 1,
  };

  const sectionTransitionStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out, filter 0.3s ease-in-out, opacity 0.3s ease-in-out",
    transform:
      transitionPhase === "section-entering" ? "translateX(30%)" :
      transitionPhase === "section-leaving" ? "translateX(30%)" : "translateX(0)",
    filter:
      transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? "blur(6px)" : "blur(0px)",
    opacity: transitionPhase === "section-entering" || transitionPhase === "section-leaving" ? 0 : 1,
  };

  return (
    <div
      style={{
        minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
        background: "hsl(var(--background))",
        color: "hsl(var(--foreground))",
        fontFamily: "'Raleway', sans-serif",
      }}
    >
      {/* Fixed Home button (top left) - only show on the portal home */}
      <a
        href="/"
        aria-label="Go to main landing page"
        title="Home"
        style={{
          position: "fixed",
          left: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 24px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--muted-foreground))",
          textDecoration: "none",
        }}
      >
        <Home size={18} strokeWidth={1.4} />
      </a>

      <div className="max-w-full mx-auto px-3">
        {/* Portal menu (Branches card + Tools card) */}
        {activeSection === null && (
          <div style={{ position: "relative", minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh", overflow: "hidden", ...menuTransitionStyle }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "16px",
                // In tablet mode the zoomed page fills exactly the viewport, so
                // give the centered cards a gentle lift so they sit slightly above centre.
                transform: tablet ? "translateY(-5dvh)" : "translateY(0)",
                transition: "opacity 0.38s ease, transform 0.38s ease",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", maxWidth: "420px" }}>
                {/* Section 1 — Branches card */}
                <div style={cardStyle}>
                  <div style={cardListStyle}>
                    {BRANCHES.map(({ key, label, icon }) => (
                      <PillRow key={key} icon={icon} label={label} onPress={() => navigateToBranch(key)} />
                    ))}
                  </div>
                </div>

                {/* Section 2 — Tools card */}
                <div style={cardStyle}>
                  <div style={cardListStyle}>
                    {TOOLS.map(({ key, label, icon }) => (
                      <PillRow key={key} icon={icon} label={label} onPress={() => navigateTo(key)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline section pages */}
        {activeSection !== null && (
          <div style={sectionTransitionStyle}>
            {activeSection === "search" && <Search onBack={navigateBack} />}
            {activeSection === "order" && <Order onBack={navigateBack} />}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Styling ───────────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: "20px",
  padding: "16px",
  border: "1px solid hsl(var(--border))",
  boxShadow: "0 10px 30px -14px hsla(0, 0%, 0%, 0.16)",
};

const cardListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const pillStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  padding: "14px 16px",
  background: "hsl(var(--muted))",
  border: "none",
  borderRadius: "14px",
  cursor: "pointer",
  fontFamily: "inherit",
  color: "hsl(var(--foreground))",
  textAlign: "left",
  WebkitTapHighlightColor: "transparent",
  transition: "opacity 0.18s ease, transform 0.18s ease",
};

const iconBoxStyle: React.CSSProperties = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "10px",
  background: "hsl(var(--foreground))",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const pillLabelStyle: React.CSSProperties = {
  fontSize: "clamp(14px, 3.5vw, 17px)",
  fontWeight: 400,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "hsl(var(--foreground))",
  fontFamily: "'Raleway', inherit",
};

interface PillRowProps {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}

const PillRow = ({ icon: Icon, label, onPress }: PillRowProps) => {
  const dim = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.opacity = "0.75"; };
  const restore = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.opacity = "1";
    e.currentTarget.style.transform = "scale(1)";
  };
  const press = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.transform = "scale(0.985)"; };

  return (
    <button
      onClick={onPress}
      style={pillStyle}
      onMouseEnter={dim}
      onMouseLeave={restore}
      onMouseDown={press}
      onMouseUp={restore}
    >
      <span style={iconBoxStyle}>
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <span style={pillLabelStyle}>{label}</span>
    </button>
  );
};

/* ── Menu data ─────────────────────────────────────────────────────────── */

const BRANCHES: { key: BranchKey; label: string; icon: LucideIcon }[] = [
  { key: "office", label: "Office", icon: Building2 },
  { key: "boudoir", label: "Boudoir", icon: Sparkles },
  { key: "chic", label: "Chic", icon: Scissors },
  { key: "nuryadi", label: "Nur Yadi", icon: User },
];

const TOOLS: { key: ToolKey; label: string; icon: LucideIcon }[] = [
  { key: "search", label: "Search", icon: SearchIcon },
  { key: "order", label: "Order", icon: ClipboardList },
];

export default AdminPortal;