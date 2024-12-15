// src/components/Map/ViewBar.jsx

import React from "react";
import PropTypes from "prop-types";
import "./ViewBar.css"; // Ensure you have appropriate styles

const ViewBar = ({
  departure,
  arrival,
  onLocateMe,
  viewBarText,
  onClearDeparture,
  onClearArrival,
  showChooseDestination,
  onChooseDestination,
  onHome,
  isCityView,
  userState,
  isMeView,
  distanceKm,
  estTime,
}) => {
  return (
    <div className="view-bar">
      {/* Left Section: View Bar Text */}
      <div className="view-bar-text">
        <h2>{viewBarText}</h2>
        {distanceKm && estTime && (
          <p>
            Distance: {distanceKm} km | Estimated Time: {estTime}
          </p>
        )}
      </div>

      {/* Center Section: Departure and Arrival Info */}
      <div className="view-bar-info">
        {departure && (
          <div className="departure-info">
            <span>Departure: {departure}</span>
            <button onClick={onClearDeparture} className="clear-button" aria-label="Clear Departure">
              Clear
            </button>
          </div>
        )}
        {arrival && (
          <div className="arrival-info">
            <span>Arrival: {arrival}</span>
            <button onClick={onClearArrival} className="clear-button" aria-label="Clear Arrival">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Right Section: Action Buttons */}
      <div className="view-bar-actions">
        {/* Locate Me Button - Visible when not in MeView */}
        {!isMeView && (
          <button onClick={onLocateMe} className="action-button" aria-label="Locate Me">
            Locate Me
          </button>
        )}

        {/* Choose Destination Button - Visible based on showChooseDestination */}
        {showChooseDestination && (
          <button
            onClick={onChooseDestination}
            className="choose-destination-button"
            aria-label="Choose Destination"
          >
            Choose Destination
          </button>
        )}

        {/* Home Button - Visible when not in CityView */}
        {!isCityView && (
          <button onClick={onHome} className="action-button" aria-label="Go Home">
            Home
          </button>
        )}
      </div>
    </div>
  );
};

ViewBar.propTypes = {
  departure: PropTypes.string,
  arrival: PropTypes.string,
  onLocateMe: PropTypes.func.isRequired,
  viewBarText: PropTypes.string.isRequired,
  onClearDeparture: PropTypes.func.isRequired,
  onClearArrival: PropTypes.func.isRequired,
  showChooseDestination: PropTypes.bool.isRequired,
  onChooseDestination: PropTypes.func.isRequired,
  onHome: PropTypes.func.isRequired,
  isCityView: PropTypes.bool.isRequired,
  userState: PropTypes.string.isRequired,
  isMeView: PropTypes.bool.isRequired,
  distanceKm: PropTypes.string,
  estTime: PropTypes.string,
};

export default ViewBar;