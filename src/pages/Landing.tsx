import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, toggle, font, cycleFont } = useTheme();
  const [visible, setVisible] = useState(false);
  const [hoverStock, setHoverStock] = useState(false);
  const [showStockChoice, setShowStockChoice] = useState(false);
  const [hoverPrices, setHoverPrices] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [orderConfirmMode, setOrderConfirmMode] = useState(() => localStorage.getItem("orderConfirmation") !== "false");
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const Card = ({
    onClick,
    delay,
    hover,
    onEnter,
    onLeave,
    icon,
    label,
    title,
    subtitle,
  }: {
    onClick: () => void;
    delay: string;
    hover: boolean;
    onEnter: () => void;
    onLeave: () => void;
    icon: React.ReactNode;
    label: string;
    title: string;
    subtitle: string;
  }) => (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="group w-full transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transitionDelay: delay,
      }}
    >
      <div
        className="flex items-center justify-between px-10 py-8 transition-all duration-300"
        style={{
          borderRadius: "100px",
          background: hover ? "hsl(var(--card))" : "hsl(var(--card))",
          border: `1px solid ${hover ? "hsl(var(--foreground))" : "hsl(var(--border))"}`,
        }}
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-6">
          <div style={{ color: "hsl(var(--foreground))", flexShrink: 0 }}>{icon}</div>
          <div className="text-left">
            <p className="text-[11px] tracking-[0.2em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
            <p className="text-[26px] font-light tracking-tight leading-none mb-1">{title}</p>
            <p className="text-[13px] font-light" style={{ color: "hsl(var(--muted-foreground))" }}>{subtitle}</p>
          </div>
        </div>

        {/* Right: animated arrow */}
        <div
          className="flex-shrink-0 ml-8 transition-all duration-300"
          style={{
            transform: hover ? "translateX(8px)" : "translateX(0)",
            color: "hsl(var(--foreground))",
          }}
        >
          <svg
            width={hover ? "52" : "44"}
            height="20"
            viewBox="0 0 52 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transition: "width 0.3s ease" }}
          >
            <line x1="0" y1="10" x2="44" y2="10" />
            <path d="M34 2l10 8-10 8" />
          </svg>
        </div>
      </div>
    </button>
  );

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      {/* Top bar */}
      <div
        className="flex justify-between items-center px-8 py-6 border-b"
        style={{ borderColor: "hsl(var(--border))" }}
      >
        <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "hsl(var(--foreground))" }}>
          Branches
        </span>
        <div className="flex items-center gap-4">
          {/* Settings gear */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className="transition-colors"
              style={{ color: showSettings ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => { if (!showSettings) e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
            >
              <Settings size={16} />
            </button>

            {/* Settings dropdown */}
            {showSettings && (
              <div
                className="absolute right-0 top-8 z-50 py-4 px-5"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  minWidth: "200px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                <p className="text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Settings
                </p>
                {/* Order Confirmation toggle */}
                <div className="flex items-center justify-between gap-6">
                  <span className="text-[12px] tracking-wide" style={{ color: orderConfirmMode ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                    Order Confirmation
                  </span>
                  <button
                    onClick={() => {
                      const newVal = !orderConfirmMode;
                      setOrderConfirmMode(newVal);
                      localStorage.setItem("orderConfirmation", String(newVal));
                    }}
                    style={{
                      width: "36px",
                      height: "20px",
                      borderRadius: "10px",
                      background: orderConfirmMode ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: "hsl(var(--background))",
                      position: "absolute",
                      top: "3px",
                      left: orderConfirmMode ? "19px" : "3px",
                      transition: "left 0.2s",
                    }} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <ThemeToggle theme={theme} toggle={toggle} font={font} cycleFont={cycleFont} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">

        {/* Title */}
        <div
          className="text-center mb-14 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)" }}
        >
          <p className="text-[11px] tracking-[0.25em] uppercase mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
            Product Database
          </p>
          <h1 className="text-[42px] font-light tracking-tight">Select a section</h1>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4 w-full max-w-[560px]">
          <Card
            onClick={() => setShowStockChoice(prev => !prev)}
            delay="120ms"
            hover={hoverStock}
            onEnter={() => setHoverStock(true)}
            onLeave={() => setHoverStock(false)}
            icon={
              <svg width="40" height="40" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="14" width="28" height="18" rx="0.5" />
                <path d="M4 14 L18 4 L32 14" />
                <rect x="13" y="22" width="10" height="10" />
                <line x1="18" y1="22" x2="18" y2="32" />
              </svg>
            }
            label="Inventory"
            title="Branch Stock"
            subtitle="Track usage, orders & balances"
          />

          {/* Stock sub-choices */}
          {showStockChoice && (
            <div
              className="flex gap-3 w-full transition-all duration-300"
              style={{
                opacity: showStockChoice ? 1 : 0,
                transform: showStockChoice ? "translateY(0)" : "translateY(-8px)",
              }}
            >
              <button
                onClick={() => navigate("/stock")}
                className="flex-1 py-4 px-6 rounded-full text-center transition-all duration-200"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
              >
                <p className="text-[11px] tracking-[0.15em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Salon</p>
                <p className="text-[18px] font-light tracking-tight">Boudoir</p>
              </button>
              <button
                onClick={() => navigate("/stockchicnailspa")}
                className="flex-1 py-4 px-6 rounded-full text-center transition-all duration-200"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
              >
                <p className="text-[11px] tracking-[0.15em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Salon</p>
                <p className="text-[18px] font-light tracking-tight">Chic Nailspa</p>
              </button>
              <button
                onClick={() => navigate("/stocknuryadi")}
                className="flex-1 py-4 px-6 rounded-full text-center transition-all duration-200"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(var(--foreground))")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
              >
                <p className="text-[11px] tracking-[0.15em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Salon</p>
                <p className="text-[18px] font-light tracking-tight">Nur Yadi</p>
              </button>
            </div>
          )}

          <Card
            onClick={() => navigate("/prices")}
            delay="220ms"
            hover={hoverPrices}
            onEnter={() => setHoverPrices(true)}
            onLeave={() => setHoverPrices(false)}
            icon={
              <svg width="40" height="40" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 4H28V12L14 26a2 2 0 01-2.83 0L5.83 20.83a2 2 0 010-2.83L20 4z" />
                <circle cx="24" cy="10" r="1.5" fill="currentColor" stroke="none" />
                <line x1="10" y1="26" x2="16" y2="32" strokeOpacity="0.4" />
              </svg>
            }
            label="Prices & Suppliers"
            title="Office Database"
            subtitle="Manage product pricing & suppliers"
          />
        </div>
      </div>
    </div>
  );
}
