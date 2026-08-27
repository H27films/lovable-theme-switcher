import React, { useEffect, useRef } from "react";

interface ResultRowProps {
  /** True while this row is keyboard-highlighted; applies tint + scroll sync. */
  isActive?: boolean;
  /** Invoked on click (mouse/touch). Keyboard selection flows via the picker input. */
  onSelect: () => void;
  children?: React.ReactNode;
  className?: string;
  /** Row layout styles — merged in after the highlight so callers can override. */
  style?: React.CSSProperties;
  /** Background used while active. Defaults to the same tint Order.tsx uses. */
  activeBackground?: string;
}

const DEFAULT_ACTIVE_BACKGROUND = "hsl(var(--card))";

/**
 * Clickable result row shared by every keyboard-navigable product list.
 *
 * Purely additive over mouse behaviour: it renders a click-handling div like
 * before (onClick, not onMouseDown, so normal focus semantics apply), plus two
 * enhancements when `isActive`:
 *   - a highlight background
 *   - scrollIntoView so ↑/↓ always keeps the highlighted row visible inside
 *     the nearest scrolling ancestor.
 */
export const ResultRow = ({
  isActive = false,
  onSelect,
  children,
  className,
  style,
  activeBackground = DEFAULT_ACTIVE_BACKGROUND,
}: ResultRowProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView?.({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <div
      ref={ref}
      className={className}
      onClick={onSelect}
      style={{
        cursor: "pointer",
        ...(isActive ? { background: activeBackground } : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
};