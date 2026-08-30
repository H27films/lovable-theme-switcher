import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import {
  ArrowLeft,
  Building2,
  User,
  ChevronRight,
  Search as SearchIcon,
  ClipboardList,
} from "lucide-react";
import Search from "./Search";
import Order from "./Order";

const AdminPortal = () => {
  const navigate = useNavigate();
  const { tablet } = useTabletMode();

  const [activeSection, setActiveSection] = useState<"search" | "order" | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<
    "at-menu" | "menu-leaving" | "section-entering" | "at-section" | "section-leaving" | "menu-entering"
  >("at-menu");

  const navigateTo = (section: "search" | "order") => {
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

  const branches = [
    { label: "Office",   key: "office"  as const, icon: <Building2 size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Boudoir",  key: "boudoir" as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Chic",     key: "chic"    as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Nur Yadi", key: "nuryadi" as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
  ];

  const handleBranch = (key: "office" | "boudoir" | "chic" | "nuryadi") => {
    if (key === "office") {
      navigate("/simple/office");
    } else {
      navigate(`/simple/${key}`, { state: { from: "adminportal" } });
    }
  };

  return (
    <div
      style={{
        minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
        background: "linear-gradient(135deg, #f5f1eb 0%, #f2ede5 100%)",
        color: "hsl(var(--foreground))",
        fontFamily: "'Raleway', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background SVG */}
      <div
        style={{
          position: "absolute",
          right: "-150px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "800px",
          height: "800px",
          zIndex: 1,
          opacity: 0.08,
        }}
      >
        <img
          src="/Hand.svg"
          alt="background"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* Admin Portal label */}
      <div
        style={{
          position: "fixed",
          left: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 24px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "block",
          fontSize: tablet ? "12px" : "13px",
          fontWeight: 400,
          color: "rgba(0,0,0,0.45)",
          letterSpacing: "0.02em",
        }}
      >
        
      </div>

      {/* Back arrow */}
      <a
        href="/"
        aria-label="Go to main landing page"
        style={{
          position: "fixed",
          right: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          zIndex: 60,
          display: activeSection !== null ? "none" : "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(0,0,0,0.75)",
          textDecoration: "none",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.55")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <ArrowLeft size={32} strokeWidth={1.8} />
      </a>

      {/* Main menu */}
      {activeSection === null && (
        <div
          style={{
            minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "0 10px 10px",
            ...menuTransitionStyle,
          }}
        >
          {/* Main container box - LEFT HALF - FULL HEIGHT */}
          <div
            style={{
              width: tablet ? "45%" : "48%",
              height: tablet ? `calc(${TABLET_FIT_HEIGHT} - 32px)` : "calc(100dvh - 32px)",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              borderRadius: "32px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 30px rgba(0,0,0,0.10)",
              overflow: "hidden",
              zIndex: 10,
              marginLeft: tablet ? "2%" : "1%",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Branches section */}
            <div
              style={{
                flex: 1,
                padding: tablet ? "16px" : "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              {/* ── BRANCHES ── */}
              <p style={{
                fontSize: tablet ? "14px" : "15px",
                fontWeight: 500,
                letterSpacing: "0.01em",
                color: "#000000",
                margin: "0 0 12px 4px",
                fontFamily: "'Raleway', sans-serif",
              }}>
                Branches
              </p>

              <div style={{ marginTop: tablet ? "24px" : "32px" }}>
              {branches.map(({ label, key, icon }, i) => (
                <div
                  key={key}
                  onClick={() => handleBranch(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    height: tablet ? "42px" : "46px",
                    background: "hsl(38 25% 92%)",
                    borderRadius: "9999px",
                    padding: "0 12px 0 8px",
                    cursor: "pointer",
                    transition: "background 0.15s ease, transform 0.15s ease",
                    margin: "0 -2px",
                    marginBottom: i < branches.length - 1 ? "12px" : "0",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "hsl(38 22% 88%)";
                    e.currentTarget.style.transform = "scale(1.01)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "hsl(38 25% 92%)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginRight: "12px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {icon}
                  </div>

                  <span style={{
                    fontSize: tablet ? "13px" : "14px",
                    fontWeight: 500,
                    color: "rgb(50,45,40)",
                    fontFamily: "'Raleway', sans-serif",
                    letterSpacing: "0.01em",
                  }}>
                    {label}
                  </span>

                  <ChevronRight size={15} style={{ marginLeft: "auto", color: "rgba(0,0,0,0.25)" }} />
                </div>
              ))}
              </div>
            </div>

            {/* Admin Portal at bottom */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 16px",
                borderTop: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ marginBottom: "8px" }}
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="12" cy="19" r="1" />
                <circle cx="5" cy="12" r="1" />
                <path d="M12 6v6" />
                <path d="M12 12v6" />
                <path d="M6 12h6" />
                <path d="M12 12h6" />
              </svg>
              <p style={{
                fontSize: "12px",
                fontWeight: 300,
                letterSpacing: "0.02em",
                color: "#1a1a1a",
                margin: "0",
                fontFamily: "'Raleway', sans-serif",
              }}>
                Admin Portal
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Order Black Box - BOTTOM RIGHT */}
      {activeSection === null && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 50,
            display: activeSection !== null ? "none" : "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Order Pill */}
          <div
            onClick={() => navigateTo("order")}
            style={{
              height: "44px",
              paddingLeft: "16px",
              paddingRight: "16px",
              background: "#1a1a1a",
              borderRadius: "9999px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s ease, transform 0.15s ease",
              gap: "8px",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(0,0,0,0.85)";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#1a1a1a";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <span style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#ffffff",
              fontFamily: "'Raleway', sans-serif",
              letterSpacing: "0.01em",
            }}>
              Order
            </span>
            <ChevronRight size={14} color="#ffffff" strokeWidth={1.6} />
          </div>

          {/* Search Circle */}
          <div
            onClick={() => navigateTo("search")}
            style={{
              width: "44px",
              height: "44px",
              background: "#1a1a1a",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.15s ease, transform 0.15s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(0,0,0,0.85)";
              e.currentTarget.style.transform = "scale(1.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "#1a1a1a";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <SearchIcon size={18} color="#ffffff" strokeWidth={1.6} />
          </div>
        </div>
      )}

      {/* Section pages */}
      {activeSection !== null && (
        <div style={sectionTransitionStyle}>
          {activeSection === "search" && <Search onBack={navigateBack} />}
          {activeSection === "order" && <Order onBack={navigateBack} />}
        </div>
      )}
    </div>
  );
};

export default AdminPortal;