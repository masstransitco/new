// src/components/Map/ViewBar.jsx

import React from "react";
import "./ViewBar.css"; // Ensure styles are correctly applied
import LocateMe from "./LocateMe"; // Import the LocateMe component
import HomeButton from "./HomeButton"; // Import HomeButton component
import BackButton from "./BackButton"; // Import BackButton component
import ChooseDestinationButton from "./ChooseDestinationButton"; // Import the new component

const ViewBar = ({
  departure,
  arrival,
  onLocateMe,
  viewBarText,
  onClearDeparture,
  onClearArrival,
  showChooseDestination,
  onChooseDestination,
  onBack, // Handler for BackButton
  onHome, // Handler for HomeButton
  isCityView, // Determines if HomeButton should be displayed
}) => {
  return (
    <div className="view-bar">
      {/* Top Buttons Group: Back and Home Buttons */}
      <div className="top-buttons-group">
        <BackButton onClick={onBack} />
        {!isCityView && <HomeButton onClick={onHome} />}
      </div>

      {/* View Title */}
      <div className="view-title">{viewBarText}</div>

      {/* Buttons Group: LocateMe and Clear Buttons */}
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
              aria-label="Clear Departure"
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
              aria-label="Clear Arrival"
            >
              ✕
            </button>
            <span className="selection-text">Arrival: {arrival}</span>
          </div>
        )}
      </div>

      {/* Choose Destination Button */}
      {showChooseDestination && (
        <ChooseDestinationButton onChooseDestination={onChooseDestination} />
      )}
    </div>
  );
};

export default React.memo(ViewBar);
