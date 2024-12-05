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
        overflow-y: auto,
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
