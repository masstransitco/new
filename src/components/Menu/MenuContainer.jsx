import React, { useState } from "react";
import { motion } from "framer-motion";
import EV5 from "./EV5";
import EV7 from "./EV7";
import Taxi from "./Taxi";
import Van from "./Van";

const cars = [
  { name: "EV5", Component: EV5 },
  { name: "EV7", Component: EV7 },
  { name: "Taxi", Component: Taxi },
  { name: "Van", Component: Van },
];

const MenuContainer = () => {
  const [selectedCar, setSelectedCar] = useState("EV5"); // Default selected

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        gap: "15px",
        overflowX: "auto",
        width: "100%",
        height: "100%",
        padding: "10px 0",
      }}
    >
      {cars.map(({ name, Component }) => {
        const isSelected = selectedCar === name;
        return (
          <motion.div
            key={name}
            style={{
              textAlign: "center",
              flex: "0 0 auto",
              cursor: "pointer",
              // Set a min width to keep the items clearly visible
              minWidth: "80px",
            }}
            onClick={() => setSelectedCar(name)}
            animate={{
              scale: isSelected ? 1.1 : 1,
              boxShadow: isSelected ? "0 0 10px rgba(255,255,255,0.6)" : "none",
              transition: { type: "spring", stiffness: 200, damping: 15 },
            }}
          >
            <Component />
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                color: isSelected ? "#fff" : "#ccc",
              }}
            >
              {name}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MenuContainer;
