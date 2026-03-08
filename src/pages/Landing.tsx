import { useNavigate } from "react-router-dom";
import { useTheme, type Theme, type Font } from "@/hooks/useTheme";
import { useEffect, useRef, useState } from "react";
import { Settings, Type, Sun, Moon, Palette } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme, font, setFont } = useTheme();
  const [visible, setVisible] = useState(false);
  const [showStockChoice, setShowStockChoice] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [orderConfirmMode, setOrderConfirmMode] = useState(() => localStorage.getItem("orderConfirmation") !== "false");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const settingsRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
      if (fontRef.current && !fontRef.current.contains(e.target as Node)) {
        setShowFontMenu(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Subtle parallax mouse tracking
  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: ((e.clientX - rect.left) / rect.width - 0.5) * 2,
          y: ((e.clientY - rect.top) / rect.height - 0.5) * 2,
        });
      }
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  const Card = ({
    onClick,
    delay,
    icon,
    label,
    title,
    subtitle,
  }: {
    onClick: () => void;
    delay: string;
    icon: React.ReactNode;
    label: string;
    title: string;
    subtitle: string;
  }) => (
    <button
      onClick={onClick}
      className="group w-full"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translateY(0) scale(1)`
          : `translateY(24px) scale(0.97)`,
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: delay,
      }}
    >
      <div
        className="relative overflow-hidden flex items-center justify-between px-10 py-8 rounded-[100px] bg-card border border-border transition-[border-color,transform,box-shadow] duration-300 ease-out group-hover:border-foreground group-hover:scale-[1.03] group-hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.12)] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.06)]"
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-6">
          <div style={{ color: "hsl(var(--foreground))", flexShrink: 0 }}>
            {icon}
          </div>
          <div className="text-left">
            <p
              className="text-[11px] uppercase mb-1 tracking-[0.2em]"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {label}
            </p>
            <p className="text-[26px] font-light tracking-tight leading-none mb-1">
              {title}
            </p>
            <p
              className="text-[13px] font-light"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: arrow */}
        <div
          className="flex-shrink-0 ml-8 transition-all duration-300 ease-out group-hover:translate-x-2"
          style={{ color: "hsl(var(--foreground))" }}
        >
          <svg
            className="w-[44px] group-hover:w-[56px] transition-all duration-300 ease-out"
            height="20"
            viewBox="0 0 52 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
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
      ref={containerRef}
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}
    >
      {/* Animated background grid dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: visible ? 0.4 : 0,
          transition: "opacity 1.5s ease",
          transform: `translate(${mousePos.x * -3}px, ${mousePos.y * -3}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle radial glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          width: "800px",
          height: "800px",
          transform: `translate(-50%, -50%) translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`,
          background: "radial-gradient(circle, hsla(var(--foreground) / 0.02) 0%, transparent 70%)",
          pointerEvents: "none",
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Top bar */}
      <div
        className="relative z-10 flex justify-between items-center px-8 py-6 border-b"
        style={{
          borderColor: "hsl(var(--border))",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(-10px)",
          transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
        }}
      >
        <span
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Branches
        </span>
        <div className="flex items-center gap-4">
          {/* Settings gear */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className="transition-all duration-300 hover:scale-125 hover:animate-[spin_2s_linear_infinite]"
              style={{
                color: showSettings ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              }}
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
                  animation: "settingsIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
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

          {/* Font toggle */}
          <div ref={fontRef} className="relative">
            <button
              onClick={() => { setShowFontMenu(prev => !prev); setShowThemeMenu(false); setShowSettings(false); }}
              className="transition-all duration-200 hover:scale-125"
              style={{ color: showFontMenu ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => { if (!showFontMenu) e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
            >
              <Type size={16} />
            </button>
            {showFontMenu && (
              <div
                className="absolute right-0 top-8 z-50 py-3 px-4"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  minWidth: "140px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  animation: "settingsIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <p className="text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Font
                </p>
                {(["inter", "raleway"] as Font[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { if (font !== f) cycleFont(); setShowFontMenu(false); }}
                    className="block w-full text-left py-2 px-2 text-[12px] tracking-wide rounded transition-colors"
                    style={{
                      color: font === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      background: font === f ? "hsl(var(--accent))" : "transparent",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--accent))"; e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = font === f ? "hsl(var(--accent))" : "transparent"; e.currentTarget.style.color = font === f ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"; }}
                  >
                    {f === "inter" ? "Inter" : "Raleway"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <div ref={themeRef} className="relative">
            <button
              onClick={() => { setShowThemeMenu(prev => !prev); setShowFontMenu(false); setShowSettings(false); }}
              className="transition-all duration-200 hover:scale-125"
              style={{ color: showThemeMenu ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
              onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
              onMouseLeave={e => { if (!showThemeMenu) e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
            >
              {theme === "dark" && <Sun size={16} />}
              {theme === "light" && <Palette size={16} />}
              {theme === "sand" && <Moon size={16} />}
            </button>
            {showThemeMenu && (
              <div
                className="absolute right-0 top-8 z-50 py-3 px-4"
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  minWidth: "140px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  animation: "settingsIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <p className="text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                  Theme
                </p>
                {([
                  { value: "dark" as Theme, label: "Dark", icon: <Moon size={13} /> },
                  { value: "light" as Theme, label: "Light", icon: <Sun size={13} /> },
                  { value: "sand" as Theme, label: "Sand", icon: <Palette size={13} /> },
                ]).map(t => (
                  <button
                    key={t.value}
                    onClick={() => {
                      while (theme !== t.value) toggle();
                      setShowThemeMenu(false);
                    }}
                    className="flex items-center gap-2 w-full text-left py-2 px-2 text-[12px] tracking-wide rounded transition-colors"
                    style={{
                      color: theme === t.value ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      background: theme === t.value ? "hsl(var(--accent))" : "transparent",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "hsl(var(--accent))"; e.currentTarget.style.color = "hsl(var(--foreground))"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = theme === t.value ? "hsl(var(--accent))" : "transparent"; e.currentTarget.style.color = theme === t.value ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"; }}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative z-10">

        {/* Title with staggered animation */}
        <div
          className="text-center mb-14"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <p
            className="text-[11px] tracking-[0.25em] uppercase mb-3"
            style={{
              color: "hsl(var(--muted-foreground))",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.6s ease 0.3s",
            }}
          >
            Product Database
          </p>
          <h1
            className="text-[42px] font-light tracking-tight"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(10px) scale(0.98)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
            }}
          >
            Select a section
          </h1>
          {/* Animated underline */}
          <div
            style={{
              width: visible ? "60px" : "0px",
              height: "1px",
              background: "hsl(var(--foreground))",
              margin: "12px auto 0",
              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
              opacity: 0.3,
            }}
          />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4 w-full max-w-[560px]">
          <Card
            onClick={() => setShowStockChoice(prev => !prev)}
            delay="200ms"
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
          <div
            style={{
              maxHeight: showStockChoice ? "200px" : "0px",
              opacity: showStockChoice ? 1 : 0,
              transform: showStockChoice ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.97)",
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              overflow: "hidden",
            }}
          >
            <div className="flex gap-3 w-full">
              {[
                { name: "Boudoir", route: "/stock", delay: "0ms" },
                { name: "Chic Nailspa", route: "/stockchicnailspa", delay: "60ms" },
                { name: "Nur Yadi", route: "/stocknuryadi", delay: "120ms" },
              ].map((salon, i) => (
                <button
                  key={salon.name}
                  onClick={() => navigate(salon.route)}
                  className="flex-1 py-4 px-6 rounded-full text-center group/sub"
                  style={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: showStockChoice ? `${i * 60}ms` : "0ms",
                    opacity: showStockChoice ? 1 : 0,
                    transform: showStockChoice ? "translateY(0)" : "translateY(-8px)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "hsl(var(--foreground))";
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
                    e.currentTarget.style.boxShadow = "0 8px 25px -8px hsla(0, 0%, 0%, 0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "hsl(var(--border))";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <p className="text-[11px] tracking-[0.15em] uppercase mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Salon</p>
                  <p className="text-[18px] font-light tracking-tight">{salon.name}</p>
                </button>
              ))}
            </div>
          </div>

          <Card
            onClick={() => navigate("/prices")}
            delay="320ms"
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

        {/* Bottom floating label */}
        <div
          style={{
            marginTop: "48px",
            opacity: visible ? 0.3 : 0,
            transition: "opacity 1s ease 0.8s",
          }}
        >
          <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
            ▲ Select to continue
          </p>
        </div>
      </div>

      <style>{`
        @keyframes settingsIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
