import React from "react";

interface CircularButtonProps {
  onClick: () => void;
}

const CircularButton: React.FC<CircularButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: "#1a1a1a",
        border: "none",
        position: "relative",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "1.5px",
          left: "1.5px",
          right: "1.5px",
          bottom: "1.5px",
          borderRadius: "50%",
          border: "1px solid #fff",
        }}
      />
    </button>
  );
};

export default CircularButton;