// src/components/Map/ViewBar.jsx

import React from "react";
import "./ViewBar.css"; // Ensure styles are correctly applied
import LocateMe from "./LocateMe"; // Import the LocateMe component
import { FaArrowRight } from "react-icons/fa"; // Import the arrow icon

const ViewBar = ({
  departure,
  arrival,
  onLocateMe,
  viewBarText,
  onClearDeparture,
  onClearArrival,
  showChooseDestination,
  onChooseDestination,
}) => {
  return (
    <div className="view-bar">
      <div className="view-title">{viewBarText}</div>
      <div className="buttons-group">
        {/* Locate Me Button */}
        <LocateMe onLocateMe={onLocateMe} />

        {/* Clear Departure Button */}
        {departure && (
          <div className="selection-bar">
            <button
              className="clear-button"
              onClick={onClearDeparture}
              title="Clear Departure"
            >
              ✕
            </button>
            <span className="selection-text">Departure: {departure}</span>
          </div>
        )}

        {/* Clear Arrival Button */}
        {arrival && (
          <div className="selection-bar">
            <button
              className="clear-button"
              onClick={onClearArrival}
              title="Clear Arrival"
            >
              ✕
            </button>
            <span className="selection-text">Arrival: {arrival}</span>
          </div>
        )}
      </div>

      {/* Choose Destination Button */}
      {showChooseDestination && (
        <button
          className="choose-destination-button"
          onClick={onChooseDestination}
        >
          Continue to select destination <FaArrowRight />
        </button>
      )}
    </div>
  );
};

export default React.memo(ViewBar);
