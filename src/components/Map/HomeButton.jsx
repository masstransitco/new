// src/components/Map/HomeButton.jsx

import React from "react";
import "./Button.css"; // Import the CSS for styling

const HomeButton = ({ onClick }) => (
  <button className="home-button" onClick={onClick} aria-label="Go Home">
    🏠
  </button>
);

export default HomeButton;
