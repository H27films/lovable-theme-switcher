import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { therapistPillStyle } from "@/lib/branchSimpleUtils";
import { type LogRow } from "@/lib/branchSimple";
import { type Transition } from "framer-motion";
import { ExpandedRowContent } from "./ExpandedRowContent";

const EXPAND_TRANSITION: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };

interface LogRowItemProps {
  row: LogRow;
  idx: number;
  flowRows: LogRow[];
  expanded: boolean;
  isDeleting: boolean;
  selectedProduct: any;
  readOnly: boolean;
  scrollWithPage: boolean;
  pendingTherapist: { row: LogRow; value: string | null } | null;
  branchTherapists: string[];
  therapistCycleList: string[];
  withinCutoff: boolean;
  onUpdate?: unknown;
  formatDate: (d: string) => string;
  fmtDayName: (d: string) => string;
  onExpand: (id: number) => void;
  onCollapse: () => void;
  onEditClick: (row: LogRow) => void;
  onDeleteClick: (row: LogRow, e: React.MouseEvent<HTMLButtonElement>) => void;
  onCycleTherapist: (row: LogRow) => void;
}

const LogRowItemInner = ({
  row,
  idx,
  flowRows,
  expanded,
  isDeleting,
  selectedProduct,
  readOnly,
  scrollWithPage,
  pendingTherapist,
  branchTherapists,
  therapistCycleList,
  withinCutoff,
  onUpdate,
  formatDate,
  fmtDayName,
  onExpand,
  onCollapse,
  onEditClick,
  onDeleteClick,
  onCycleTherapist,
}: LogRowItemProps) => {
  const dateStr = formatDate(row.DATE);
  const prevDateStr = idx > 0 ? formatDate(flowRows[idx - 1].DATE) : null;
  const showDate = dateStr !== prevDateStr;
  const dateSeparator = showDate && idx > 0;
  const nextDateStr = idx < flowRows.length - 1 ? formatDate(flowRows[idx + 1].DATE) : null;
  const isLastRowBeforeDateChange = nextDateStr !== null && nextDateStr !== dateStr;

  const gridCols = selectedProduct ? "50px 44px 52px 64px 64px" : "45px 1fr 28px 32px 70px";
  const pillTherapist =
    pendingTherapist && pendingTherapist.row.id === row.id
      ? pendingTherapist.value
      : row.THERAPIST;
  const canCycleTherapist = !readOnly && !!onUpdate === false
    ? false
    // canCycleTherapist is true when the parent provided onTherapistChange AND the row is within 7 days.
    // We receive it pre-computed via withinCutoff; the parent decides whether cycling is allowed.
    : withinCutoff;

  return (
    <div
      style={{
        borderBottom:
          !dateSeparator && !isLastRowBeforeDateChange
            ? "0.5px solid hsl(var(--border) / 0.5)"
            : "none",
      }}
    >
      <AnimatePresence initial={false}>
        {!expanded || readOnly ? (
          // ── Collapsed row ──────────────────────────────────────────────
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={EXPAND_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <div
              onClick={(e) => {
                if (readOnly) return;
                e.stopPropagation();
                onExpand(row.id);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                gap: "4px",
                padding: "8px 0",
                borderTop: dateSeparator
                  ? scrollWithPage
                    ? "0.5px solid hsl(var(--border) / 0.4)"
                    : "1px solid hsl(var(--border) / 0.9)"
                  : "none",
                borderBottom: "none",
                marginTop: dateSeparator ? "4px" : "0",
                alignItems: "start",
                cursor: readOnly ? "default" : "pointer",
              }}
            >
              {selectedProduct ? (
                <>
                  <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>
                    {showDate ? dateStr : ""}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>
                    {row.QTY > 0 ? "+" : ""}{row.QTY}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                    {row["ENDING BALANCE"] ?? "—"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>
                    {row.TYPE || "—"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", minWidth: 0 }}>
                    {row.THERAPIST ? (
                      <span style={{ ...therapistPillStyle(row.THERAPIST, branchTherapists), padding: "2px 5px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                        {row.THERAPIST}
                      </span>
                    ) : (
                      <span style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))" }} />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>
                    {showDate ? dateStr : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row["PRODUCT NAME"] || "—"}
                      </div>
                      {(row as any)["THERAPIST"] && (
                        <span style={{ ...therapistPillStyle((row as any)["THERAPIST"], branchTherapists), padding: "2px 6px", borderRadius: "999px", fontSize: "8px", fontWeight: 600, fontFamily: "Raleway, inherit", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          {(row as any)["THERAPIST"]}
                        </span>
                      )}
                    </div>
                    {(row as any)["NOTES"] && (
                      <span style={{ fontSize: "11px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", lineHeight: 1.2 }}>
                        {(row as any)["NOTES"]}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: row.QTY < 0 ? "hsl(0 70% 50%)" : row.QTY > 0 ? "hsl(142 65% 38%)" : "hsl(var(--foreground))", textAlign: "center" }}>
                    {row.QTY > 0 ? "+" : ""}{row.QTY}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", textAlign: "center" }}>
                    {row["ENDING BALANCE"] ?? "—"}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", textAlign: "center" }}>
                    {row.TYPE || "—"}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : (
          // ── Expanded row ───────────────────────────────────────────────
          // No `layout` prop here — height:0→auto with overflow:hidden is
          // enough and avoids propagating layout animations to sibling rows.
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_TRANSITION}
            style={{ overflow: "hidden" }}
          >
            <ExpandedRowContent
              row={row}
              gridCols={gridCols}
              selectedProduct={selectedProduct}
              dateStr={dateStr}
              showDate={showDate}
              fmtDayName={fmtDayName}
              withinCutoff={withinCutoff}
              isDeleting={isDeleting}
              pillTherapist={pillTherapist}
              canCycleTherapist={canCycleTherapist}
              therapistCycleList={therapistCycleList}
              branchTherapists={branchTherapists}
              onUpdate={onUpdate}
              onCollapse={onCollapse}
              onEditClick={() => onEditClick(row)}
              onDeleteClick={(e) => onDeleteClick(row, e)}
              onCycleTherapist={() => onCycleTherapist(row)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// memo: only re-renders when its own props change.
// This means expanding row A won't re-render row B, C, D… — the list stays
// still and only the affected row animates.
export const LogRowItem = memo(LogRowItemInner);