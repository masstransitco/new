import React, { useState, useEffect } from "react";
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

const MenuContainer = ({ onSelectCar }) => {
  const [selectedCar, setSelectedCar] = useState("EV5"); // Default selected

  const handleSelectCar = (name) => {
    setSelectedCar(name);
    onSelectCar(name); // Trigger the event
  };

  useEffect(() => {
    // Set default selection on mount
    onSelectCar(selectedCar);
  }, [onSelectCar, selectedCar]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
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
              minWidth: "80px",
              border: "none", // Remove border
              boxShadow: "none", // Remove shadow
            }}
            onClick={() => handleSelectCar(name)}
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
