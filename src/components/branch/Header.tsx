import React from "react";

interface HeaderProps {
  branch: string;
  onBack: () => void;
}

export const Header = ({ branch, onBack }: HeaderProps) => (
  <button
    onClick={onBack}
    style={{
      display: "block",
      fontSize: "clamp(22px, 6vw, 36px)",
      fontWeight: 300,
      letterSpacing: "0.08em",
      color: "hsl(var(--foreground))",
      background: "none",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      padding: "0 12px",
      width: "100%",
      marginBottom: "8px",
    }}
  >
    {branch}
  </button>
);
