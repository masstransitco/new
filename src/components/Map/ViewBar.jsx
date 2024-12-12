// src/components/Map/ViewBar.jsx

import React from "react";
import PropTypes from "prop-types";
import { FaLocationArrow } from "react-icons/fa";
import "./ViewBar.css"; // Ensure this CSS file exists and is correctly imported

const ViewBar = ({ departure, arrival, onLocateMe, viewBarText }) => {
  return (
    <div className="view-bar">
      <div className="view-bar-text">
        {departure && <span className="departure">Departure: {departure}</span>}
        {arrival && <span className="arrival">Arrival: {arrival}</span>}
        {!departure && !arrival && (
          <span className="default-text">{viewBarText}</span>
        )}
      </div>
      <button className="locate-me-button" onClick={onLocateMe}>
        <FaLocationArrow className="locate-me-icon" /> Locate Me
      </button>
    </div>
  );
};

// PropTypes for type checking
ViewBar.propTypes = {
  departure: PropTypes.string,
  arrival: PropTypes.string,
  onLocateMe: PropTypes.func.isRequired,
  viewBarText: PropTypes.string,
};

// Default props in case some props are not provided
ViewBar.defaultProps = {
  departure: null,
  arrival: null,
  viewBarText: "Hong Kong",
};

export default ViewBar;
