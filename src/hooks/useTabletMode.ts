import { useState, useEffect } from "react";

const KEY = "simpleTabletMode";

export function useTabletMode() {
  const [tablet, setTablet] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === "true"; } catch { return false; }
  });

  const toggle = () => {
    setTablet(prev => {
      const next = !prev;
      try { localStorage.setItem(KEY, String(next)); } catch {}
      // broadcast so other simple pages pick it up if open
      window.dispatchEvent(new CustomEvent("tabletModeChange", { detail: next }));
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: Event) => setTablet((e as CustomEvent).detail);
    window.addEventListener("tabletModeChange", handler);
    return () => window.removeEventListener("tabletModeChange", handler);
  }, []);

  return { tablet, toggle };
}
