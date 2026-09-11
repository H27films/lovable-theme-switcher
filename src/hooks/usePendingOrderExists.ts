import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Whether this branch currently has a submitted-but-unconfirmed order in the
 * OrderSummary (rows in the shared OrderSubmit table). The branch pages use it
 * to light up the Order icon in the BottomNav so staff can see an order is
 * waiting before opening the Order panel.
 *
 * Fetches once on mount (so the indicator is correct right after a reload),
 * then stays in sync via the `setHasPendingOrder` setter — OrderPanel calls it
 * through its `onPendingOrderChange` prop whenever the pending order is
 * submitted, edited, confirmed or reset.
 */
export const usePendingOrderExists = (branchLogName: string) => {
  const [hasPendingOrder, setHasPendingOrder] = useState(false);

  // Initial check — does this branch have any pending order lines?
  useEffect(() => {
    if (!branchLogName) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("OrderSubmit")
        .select("id")
        .eq("BRANCH", branchLogName)
        .limit(1);
      if (!cancelled) setHasPendingOrder(!!data && data.length > 0);
    })();
    return () => { cancelled = true; };
  }, [branchLogName]);

  return { hasPendingOrder, setHasPendingOrder };
};
