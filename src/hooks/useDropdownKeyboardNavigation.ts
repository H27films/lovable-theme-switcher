import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from "react";

/**
 * Shared keyboard model for product-picker dropdowns.
 *
 * Behaviour mirrors the original `handleOrderKeyDown` in `src/pages/Order.tsx`
 * (lines 299–305), generalised so every picker gets identical feel:
 *   ArrowDown → highlight next item
 *   ArrowUp   → highlight previous item
 *   Enter     → select the highlighted item
 *   Escape    → close the dropdown (via `onClose`)
 *
 * `ArrowDown` starts at index 0 from an unhighlighted (-1) state and clamps at
 * the bottom; `ArrowUp` clamps at 0. Arrow keys are ignored (and left free to
 * move the caret) while `itemCount` is 0 — callers pass 0 whenever their
 * dropdown is closed so keyboard support is purely additive. `activeIndex`
 * resets to -1 whenever `itemCount` changes so a stale highlight can never
 * point at the wrong row after the list filters.
 */
export interface DropdownKeyboardNavigation {
  /** Index currently highlighted; -1 = nothing highlighted yet. */
  activeIndex: number;
  /** Spread onto the picker input or trigger's onKeyDown. */
  handleKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  /** Imperative highlight reset, exposed for completeness. */
  setActiveIndex: Dispatch<SetStateAction<number>>;
}

export const useDropdownKeyboardNavigation = ({
  itemCount,
  onSelect,
  onClose,
}: {
  /** Number of navigable items; 0 disables arrow/Enter handling (closed list). */
  itemCount: number;
  /** Called with the highlighted index when Enter is pressed. */
  onSelect: (index: number) => void;
  /** Called when Escape is pressed, regardless of item count. */
  onClose: () => void;
}): DropdownKeyboardNavigation => {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setActiveIndex(-1);
  }, [itemCount]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (itemCount <= 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, itemCount - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        onSelect(activeIndex);
        setActiveIndex(-1);
      }
    },
    [itemCount, onSelect, onClose, activeIndex]
  );

  return { activeIndex, handleKeyDown, setActiveIndex };
};

/* ── Sibling bridge ─────────────────────────────────────────────────────────
 * Some pickers cannot wire props: `branch/Search.tsx` owns the <input>, but
 * the result list (<ProductList/>) is mounted as a *sibling* by the Boudoir /
 * Chic / NurYadi pages, whose code we intentionally don't touch. This module-
 * level store lets the list side publish its items (and a select callback)
 * while the input side publishes its active index — effectively threading
 * props between siblings without changing either call site.
 *
 * Assumption: only one Search + ProductList pair is mounted at a time (true
 * for this app — each portal/route hosts at most one).
 */
export interface DropdownNavChannel<T = unknown> {
  /** Current flat item list, in visual order. Read live via a getter. */
  readonly items: readonly T[];
  /** Select-by-index; implemented by the list side (mirrors row clicks). */
  selectAt: (index: number) => void;
}

interface ChannelSnapshot {
  channel: DropdownNavChannel<any> | null;
  activeIndex: number;
}

let channelSnapshot: ChannelSnapshot = { channel: null, activeIndex: -1 };
const channelListeners = new Set<() => void>();
const emitChannel = () => channelListeners.forEach(fn => fn());

export const dropdownNavChannelStore = {
  subscribe(fn: () => void) {
    channelListeners.add(fn);
    return () => {
      channelListeners.delete(fn);
    };
  },
  getSnapshot(): ChannelSnapshot {
    return channelSnapshot;
  },
  /** The result list registers itself while it is visible. Resets highlight. */
  publish(channel: DropdownNavChannel<any>) {
    channelSnapshot = { channel, activeIndex: -1 };
    emitChannel();
  },
  /** Called on unmount/hide so the input stops seeing a stale item count. */
  unpublish(channel: DropdownNavChannel<any>) {
    if (channelSnapshot.channel !== channel) return;
    channelSnapshot = { channel: null, activeIndex: -1 };
    emitChannel();
  },
  /** The input pushes the highlighted row down to the list. */
  publishActiveIndex(index: number) {
    if (channelSnapshot.activeIndex === index) return;
    channelSnapshot = { ...channelSnapshot, activeIndex: index };
    emitChannel();
  },
};