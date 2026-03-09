import { useNavigate } from "react-router-dom";
import { useTheme, type Theme, type Font } from "@/hooks/useTheme";
import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, Palette } from "lucide-react";

// Brush-stroke underline SVG (hand-drawn style)
const _brushSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1418 125"><path d="M1412.29 72.17c-11.04-5.78-20.07-14.33-85.46-25.24-22.37-3.63-44.69-7.56-67.07-11.04-167.11-22.06-181.65-21.24-304.94-30.56C888.78 1.39 822.57 1.1 756.44 0c-46.63-.11-93.27 1.56-139.89 2.5C365.5 13.55 452.86 7.68 277.94 23.15 202.57 33.32 127.38 45.01 52.07 55.69c-11.23 2.41-22.63 4.17-33.71 7.22C6.1 66.33 5.64 66.19 3.89 67.79c-7.99 5.78-2.98 20.14 8.72 17.5 33.99-9.47 32.28-8.57 178.06-29.66 4.26 4.48 7.29 3.38 18.42 3.11 13.19-.32 26.38-.53 39.56-1.12 53.51-3.81 106.88-9.62 160.36-13.95 18.41-1.3 36.8-3.12 55.21-4.7 23.21-1.16 46.43-2.29 69.65-3.4 120.28-2.16 85.46-3.13 234.65-1.52 23.42.99 1.57-.18 125.72 6.9 96.61 8.88 200.92 27.94 295.42 46.12 40.87 7.91 116.67 23.2 156.31 36.78 3.81 1.05 8.28-.27 10.51-3.58 3.17-3.72 2.66-9.7-.78-13.13-3.25-3.12-8.14-3.44-12.18-5.08-17.89-5.85-44.19-12.09-63.67-16.56l26.16 3.28c23.02 3.13 46.28 3.92 69.34 6.75 10.8.96 25.43 1.81 34.34-4.39 2.26-1.54 4.86-2.75 6.21-5.27 2.76-4.59 1.13-11.06-3.59-13.68ZM925.4 23.77c37.64 1.4 153.99 10.85 196.64 14.94 45.95 5.51 91.89 11.03 137.76 17.19 24.25 4.77 74.13 11.21 101.72 18.14-11.87-1.15-23.77-1.97-35.65-3.06-133.46-15.9-266.8-33.02-400.47-47.21Z" fill="#aaaaaa"></path></svg>`;
const BRUSH_URL = `url("data:image/svg+xml,${encodeURIComponent(_brushSvg)}")`;

const BRANCHES = [
  { name: "Boudoir", route: "/stock" },
  { name: "Chic Nailspa", route: "/stockchicnailspa" },
  { name: "Nur Yadi", route: "/stocknuryadi" },
];

