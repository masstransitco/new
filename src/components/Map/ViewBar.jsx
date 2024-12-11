// src/components/Map/ViewBar.jsx

import React from "react";
import "./ViewBar.css"; // Import the CSS for styling

const ViewBar = ({ stationName }) => (
  <div className="view-bar">
    <span>{stationName}</span>
  </div>
);

export default ViewBar;
