import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type LogRow } from "@/lib/branchSimple";
import { LOG_PAGE_SIZE, LOG_MAX_ROWS } from "@/lib/branchSimpleUtils";

interface OrdersViewProps {
  branchLogName: string;
  scrollWithPage: boolean;
}

// Actions-style spring for the expand/collapse — same recipe as LogRowItem's.
const ACTIONS_TRANSITION: Transition = { type: "spring", stiffness: 280, damping: 26 };

const fmtOrderDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export const OrdersView = ({ branchLogName, scrollWithPage }: OrdersViewProps) => {
  const [ordersData, setOrdersData] = useState<LogRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersMoreLoading, setOrdersMoreLoading] = useState(false);
  const [ordersHasMore, setOrdersHasMore] = useState(true);
  const [expandedOrderGRNs, setExpandedOrderGRNs] = useState<Set<string>>(new Set());
  const ordersMoreBusy = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Keep a stable ref to the latest loadMore so the IntersectionObserver
  // callback always calls the current closure without re-arming.
  const loadMoreRef = useRef<() => void>(() => {});

  const fetchPage = useCallback(async (start: number): Promise<LogRow[]> => {
    const { data } = await (supabase as any)
      .from("AllFileLog")
      .select("*")
      .eq("TYPE", "Order")
      .eq("BRANCH", branchLogName)
      .order("DATE", { ascending: false })
      .range(start, start + LOG_PAGE_SIZE - 1);
    return (data || []) as LogRow[];
  }, [branchLogName]);

  // Initial load — resets when branchLogName changes
  useEffect(() => {
    if (!branchLogName) return;
    let cancelled = false;
    setOrdersLoading(true);
    setOrdersMoreLoading(false);
    setOrdersHasMore(true);
    setOrdersData([]);
    fetchPage(0).then((batch) => {
      if (cancelled) return;
      setOrdersData(batch);
      setOrdersHasMore(batch.length === LOG_PAGE_SIZE);
      setOrdersLoading(false);
    });
    return () => { cancelled = true; };
  }, [branchLogName, fetchPage]);

  const loadMore = useCallback(async () => {
    if (ordersMoreBusy.current || !ordersHasMore || ordersLoading) return;
    ordersMoreBusy.current = true;
    setOrdersMoreLoading(true);
    const start = ordersData.length;
    if (start >= LOG_MAX_ROWS) {
      setOrdersHasMore(false);
      ordersMoreBusy.current = false;
      setOrdersMoreLoading(false);
      return;
    }
    const batch = await fetchPage(start);
    if (batch.length > 0) {
      const seen = new Set(ordersData.map((r) => r.id));
      setOrdersData((prev) => [...prev, ...batch.filter((r) => !seen.has(r.id))]);
    }
    setOrdersHasMore(batch.length === LOG_PAGE_SIZE && start + batch.length < LOG_MAX_ROWS);
    setOrdersMoreLoading(false);
    ordersMoreBusy.current = false;
  }, [ordersData, ordersHasMore, ordersLoading, fetchPage]);

  loadMoreRef.current = loadMore;

  // IntersectionObserver sentinel for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMoreRef.current();
      },
      { rootMargin: "500px 0px 0px 0px", threshold: 0 }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [branchLogName]);

  const toggleGRN = (grn: string) => {
    setExpandedOrderGRNs((prev) => {
      const next = new Set(prev);
      next.has(grn) ? next.delete(grn) : next.add(grn);
      return next;
    });
  };

  // Group rows by GRN
  const orderGroups: [string, LogRow[]][] = (() => {
    const map = new Map<string, LogRow[]>();
    for (const row of ordersData) {
      const grn = row.GRN || `no-grn-${row.id}`;
      if (!map.has(grn)) map.set(grn, []);
      map.get(grn)!.push(row);
    }
    return Array.from(map.entries());
  })();

  const containerStyle: React.CSSProperties = scrollWithPage
    ? { width: "100%", minWidth: 0 }
    : { flex: 1, overflowX: "hidden", overflowY: "auto", minHeight: 0, paddingBottom: "12px" };

  return (
    <div ref={scrollRef} style={containerStyle}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, width: "100%" }}>

        {/* Sticky header */}
        <div
          style={{
            position: scrollWithPage ? "relative" : "sticky",
            top: scrollWithPage ? undefined : 0,
            zIndex: scrollWithPage ? undefined : 10,
            display: "grid",
            gridTemplateColumns: "54px 1fr 48px 48px 22px",
            gap: "6px",
            paddingBottom: "10px",
            borderBottom: "0.5px solid hsl(var(--border))",
            background: scrollWithPage ? "transparent" : "hsl(var(--background))",
          }}
        >
          {(["Date", "GRN", "Items"] as const).map((label, i) => (
            <div
              key={label}
              style={{
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "Raleway, inherit",
                color: "hsl(var(--foreground))",
                letterSpacing: i === 1 ? "0.02em" : undefined,
                textAlign: i === 2 ? "center" : undefined,
              }}
            >
              {label}
            </div>
          ))}
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "Raleway, inherit",
              color: "hsl(var(--foreground))",
              textAlign: "center",
              // Only show "Bal" header when at least one GRN is expanded
              visibility: expandedOrderGRNs.size > 0 ? "visible" : "hidden",
            }}
          >
            Bal
          </div>
          <div />
        </div>

        {ordersLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
            Loading...
          </div>
        )}
        {!ordersLoading && orderGroups.length === 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
            No entries
          </div>
        )}

        {!ordersLoading &&
          orderGroups.map(([grn, grnRows]) => {
            const isOpen = expandedOrderGRNs.has(grn);
            const dateStr = fmtOrderDate(grnRows[0]?.DATE || "");
            return (
              <div
                key={grn}
                style={{
                  // Expanded-group box — same treatment as LogRowItem's expanded row:
                  // grey tint + rounded corners around the summary row + its items.
                  background: isOpen ? "hsl(var(--muted) / 0.35)" : "transparent",
                  borderRadius: isOpen ? "12px" : "0",
                  transition: "background 0.15s ease",
                }}
              >
                {/* GRN summary row */}
                <div
                  onClick={() => toggleGRN(grn)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "54px 1fr 48px 48px 22px",
                    gap: "6px",
                    padding: "9px 0",
                    borderBottom: "0.5px solid hsl(var(--border) / 0.4)",
                    cursor: "pointer",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))" }}>
                    {dateStr}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: isOpen ? 400 : 300,
                      fontFamily: "Raleway, inherit",
                      color: "hsl(var(--foreground))",
                      letterSpacing: "0.02em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {grn}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: isOpen ? 400 : 300,
                      fontFamily: "Raleway, inherit",
                      color: "hsl(var(--muted-foreground))",
                      textAlign: "center",
                    }}
                  >
                    {grnRows.length}
                  </div>
                  <div />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))" }}>
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </div>
                </div>

                {/* Expanded GRN items — slides open/closed with the same spring as
                    LogRowItem's actions section */}
                <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="items"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={ACTIONS_TRANSITION}
                    style={{ overflow: "hidden", paddingBottom: "6px" }}
                  >
                    {grnRows.map((row, idxRow) => (
                      <div
                        key={row.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "54px 1fr 48px 48px 22px",
                          gap: "6px",
                          padding: "5px 0",
                          borderTop: idxRow > 0 ? "0.5px solid hsl(var(--border) / 0.25)" : "none",
                          alignItems: "center",
                        }}
                      >
                        {/* Hidden date spacer keeps grid aligned */}
                        <div style={{ visibility: "hidden", fontSize: "14px", fontWeight: 400, fontFamily: "Raleway, inherit" }}>
                          {dateStr}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                          {row["PRODUCT NAME"]}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(142 65% 38%)", textAlign: "center" }}>
                          +{Math.abs(row.QTY ?? 0)}
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
                          {row["ENDING BALANCE"] ?? "—"}
                        </div>
                        <div />
                      </div>
                    ))}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            );
          })}

        {ordersMoreLoading && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
            Loading more…
          </div>
        )}
        {!ordersHasMore && !ordersLoading && ordersData.length > 0 && (
          <div style={{ fontSize: "12px", fontWeight: 300, color: "hsl(var(--muted-foreground))", padding: "12px 0" }}>
            End of history
          </div>
        )}

        {/* Sentinel — triggers next page via IntersectionObserver */}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
    </div>
  );
};