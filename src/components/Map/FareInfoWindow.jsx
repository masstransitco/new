// src/components/Map/FareInfoWindow.jsx

import React from "react";
import PropTypes from "prop-types";
import "./FareInfoWindow.css";

const FareInfoWindow = ({ position, fareInfo, onClose }) => {
  return (
    <div
      className="fare-info-window"
      style={{ top: position.lat, left: position.lng }}
    >
      <div className="fare-info-content">
        <h3>Fare Information</h3>
        <p>Duration: {fareInfo.duration}</p>
        <p>Our Fare: HK${fareInfo.ourFare.toFixed(2)}</p>
        <p>Taxi Estimate: HK${fareInfo.taxiFareEstimate.toFixed(2)}</p>
        <button
          onClick={onClose}
          className="close-button"
          aria-label="Close Fare Info"
        >
          Close
        </button>
      </div>
    </div>
  );
};

FareInfoWindow.propTypes = {
  position: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  fareInfo: PropTypes.shape({
    duration: PropTypes.string.isRequired,
    ourFare: PropTypes.number.isRequired,
    taxiFareEstimate: PropTypes.number.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default FareInfoWindow;
