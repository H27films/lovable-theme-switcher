import { useLocation } from "react-router-dom";
import { useTabletMode } from "@/hooks/useTabletMode";
import React, { useState, useEffect } from "react";
import CircularButton from "@/components/CircularButton";
import CornerWaves from "@/components/CornerWaves";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";

export default function Landing() {
  const location = useLocation();
  const { tablet, toggle: toggleTablet } = useTabletMode();
  // When sliding back in from another page, skip the staged cold-open fade.
  const enteredViaSlide = !!(location.state as { enterFrom?: string } | null)?.enterFrom;
  const [visible, setVisible] = useState(enteredViaSlide);

  useEffect(() => {
    if (enteredViaSlide) return;
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, [enteredViaSlide]);

  const { exiting, slideTo } = useSlideExit();
  const enterStyle = useSlideEnter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;1,200;1,300&display=swap');

        .ls-root,
        .ls-root * {
          font-family: 'Raleway', sans-serif !important;
          -webkit-text-size-adjust: 100%;
        }

        @keyframes lsFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ls-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-tap-highlight-color: transparent;
        }
        .ls-icon-btn svg {
          transition: stroke 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .ls-icon-btn:hover svg {
          stroke: hsl(var(--foreground)) !important;
          transform: scale(1.2);
        }
        .ls-icon-btn:focus { outline: none; }

        .ls-enter-btn {
          cursor: pointer;
          transition: letter-spacing 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease, gap 0.35s cubic-bezier(0.16,1,0.3,1);
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        .ls-enter-btn:hover {
          opacity: 0.7;
        }
        .ls-enter-btn:active {
          opacity: 0.5;
        }

        .ls-title-line {
          display: block;
          transition: letter-spacing 0.6s cubic-bezier(0.16,1,0.3,1);
        }

        @media (max-width: 480px) {
          .ls-topbar  { padding: 22px 16px 0 !important; }
          .ls-hero    { padding: 14vh 16px !important; flex-direction: column; align-items: stretch; }
          .ls-hero > div:nth-child(2) { width: 100%; max-height: 40vh; margin-top: 24px; }
          .ls-bottom  { padding: 10px 16px !important; }
        }
      `}</style>

      <div
        className="ls-root"
        style={{
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          minHeight: "100dvh",
          height: "100dvh",
          overflow: "hidden",
          position: "relative", // anchors the CornerWaves decoration to this root
          zIndex: 0, // stacking context so the waves (z-index -1) render behind all content
          display: "flex",
          flexDirection: "column",
          ...enterStyle,
          ...slideExitStyle(exiting),
        }}
      >
        {/* ── Decorative corner waves (top-right, rendered behind page content) ── */}
        <CornerWaves animateIn={!enteredViaSlide} />

        {/* ── Top bar ── */}
        <div
          className="ls-topbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "28px 16px 0",
            flexShrink: 0,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.2s",
          }}
        >
          <span
            style={{
              fontSize: "clamp(13px, 2.5vw, 16px)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "hsl(var(--foreground))",
              fontWeight: 400,
            }}
          >
            Nail Salon
          </span>
        </div>

{/* ── Hero title ── */}
<div
            className="ls-hero"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              padding: "14vh 16px",
              gap: "32px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "clamp(44px, 10vw, 60px)",
                  fontWeight: 205,
                  letterSpacing: "-0.02em",
                  lineHeight: 0.9,
                  margin: 0,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition:
                    "opacity 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s, transform 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s",
                  userSelect: "none",
                }}
              >
                <span
                  className="ls-title-line"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Product
                </span>
                <span
                  className="ls-title-line"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  Database.
                </span>
</h1>
               
                {/* Branch buttons */}
                <div style={{ marginTop: "100px", paddingLeft: "12px", display: "flex", flexDirection: "column", gap: "22px", alignItems: "flex-start" }}>
                   {[
                     { name: "Boudoir", path: "/simple/boudoir" },
                     { name: "Chic Nailspa", path: "/simple/chic" },
                     { name: "Nur Yadi", path: "/simple/nuryadi" },
                   ].map((b, i) => (
                     <div
                       key={b.name}
                       style={{
                         display: "flex",
                         alignItems: "center",
                         gap: "14px",
                         opacity: visible ? 1 : 0,
                         transform: visible ? "translateY(0)" : "translateY(24px)",
                         transition: `opacity 1.4s cubic-bezier(0.16,1,0.3,1) ${0.7 + i * 0.15}s, transform 1.4s cubic-bezier(0.16,1,0.3,1) ${0.7 + i * 0.15}s`,
                       }}
                     >
                       <CircularButton onClick={() => slideTo(b.path, { from: "landing" }, "forward")} />
                       <span
                         onClick={() => slideTo(b.path, { from: "landing" }, "forward")}
                         style={{
                           fontSize: "clamp(15px, 2.6vw, 20px)",
                           fontWeight: 300,
                           letterSpacing: "2px",
                           color: "hsl(var(--foreground))",
                           textTransform: "capitalize",
                           cursor: "pointer",
                         }}
                       >
                         {b.name}
                       </span>
                     </div>
                   ))}
                 </div>
            </div>
            <div style={{ flex: 0, width: "300px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(173, 216, 230, 0.55)" /* translucent lightblue — corner waves behind it show through subtly */ }}>
              <img src="/Landingicon.svg" alt="Landing" style={{ maxHeight: "80vh", width: "auto" }} />
            </div>
          </div>


        {/* ── Bottom bar ── */}
        <div
          className="ls-bottom"
          style={{
            flexShrink: 0,
            borderTop: "1px solid hsl(var(--border))",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.9s ease 1.0s",
          }}
        >
          {/* Admin Portal button */}
          <div
            className="ls-enter-btn"
            onClick={() => slideTo("/simple/admin", undefined, "forward")}
            style={{
              fontSize: "clamp(17px, 2.0vw, 50px)",
              fontWeight: 300,
              letterSpacing: "0.08em",
              textTransform: "capitalize",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "hsl(var(--foreground))",
            }}
          >
            <img
              src="/AdminIcon.svg"
              alt=""
              style={{ width: "40px", height: "40px", objectFit: "contain" }}
            />
            Admin Portal
          </div>

          {/* Phone / Tablet toggle */}
          <button
            className="ls-icon-btn"
            onClick={toggleTablet}
            title={tablet ? "Switch to Phone view" : "Switch to Tablet view"}
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.9s ease 1.2s", gap: "6px" }}
          >
            {tablet ? (
              /* Tablet icon (active) + Tablet label */
              <>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                  <circle cx="12" cy="18" r="0.8" fill="hsl(var(--foreground))" stroke="none" />
                </svg>
                <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--foreground))", fontFamily: "Raleway, inherit" }}>Tablet</span>
              </>
            ) : (
              /* Phone icon (active) + Phone label */
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <circle cx="12" cy="18" r="0.8" fill="hsl(var(--foreground))" stroke="none" />
                </svg>
                <span style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "hsl(var(--foreground))", fontFamily: "Raleway, inherit" }}>Phone</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
