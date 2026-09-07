import React, { memo } from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { therapistPillStyle } from "@/lib/branchSimpleUtils";
import { type LogRow } from "@/lib/branchSimple";
import { ExpandedRowContent } from "./ExpandedRowContent";

const ACTIONS_TRANSITION: Transition = { type: "spring", stiffness: 280, damping: 26 };

interface LogRowItemProps {
  row: LogRow;
  idx: number;
  flowRows: LogRow[];
  expanded: boolean;
  nextExpanded: boolean;
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
  nextExpanded,
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
  const canCycleTherapist = !readOnly && withinCutoff;

  return (
    <div
    style={{
      borderBottom:
      !expanded && !nextExpanded && !dateSeparator && !isLastRowBeforeDateChange
        ? "0.5px solid hsl(var(--border) / 0.5)"
        : "none",
      background: expanded ? "hsl(var(--muted) / 0.35)" : "transparent",
      borderRadius: expanded ? "12px" : "0",
      transition: "background 0.15s ease",
    }}
  >
      {/* ── Top row — always visible, never animates ───────────────────
          Tapping it toggles expand/collapse. The content is identical
          whether the row is expanded or not so it stays perfectly still. */}
      <div
        onClick={(e) => {
          if (readOnly) return;
          e.stopPropagation();
          expanded ? onCollapse() : onExpand(row.id);
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
            marginTop: dateSeparator ? "4px" : "0",
            alignItems: "start",
            cursor: readOnly ? "default" : "pointer",
          }}
      >
        {selectedProduct ? (
          <>
           <div style={{ fontSize: "13px", fontWeight: 400, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", alignSelf: "start" }}>
  {showDate ? dateStr : expanded ? fmtDayName(row.DATE) : ""}
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
              {row.THERAPIST && !expanded ? (
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
            {showDate ? dateStr : expanded ? fmtDayName(row.DATE) : ""}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "13px", fontWeight: 300, fontFamily: "Raleway, inherit", color: "hsl(var(--foreground))", whiteSpace: "normal", wordBreak: "break-word" }}>
                  {row["PRODUCT NAME"] || "—"}
                </div>
                {!expanded && (row as any)["THERAPIST"] && (
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

      {/* ── Actions section — slides down beneath the stable top row ───
          Only mounts when the row is expanded and not read-only.
          The top row above never moves — only this section animates. */}
      <AnimatePresence initial={false}>
        {expanded && !readOnly && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={ACTIONS_TRANSITION}
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

export const LogRowItem = memo(LogRowItemInner);