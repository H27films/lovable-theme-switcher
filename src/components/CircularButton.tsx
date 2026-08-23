import React from "react";

interface CircularButtonProps {
  onClick: () => void;
}

const CircularButton: React.FC<CircularButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{ width: "18px", height: "18px", padding: 0, border: "none", background: "none", cursor: "pointer" }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="9" fill="#1a1a1a" />
        <circle cx="9" cy="9" r="7.3" fill="none" stroke="#fff" strokeWidth="1" />
      </svg>
    </button>
  );
};

export default CircularButton;