// src/components/Map/InfoBox.jsx

import React from "react";
import PropTypes from "prop-types";
import "./InfoBox.css"; // Styles specific to InfoBox

const InfoBox = ({ type, location, onClear, departureTime }) => {
  return (
    <div className="info-box">
      <span className="info-text">
        {type}: {location}
      </span>
      {/* (ii) Display departure time if available and type is "Departure" */}
      {type === "Departure" && departureTime && (
        <span className="departure-time">
          Departure Time:{" "}
          {new Date(Number(departureTime)).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
      <button
        className="clear-button"
        onClick={onClear}
        aria-label={`Clear ${type}`}
      >
        Clear
      </button>
    </div>
  );
};

InfoBox.propTypes = {
  type: PropTypes.oneOf(["Departure", "Arrival"]).isRequired,
  location: PropTypes.string.isRequired,
  onClear: PropTypes.func.isRequired,
  departureTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

InfoBox.defaultProps = {
  departureTime: null,
};

export default InfoBox;
