import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { type BranchConfig, type OfficeProduct } from "@/lib/branchSimple";
import { QuickAdd } from "./QuickAdd";

interface BottomNavQuickAddProps {
  config: BranchConfig;
  products: OfficeProduct[];
  setProducts: React.Dispatch<React.SetStateAction<OfficeProduct[]>>;
  refreshBranchLog: () => void | Promise<void>;
  setSelectedProduct: React.Dispatch<React.SetStateAction<OfficeProduct | null>>;
  compact?: boolean;
  /** Lift the button above a fixed bottom bar (mirrors the BottomNav prop). */
  raised?: boolean;
}

interface MorphRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
// Fallback half-widths of the BottomNav pill, used only until the real nav
// element has been measured (it reports its live width via ResizeObserver).
const FALLBACK_NAV_HALF = { normal: 138, compact: 116 };

/**
 * Standalone circular "＋ Add" button sitting flush to the right of the branch
 * BottomNav. Tapping it opens a QuickAdd popup that morphs out of the BottomNav
 * pill itself (Framer Motion spring, measured from the nav's live bounds) so the
 * user never leaves the branch page. While open the button becomes a circular ✕
 * close control. Backdrop tap, Esc, ✕ or the card's close button collapse it.
 */
export const BottomNavQuickAdd = ({
  config,
  products,
  setProducts,
  refreshBranchLog,
  setSelectedProduct,
  compact = false,
  raised = false,
}: BottomNavQuickAddProps) => {
  const [open, setOpen] = useState(false);
  // Measured bounds the popup morphs from (the BottomNav pill) to (the card).
  const [bounds, setBounds] = useState<{ origin: MorphRect; final: MorphRect } | null>(null);
  // Extra rightward px the control circle shifts while the popup is open so it
  // clears the card; returns to 0 (original position) on close.
  const [xShift, setXShift] = useState(0);

  // Sit flush to the right of the BottomNav pill: measure its live width.
  const [navHalf, setNavHalf] = useState(compact ? FALLBACK_NAV_HALF.compact : FALLBACK_NAV_HALF.normal);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-branch-bottom-nav]");
    if (!el) {
      setNavHalf(compact ? FALLBACK_NAV_HALF.compact : FALLBACK_NAV_HALF.normal);
      return;
    }
    const update = () => setNavHalf(el.offsetWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  // Esc collapses the popup back into the close circle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setXShift(0); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const gap = compact ? 8 : 10;
  const side = compact ? 46 : 54;
  const bottomOffset = compact
    ? "env(safe-area-inset-bottom, 0px)"
    : `calc(env(safe-area-inset-bottom, 0px) + ${raised ? 60 : 16}px)`;

  // Glassmorphism tokens copied from BottomNav so the circle reads as part of
  // the same floating bar.
  const glassSurface: React.CSSProperties = {
    background: "linear-gradient(135deg, hsl(var(--background) / 0.42), hsl(var(--background) / 0.2))",
    backdropFilter: "blur(14px) saturate(160%)",
    WebkitBackdropFilter: "blur(14px) saturate(160%)",
    border: "0.5px solid hsl(var(--foreground) / 0.14)",
    boxShadow: "0 8px 32px hsl(0 0% 0% / 0.14), inset 0 1px 0 hsl(0 0% 100% / 0.45), inset 0 -1px 0 hsl(0 0% 0% / 0.04)",
  };

  const openPopup = () => {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const cardW = Math.min(viewW * 0.88, 380);
    const cardH = Math.min(viewH * 0.58, 440);
    const navEl = document.querySelector<HTMLElement>("[data-branch-bottom-nav]");
    let origin: MorphRect;
    let gapBottom: number;
    if (navEl) {
      const r = navEl.getBoundingClientRect();
      origin = { left: r.left, top: r.top, width: r.width, height: r.height };
      gapBottom = Math.max(0, viewH - r.bottom);
    } else {
      origin = { left: viewW - 74, top: viewH - 70, width: 54, height: 54 };
      gapBottom = 16;
    }
    setBounds({
      origin,
      final: {
        left: (viewW - cardW) / 2,
        top: Math.max(64, viewH - gapBottom - cardH),
        width: cardW,
        height: cardH,
      },
    });
    // Shift the control circle right just enough to clear the expanded card.
    const controlLeft = viewW / 2 + navHalf + gap;
    const cardRight = (viewW + cardW) / 2;
    setXShift(Math.max(0, cardRight + 10 - controlLeft));
    setOpen(true);
  };

  const closePopup = () => {
    setOpen(false);
    setXShift(0);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="quickadd-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closePopup}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            // Subtle dim + soft blur so the page stays visible behind the popup.
            background: "hsl(0 0% 0% / 0.15)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            zIndex: 99998, // below the BottomNav (99999) so the bar stays bright
          }}
        />
      )}
      {open && bounds && (
        <motion.div
          key="quickadd-card"
          initial={{
            left: bounds.origin.left,
            top: bounds.origin.top,
            width: bounds.origin.width,
            height: bounds.origin.height,
            borderRadius: 999,
            opacity: 0,
          }}
          animate={{
            left: bounds.final.left,
            top: bounds.final.top,
            width: bounds.final.width,
            height: bounds.final.height,
            borderRadius: 24,
            opacity: 1,
          }}
          exit={{
            left: bounds.origin.left,
            top: bounds.origin.top,
            width: bounds.origin.width,
            height: bounds.origin.height,
            borderRadius: 999,
            // Fade the content out quickly while the box springs back to the nav.
            opacity: 0,
          }}
          transition={{
            default: { type: "spring", stiffness: 350, damping: 28 },
            opacity: { duration: 0.12, ease: "easeIn" },
          }}
          style={{
            position: "fixed",
            zIndex: 100000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "12px 16px",
            paddingBottom: "14px",
            background: "linear-gradient(135deg, hsl(var(--background) / 0.85), hsl(var(--background) / 0.75))",
            backdropFilter: "blur(16px) saturate(170%)",
            WebkitBackdropFilter: "blur(16px) saturate(170%)",
            border: "0.5px solid hsl(var(--foreground) / 0.14)",
            boxShadow: "0 18px 50px hsl(0 0% 0% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.45)",
            translate: "var(--page-slide-x, 0vw) 0",
          }}
        >
          <QuickAdd
            config={config}
            products={products}
            setProducts={setProducts}
            refreshBranchLog={refreshBranchLog}
            setSelectedProduct={setSelectedProduct}
            onClose={closePopup}
          />
        </motion.div>
      )}
      {/* Persistent control: "+ Add" FAB ↔ ✕ close circle. Slides right while the
          popup is open so it clears the card, then springs home on close. */}
      <motion.button
        key="quickadd-control"
        onClick={() => (open ? closePopup() : openPopup())}
        aria-label={open ? "Close quick add" : "Quick add"}
        animate={{ x: open ? xShift : 0 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.9 }}
        style={{
          ...glassSurface,
          position: "fixed",
          // Circle's LEFT edge sits `gap` px clear of the nav pill's right edge
          // (no centering margin — centering it caused the pill overlap).
          left: `calc(50% + ${navHalf + gap}px)`,
          bottom: bottomOffset,
          zIndex: open ? 100001 : 99999,
          width: side,
          height: side,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "hsl(var(--foreground))",
          cursor: "pointer",
          padding: 0,
          // Follow the page slide transition, like the BottomNav does.
          translate: "var(--page-slide-x, 0vw) 0",
          opacity: "var(--page-slide-o, 1)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="quickadd-x"
              initial={{ opacity: 0, scale: 0.6, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 90 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <X size={compact ? 17 : 20} strokeWidth={1.5} />
            </motion.span>
          ) : (
            <motion.span
              key="quickadd-plus"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px" }}
            >
              <Plus size={compact ? 17 : 20} strokeWidth={1.5} />
              <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.03em", fontFamily: "Raleway, inherit", lineHeight: 1 }}>Add</span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </AnimatePresence>,
    document.body
  );
};