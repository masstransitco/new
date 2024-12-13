import React from "react";
import "./ViewBar.css"; // Ensure styles are correctly applied

const ViewBar = ({
  departure,
  arrival,
  onLocateMe,
  viewBarText,
  onClearDeparture,
  onClearArrival,
  showChooseDestination,
  onChooseDestination,
  userState,
}) => {
  return (
    <div className="view-bar">
      <div className="view-title">{viewBarText}</div>
      <div className="buttons-group">
        <button className="locate-me-button" onClick={onLocateMe}>
          Locate Me
        </button>
        {departure && (
          <div className="selection-bar">
            <button className="clear-button" onClick={onClearDeparture}>
              Clear
            </button>
            <span className="selection-text">Departure: {departure}</span>
          </div>
        )}
        {arrival && (
          <div className="selection-bar">
            <button className="clear-button" onClick={onClearArrival}>
              Clear
            </button>
            <span className="selection-text">Arrival: {arrival}</span>
          </div>
        )}
        {showChooseDestination && (
          <button
            className="choose-destination-button"
            onClick={onChooseDestination}
          >
            Choose Destination
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(ViewBar);
