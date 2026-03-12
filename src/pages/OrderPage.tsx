import React from "react";
import { ChevronLeft } from "lucide-react";

interface Props {
  onBack: () => void;
}

const OrderPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div style={{ minHeight: "100dvh", padding: "0 16px" }}>
      {/* Back arrow */}
      <div style={{ paddingTop: "24px", paddingBottom: "16px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "hsl(var(--muted-foreground))",
            padding: "8px",
            margin: "-8px",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "hsl(var(--foreground))")}
          onMouseLeave={e => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
        >
          <ChevronLeft size={28} />
        </button>
      </div>

      {/* Content — blank for now */}
    </div>
  );
};

export default OrderPage;
