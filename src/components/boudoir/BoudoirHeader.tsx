import React from "react";
import { X } from "lucide-react";

interface BoudoirHeaderProps {
  branch: string;
  onBack: () => void;
  onBackToMain?: () => void;
}

export const BoudoirHeader = ({ branch, onBack, onBackToMain }: BoudoirHeaderProps) => {
  return (
    <button
      onClick={() => {
        if (typeof onBackToMain === "function") onBackToMain();
        else if (onBack) onBack();
      }}
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
        padding: 0,
        width: "100%",
        marginBottom: "16px",
      }}
    >
      {branch}
    </button>
  );
};