import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
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

// Card width — also used for the negative margin that centers it (margins
// instead of translateX so Framer's layout projection stays clean during the
// layoutId morph).
const CARD_WIDTH = "min(88vw, 380px)";
// Fallback half-widths of the BottomNav pill, used only until the real nav
// element has been measured (it reports its live width via ResizeObserver).
const FALLBACK_NAV_HALF = { normal: 138, compact: 116 };

/**
 * Standalone circular "＋ Add" button sitting flush to the right of the branch
 * BottomNav. Tapping it morphs the surface (Framer Motion layoutId, spring
 * physics) into the floating QuickAdd popup card anchored over the bottom nav
 * area — the user never leaves the branch page. Backdrop tap, Esc or the card's
 * close button collapse it back into the circle.
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

  // Esc collapses the popup back into the circle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="quickadd-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "hsl(0 0% 0% / 0.4)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 99998, // below the BottomNav (99999) so the bar stays bright
          }}
        />
      )}
      {open ? (
        <motion.div
          key="quickadd-card"
          layoutId="quickadd-surface"
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          style={{
            position: "fixed",
            left: "50%",
            marginLeft: `calc(${CARD_WIDTH} / -2)`,
            bottom: bottomOffset,
            zIndex: 100000,
            width: CARD_WIDTH,
            maxHeight: "min(58dvh, 440px)",
            borderRadius: 24,
            padding: "12px 16px",
            paddingBottom: compact ? "calc(env(safe-area-inset-bottom, 0px) + 14px)" : "14px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            // Expanded glassmorphism (per spec): stronger fill + heavier blur.
            background: "linear-gradient(135deg, hsl(var(--background) / 0.88), hsl(var(--background) / 0.78))",
            backdropFilter: "blur(24px) saturate(170%)",
            WebkitBackdropFilter: "blur(24px) saturate(170%)",
            border: "0.5px solid hsl(var(--foreground) / 0.14)",
            boxShadow: "0 18px 50px hsl(0 0% 0% / 0.22), inset 0 1px 0 hsl(0 0% 100% / 0.45)",
            // Follow the page slide transition, like the BottomNav does.
            translate: "var(--page-slide-x, 0vw) 0",
          }}
        >
          <QuickAdd
            config={config}
            products={products}
            setProducts={setProducts}
            refreshBranchLog={refreshBranchLog}
            setSelectedProduct={setSelectedProduct}
            onClose={() => setOpen(false)}
          />
        </motion.div>
      ) : (
        <motion.button
          key="quickadd-fab"
          layoutId="quickadd-surface"
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          onClick={() => setOpen(true)}
          aria-label="Quick add"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          style={{
            ...glassSurface,
            position: "fixed",
            left: `calc(50% + ${navHalf + gap}px)`,
            marginLeft: -(side / 2),
            bottom: bottomOffset,
            zIndex: 99999,
            width: side,
            height: side,
            borderRadius: 999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            color: "hsl(var(--foreground))",
            cursor: "pointer",
            padding: 0,
            // Follow the page slide transition, like the BottomNav does.
            translate: "var(--page-slide-x, 0vw) 0",
            opacity: "var(--page-slide-o, 1)",
          }}
        >
          <Plus size={compact ? 17 : 20} strokeWidth={1.5} />
          <span style={{ fontSize: "9px", fontWeight: 400, letterSpacing: "0.03em", fontFamily: "Raleway, inherit", lineHeight: 1 }}>Add</span>
        </motion.button>
      )}
    </AnimatePresence>,
    document.body
  );
};