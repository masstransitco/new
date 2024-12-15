// src/components/Map/RouteInfoWindow.jsx

import React from "react";
import PropTypes from "prop-types";
import "./RouteInfoWindow.css";

const RouteInfoWindow = ({ position, info, onClose }) => {
  return (
    <div
      className="route-info-window"
      style={{ top: position.lat, left: position.lng }}
    >
      <div className="route-info-content">
        <h3>{info.title}</h3>
        <p>{info.description}</p>
        <button
          onClick={onClose}
          className="close-button"
          aria-label="Close Route Info"
        >
          Close
        </button>
      </div>
    </div>
  );
};

RouteInfoWindow.propTypes = {
  position: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  info: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

export default RouteInfoWindow;
