import { useTabletMode } from "@/hooks/useTabletMode";
import { TABLET_FIT_HEIGHT } from "@/components/TabletScaler";
import FadeInImage from "@/components/FadeInImage";
import {
  Building2,
  User,
  ChevronRight,
  Search as SearchIcon,
} from "lucide-react";
import { useSlideExit, useSlideEnter, slideExitStyle } from "@/hooks/useSlideTransition";

const AdminPortal = () => {
  const { tablet } = useTabletMode();
  const { exiting, slideTo } = useSlideExit();
  const enterStyle = useSlideEnter();

  const branches = [
    { label: "Office",   key: "office"  as const, icon: <Building2 size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Boudoir",  key: "boudoir" as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Chic",     key: "chic"    as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
    { label: "Nur Yadi", key: "nuryadi" as const, icon: <User      size={16} color="rgb(80,70,60)" strokeWidth={1.5} /> },
  ];

  const handleBranch = (key: "office" | "boudoir" | "chic" | "nuryadi") => {
    if (key === "office") {
      slideTo("/simple/office", { from: "adminportal" }, "forward");
    } else {
      slideTo(`/simple/${key}`, { from: "adminportal" }, "forward");
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
        ...enterStyle,
        ...slideExitStyle(exiting),
      }}
    >
      {/* Background SVG */}
       <div
         style={{
            position: "absolute",
            right: "calc(-220px + 20vw)",
            top: "50%",
            transform: "translateY(calc(-50% + 40px))",
            width: "max(600px, min(900px, 70vw))",
            height: "max(600px, min(900px, 70vw))",
            zIndex: 1,
            opacity: 0.05,
            pointerEvents: "none",
         }}
       >
        <FadeInImage
          src="/Hand.svg"
          alt=""
          aria-hidden="true"
          duration={0.9}
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
        onClick={(e) => {
          e.preventDefault();
          slideTo("/", undefined, "back");
        }}
        style={{
          position: "fixed",
          right: "20px",
          top: "calc(env(safe-area-inset-top, 0px) + 32px)",
          zIndex: 60,
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(0,0,0,0.75)",
          textDecoration: "none",
          transition: "opacity 0.15s ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.55")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        <svg
          width="36"
          height="16"
          viewBox="0 0 36 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="30" y1="8" x2="1" y2="8" />
          <polyline points="9,1 1,8 9,15" />
        </svg>
      </a>

      {/* Main menu */}
      <div
          style={{
            minHeight: tablet ? TABLET_FIT_HEIGHT : "100dvh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            padding: "0 10px 10px",
          }}
        >
          {/* Main container box - LEFT HALF - FULL HEIGHT */}
          <div
            style={{
              width: "58%",
              height: tablet ? `calc(${TABLET_FIT_HEIGHT} - 32px)` : "calc(100dvh - 32px)",
              background: "rgba(255, 255, 255, 0.10)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderRadius: "32px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 30px rgba(0,0,0,0.10)",
              overflow: "hidden",
              zIndex: 10,
              position: "relative",
              marginLeft: "4px",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Branches section */}
            <div
              style={{
                flex: 1,
                padding: tablet ? "12px" : "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              {/* ── BRANCHES ── */}
              <p
                onClick={() => slideTo("/", undefined, "back")}
                style={{
                  fontSize: tablet ? "20px" : "24px",
                  fontWeight: 350,
                  letterSpacing: "0.01em",
                  color: "#000000",
                  margin: "0 0 12px 4px",
                  fontFamily: "'Raleway', sans-serif",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.55")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
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
                    height: tablet ? "38px" : "46px",
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
                      width: tablet ? "28px" : "32px",
                      height: tablet ? "28px" : "32px",
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
                    fontSize: tablet ? "12px" : "14px",
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
              <img
                src="/AdminIcon.svg"
                alt="Admin Portal"
                style={{ width: "50px", height: "50px", marginBottom: "8px" }}
              />
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

      {/* Search & Order Black Box - BOTTOM RIGHT */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 50,
          display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "2px",
          }}
        >
          {/* Order Pill */}
          <div
            onClick={() => slideTo("/simple/order", { from: "adminportal" }, "forward")}
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
            onClick={() => slideTo("/simple/search", { from: "adminportal" }, "forward")}
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

    </div>
  );
};

export default AdminPortal;