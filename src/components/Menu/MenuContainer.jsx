import React from "react";
import EV5 from "./EV5";
import EV7 from "./EV7";
import Taxi from "./Taxi";
import Van from "./Van";

const MenuContainer = () => {
  return (
    <div
      style={{
        width: "95vw",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflow: "auto", // Corrected property name
        borderRadius: "8px", // Added border radius
        border: "1px solid #e78e8ec", // Optional: Add a border for better visibility
        padding: "10px", // Optional: Add some padding
      }}
    >
      <EV5 />
      <EV7 />
      <Taxi />
      <Van />
    </div>
  );
};

export default MenuContainer;
