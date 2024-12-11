// src/components/Map/BackButton.jsx

import React from "react";
import "./Button.css"; // Import the CSS for styling

const BackButton = ({ onClick }) => (
  <button className="back-button" onClick={onClick} aria-label="Go Back">
    ←
  </button>
);

export default BackButton;
