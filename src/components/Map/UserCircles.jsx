// src/components/Map/UserCircles.jsx

import React from "react";
import PropTypes from "prop-types";

const UserCircles = ({ userLocation, distances, getLabelPosition }) => {
  return (
    <>
      {distances.map((distance) => (
        <circle
          key={distance}
          cx={userLocation.lng}
          cy={userLocation.lat}
          r={distance / 1000} // Adjust scaling as needed
          fill="rgba(52, 152, 219, 0.2)"
          stroke="#3498db"
          strokeWidth="2"
        />
      ))}
    </>
  );
};

UserCircles.propTypes = {
  userLocation: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  distances: PropTypes.arrayOf(PropTypes.number).isRequired,
  getLabelPosition: PropTypes.func.isRequired,
};

export default UserCircles;
