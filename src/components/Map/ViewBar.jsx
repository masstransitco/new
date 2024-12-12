// src/components/Map/ViewBar.jsx
import React from "react";
import "./ViewBar.css"; // Create and style as needed

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
      <div className="view-bar-text">{viewBarText}</div>
      <button onClick={onLocateMe}>Locate Me</button>
      {departure && (
        <div>
          Departure: {departure}{" "}
          <button onClick={onClearDeparture}>Clear</button>
        </div>
      )}
      {arrival && (
        <div>
          Arrival: {arrival} <button onClick={onClearArrival}>Clear</button>
        </div>
      )}
      {showChooseDestination && (
        <button onClick={onChooseDestination}>Choose Destination</button>
      )}
    </div>
  );
};

export default React.memo(ViewBar);
