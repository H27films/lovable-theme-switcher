import React from "react";
import { motion } from "framer-motion";

interface OrderSubmitFooterProps {
  count: number;
  onSubmit: () => void;
}

export const OrderSubmitFooter = ({ count, onSubmit }: OrderSubmitFooterProps) => (
  <div style={{ flexShrink: 0, paddingLeft: "12px", paddingRight: "12px", paddingTop: "8px", paddingBottom: "max(env(safe-area-inset-bottom, 8px), 8px)", borderTop: "0.5px solid hsl(var(--border, 0 0% 50%))" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {/* Same design as the UsageTable Submit button: animated iridescent pill border + shimmering label. */}
      <motion.button
        onClick={onSubmit}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{ position: "relative", background: "hsl(var(--foreground, 0 0% 100%))", color: "hsl(var(--background, 0 0% 0%))", border: "none", cursor: "pointer", padding: "10px 24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Raleway, inherit", borderRadius: "999px", overflow: "hidden" }}
      >
        {/* Animated iridescent border — static pill-ring mask with a rotating conic gradient behind it.
            The gradient spins in an oversized inner span so the pill outline itself never rotates. */}
        <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: "999px", pointerEvents: "none", padding: "1.5px", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}>
          <motion.span style={{ position: "absolute", inset: "-150%", background: "conic-gradient(from 0deg, transparent 0%, #cfcfcf 25%, #ffffff 50%, #9c9c9c 75%, transparent 100%)" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} />
        </span>
        {/* Shimmering label — cream → white → cream sweep */}
        <motion.span style={{ position: "relative", display: "inline-block", backgroundImage: "linear-gradient(90deg, hsl(var(--background)) 0%, #ffffff 50%, hsl(var(--background)) 100%)", backgroundSize: "200% auto", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }} animate={{ backgroundPosition: ["0% center", "200% center"] }} transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}>
          Submit Order
        </motion.span>
      </motion.button>
      <span style={{ fontSize: "13px", fontWeight: 500, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground, 0 0% 100%))" }}>{count} {count === 1 ? "Product" : "Products"}</span>
    </div>
  </div>
);
