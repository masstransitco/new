import React from "react";
import EV5 from "./EV5";
import EV7 from "./EV7";
import Taxi from "./Taxi";
import Van from "./Van";

const MenuContainer = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 0",
        gap: "15px",
        overflowX: "auto", // Allow horizontal scrolling for smaller screens
      }}
    >
      {/* Each vehicle option */}
      <div style={{ textAlign: "center" }}>
        <EV5 />
        <p style={{ margin: 0, fontSize: "0.85rem" }}>EV5</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <EV7 />
        <p style={{ margin: 0, fontSize: "0.85rem" }}>EV7</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Taxi />
        <p style={{ margin: 0, fontSize: "0.85rem" }}>Taxi</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <Van />
        <p style={{ margin: 0, fontSize: "0.85rem" }}>Van</p>
      </div>
    </div>
  );
};

export default MenuContainer;
