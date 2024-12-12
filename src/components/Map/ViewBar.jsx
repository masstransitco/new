// src/components/Map/ViewBar.jsx

import React from "react";
import PropTypes from "prop-types";
import { FaLocationArrow, FaHome, FaTimes } from "react-icons/fa"; // FaHome is now used
import "./ViewBar.css"; // Ensure this CSS file exists and is correctly imported

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
  onHomeClick, // New prop for Home button
}) => {
  return (
    <div className="viewbar-container">
      {/* Main ViewBar */}
      <div className="view-bar">
        {/* Home Button */}
        <button
          className="icon-button home-button"
          onClick={onHomeClick}
          aria-label="Home"
        >
          <FaHome />
        </button>

        {/* Locate Me Button */}
        <button
          className="icon-button locate-me-button"
          onClick={onLocateMe}
          aria-label="Locate Me"
        >
          <FaLocationArrow />
        </button>

        {/* View Title */}
        <div className="view-title">{viewBarText}</div>
      </div>

      {/* Choose Destination Button */}
      {showChooseDestination && (
        <button
          className="choose-destination-button"
          onClick={onChooseDestination}
          aria-label="Choose Destination"
        >
          Choose Destination
        </button>
      )}

      {/* Departure Bar */}
      {departure && (
        <div className="selection-bar">
          <button
            className="icon-button clear-button"
            onClick={onClearDeparture}
            aria-label="Clear Departure"
          >
            <FaTimes />
          </button>
          <span className="selection-text">Departure: {departure}</span>
        </div>
      )}

      {/* Arrival Bar */}
      {arrival && (
        <div className="selection-bar">
          <button
            className="icon-button clear-button"
            onClick={onClearArrival}
            aria-label="Clear Arrival"
          >
            <FaTimes />
          </button>
          <span className="selection-text">Arrival: {arrival}</span>
        </div>
      )}
    </div>
  );
};

// PropTypes for type checking
ViewBar.propTypes = {
  departure: PropTypes.string,
  arrival: PropTypes.string,
  onLocateMe: PropTypes.func.isRequired,
  viewBarText: PropTypes.string.isRequired,
  onClearDeparture: PropTypes.func.isRequired,
  onClearArrival: PropTypes.func.isRequired,
  showChooseDestination: PropTypes.bool.isRequired,
  onChooseDestination: PropTypes.func.isRequired,
  userState: PropTypes.string.isRequired,
  onHomeClick: PropTypes.func.isRequired, // New prop type
};

// Default props in case some props are not provided
ViewBar.defaultProps = {
  departure: null,
  arrival: null,
};

export default ViewBar;