export default function Landing2() {
  const navigate = useNavigate();
  const { theme, setTheme, font, setFont } = useTheme();
  const [iconsOpen, setIconsOpen] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [orderConfirmMode, setOrderConfirmMode] = useState(
    () => localStorage.getItem("orderConfirmation") !== "false"
  );

  // Derived blur states
  const titleBlurred = branchesOpen || iconsOpen;
  const imgBlurred = branchesOpen || iconsOpen;
  const officeBlurred = branchesOpen;
  const iconWrapBlurred = branchesOpen;
  const navBlurred = iconsOpen;

  const handlePageClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      !target.closest(".l2-branches-nav") &&
      !target.closest(".l2-branch-overlay")
    ) {
      setBranchesOpen(false);
    }
    if (!target.closest(".l2-icon-wrap")) {
      setIconsOpen(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes l2FadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes l2FadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .l2-title {
          animation: l2FadeUp 1.4s cubic-bezier(0.16,1,0.3,1) 0.5s both;
          transition: filter 0.4s ease, opacity 0.4s ease;
        }
        .l2-img-wrap {
          animation: l2FadeIn 1.6s ease 1.2s both;
          transition: filter 0.4s ease, opacity 0.4s ease;
        }
        .l2-nav {
          animation: l2FadeIn 1s ease 1.1s both;
          transition: filter 0.4s ease, opacity 0.4s ease;
        }
        .l2-topbar {
          animation: l2FadeIn 1s ease 0.2s both;
        }
        .l2-icon-wrap {
          transition: filter 0.4s ease, opacity 0.4s ease;
        }
        /* Branch items stagger — Nur Yadi first, Boudoir last */
        .l2-b-item {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1);
          cursor: pointer;
          display: block;
          margin-bottom: 6px;
        }
        .l2-branches-open .l2-b-item:nth-child(1) { opacity: 1; transform: translateY(0); transition-delay: 0.21s; }
        .l2-branches-open .l2-b-item:nth-child(2) { opacity: 1; transform: translateY(0); transition-delay: 0.13s; }
        .l2-branches-open .l2-b-item:nth-child(3) { opacity: 1; transform: translateY(0); transition-delay: 0.05s; }
        .l2-b-text {
          display: block;
          font-size: clamp(22px, 3.2vw, 42px);
          font-weight: 200;
          letter-spacing: 0.02em;
          text-transform: capitalize;
          color: #bbb;
          transition: color 0.22s ease, letter-spacing 0.22s ease;
          padding-bottom: 7px;
          padding-left: 18px;
        }
        .l2-b-item:hover .l2-b-text {
          color: #fff;
          letter-spacing: 0.12em;
        }
        /* Nav items */
        .l2-nav-item {
          font-size: clamp(18px, 2.8vw, 30px);
          font-weight: 200;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #fff;
          cursor: pointer;
          padding: 6px 0;
          position: relative;
          transition: color 0.25s, filter 0.4s ease, opacity 0.4s ease;
        }
        /* Brush-stroke underline — hover only */
        .l2-hand-underline {
          position: absolute;
          bottom: -6px;
          left: 0;
          width: 100%;
          height: 14px;
          background-size: 100% 100%;
          background-repeat: no-repeat;
          opacity: 0;
          transform: scaleX(0.6);
          transform-origin: left;
          transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1);
          pointer-events: none;
        }
        .l2-nav-item:hover .l2-hand-underline {
          opacity: 1;
          transform: scaleX(1);
        }
        /* Icon trigger */
        .l2-icon-trigger {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .l2-icon-trigger:hover svg { transform: scale(1.18); }
        .l2-icon-trigger:hover svg line { stroke: #fff !important; }
        /* Sub icon buttons */
        .l2-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .l2-icon-btn svg {
          transition: stroke 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .l2-icon-btn:hover svg {
          stroke: #fff !important;
          transform: scale(1.35);
        }
      `}</style>

      <div
        onClick={handlePageClick}
        style={{
          background: "#0e0e0e",
          color: "#fff",
          minHeight: "100vh",
          height: "100vh",
          overflow: "hidden",
          position: "relative",
          fontFamily: `-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif`,
        }}
      >
        {/* ── Topbar: icon wrap top-left ── */}
        <div
          className="l2-topbar"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "flex-start",
            padding: "24px 44px 0",
            zIndex: 20,
          }}
        >
          <div
            className="l2-icon-wrap"
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              filter: iconWrapBlurred ? "blur(3px)" : "none",
              opacity: iconWrapBlurred ? 0.7 : undefined,
              pointerEvents: iconWrapBlurred ? "none" : "auto",
            }}
          >
            {/* ≡ trigger */}
            <button
              className="l2-icon-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setIconsOpen((prev) => !prev);
                setBranchesOpen(false);
              }}
            >
              <svg
                width="20"
                height="14"
                viewBox="0 0 20 14"
                fill="none"
                style={{ transition: "transform 0.2s ease" }}
              >
                <line
                  x1="0" y1="3" x2="20" y2="3"
                  stroke={iconsOpen ? "#bbb" : "#888"}
                  strokeWidth="1.4"
                  style={{ transition: "stroke 0.2s" }}
                />
                <line
                  x1="0" y1="11" x2="20" y2="11"
                  stroke={iconsOpen ? "#bbb" : "#888"}
                  strokeWidth="1.4"
                  style={{ transition: "stroke 0.2s" }}
                />
              </svg>
            </button>

            {/* 3 floating sub-icons */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "18px",
                overflow: "hidden",
                maxHeight: iconsOpen ? "120px" : "0px",
                opacity: iconsOpen ? 1 : 0,
                marginTop: iconsOpen ? "16px" : "0px",
                transition:
                  "max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease, margin-top 0.3s ease",
              }}
            >
              {/* Gear — Order Confirmation */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="l2-icon-btn"
                    style={{
                      opacity: iconsOpen ? 1 : 0,
                      transform: iconsOpen ? "translateY(0)" : "translateY(-6px)",
                      transition: `opacity 0.3s ease ${iconsOpen ? "0.05s" : "0s"}, transform 0.3s ease ${iconsOpen ? "0.05s" : "0s"}`,
                    }}
                  >
                    <svg
                      width="15" height="15" viewBox="0 0 24 24"
                      fill="none" stroke="#777" strokeWidth="1.4"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px] text-xs">
                  <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">
                    Settings
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div
                    className="cursor-pointer rounded-sm hover:bg-accent flex items-center justify-between px-2 py-[6px]"
                    onClick={() => {
                      const next = !orderConfirmMode;
                      setOrderConfirmMode(next);
                      localStorage.setItem("orderConfirmation", String(next));
                    }}
                  >
                    <span className="text-xs">Order Confirmation</span>
                    <div
                      style={{
                        width: "28px",
                        height: "16px",
                        borderRadius: "8px",
                        background: orderConfirmMode
                          ? "hsl(var(--foreground))"
                          : "hsl(var(--muted-foreground))",
                        position: "relative",
                        transition: "background 0.2s",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: "hsl(var(--background))",
                          position: "absolute",
                          top: "2px",
                          left: orderConfirmMode ? "14px" : "2px",
                          transition: "left 0.2s",
                        }}
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Aa — Font */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="l2-icon-btn"
                    style={{
                      opacity: iconsOpen ? 1 : 0,
                      transform: iconsOpen ? "translateY(0)" : "translateY(-6px)",
                      transition: `opacity 0.3s ease ${iconsOpen ? "0.10s" : "0s"}, transform 0.3s ease ${iconsOpen ? "0.10s" : "0s"}`,
                    }}
                  >
                    <svg
                      width="15" height="15" viewBox="0 0 24 24"
                      fill="none" stroke="#777" strokeWidth="1.4"
                    >
                      <path d="M3 19l5-12 5 12M5.5 14h5M14 19l3.5-7 3.5 7M15.5 16h4" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[110px] text-xs">
                  <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">
                    Font
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={font}
                    onValueChange={(v) => setFont(v as Font)}
                  >
                    <DropdownMenuRadioItem value="inter" className="text-xs">
                      Inter
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="raleway" className="text-xs">
                      Raleway
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sun — Theme */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="l2-icon-btn"
                    style={{
                      opacity: iconsOpen ? 1 : 0,
                      transform: iconsOpen ? "translateY(0)" : "translateY(-6px)",
                      transition: `opacity 0.3s ease ${iconsOpen ? "0.15s" : "0s"}, transform 0.3s ease ${iconsOpen ? "0.15s" : "0s"}`,
                    }}
                  >
                    <svg
                      width="15" height="15" viewBox="0 0 24 24"
                      fill="none" stroke="#777" strokeWidth="1.4"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[110px] text-xs">
                  <DropdownMenuLabel className="text-[10px] tracking-widest uppercase">
                    Theme
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={(v) => setTheme(v as Theme)}
                  >
                    <DropdownMenuRadioItem value="dark" className="text-xs">
                      <span className="flex items-center gap-2">
                        <Moon size={11} />Dark
                      </span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light" className="text-xs">
                      <span className="flex items-center gap-2">
                        <Sun size={11} />Light
                      </span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="sand" className="text-xs">
                      <span className="flex items-center gap-2">
                        <Palette size={11} />Sand
                      </span>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ── Hero title — vertically centred ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 44px",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <h1
            className="l2-title"
            style={{
              fontSize: "clamp(52px, 9vw, 112px)",
              fontWeight: 200,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: "#fff",
              filter: titleBlurred ? "blur(8px)" : "none",
              opacity: titleBlurred ? 0.07 : undefined,
            }}
          >
            Product
            <br />
            <span style={{ color: "#666" }}>Database.</span>
          </h1>
        </div>

        {/* ── Editorial image — right side ── */}
        <div
          className="l2-img-wrap"
          style={{
            position: "absolute",
            right: "120px",
            top: "calc(50% - 95px)",
            width: "clamp(160px, 18vw, 260px)",
            opacity: imgBlurred ? 0.15 : 0.55,
            mixBlendMode: "luminosity" as React.CSSProperties["mixBlendMode"],
            pointerEvents: "none",
            filter: imgBlurred
              ? "grayscale(100%) blur(6px)"
              : "grayscale(100%)",
            zIndex: 1,
          }}
        >
          <img
            src="/nails.jpg"
            alt=""
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        {/* ── Branch name overlay ── */}
        <div
          className={`l2-branch-overlay${branchesOpen ? " l2-branches-open" : ""}`}
          style={{
            position: "absolute",
            top: "58%",
            left: "44px",
            pointerEvents: branchesOpen ? "auto" : "none",
            opacity: branchesOpen ? 1 : 0,
            transition: "opacity 0.35s ease",
            textAlign: "left",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {BRANCHES.map((b) => (
            <div
              key={b.name}
              className="l2-b-item"
              onClick={(e) => {
                e.stopPropagation();
                navigate(b.route);
              }}
            >
              <span className="l2-b-text">{b.name}</span>
            </div>
          ))}
        </div>

        {/* ── Bottom nav ── */}
        <div
          className="l2-nav"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            padding: "0 44px 44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            filter: navBlurred ? "blur(6px)" : "none",
            opacity: navBlurred ? 0.07 : undefined,
            pointerEvents: navBlurred ? "none" : "auto",
            zIndex: 5,
          }}
        >
          {/* BRANCHES */}
          <div
            className="l2-nav-item l2-branches-nav"
            onClick={(e) => {
              e.stopPropagation();
              setBranchesOpen((prev) => !prev);
              setIconsOpen(false);
            }}
          >
            Branches
            <span
              className="l2-hand-underline"
              style={{ backgroundImage: BRUSH_URL }}
            />
          </div>

          {/* OFFICE */}
          <div
            className="l2-nav-item"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/prices");
            }}
            style={{
              filter: officeBlurred ? "blur(3px)" : "none",
              opacity: officeBlurred ? 0.7 : undefined,
              pointerEvents: officeBlurred ? "none" : "auto",
            }}
          >
            Office
            <span
              className="l2-hand-underline"
              style={{ backgroundImage: BRUSH_URL }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
