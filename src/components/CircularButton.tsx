import React from "react";

interface CircularButtonProps {
  onClick: () => void;
}

const CircularButton: React.FC<CircularButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{ width: "22px", height: "22px", padding: 0, border: "none", background: "none", cursor: "pointer" }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="11" fill="#1a1a1a" />
        <circle cx="11" cy="11" r="9" fill="none" stroke="#fff" strokeWidth="1.2" />
      </svg>
    </button>
  );
};

export default CircularButton;