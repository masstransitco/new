// src/components/Menu/MotionMenu.jsx

import React from "react";
import PropTypes from "prop-types";
import "./MotionMenu.css";

const MotionMenu = ({ fareInfo }) => {
  return (
    <div className="motion-menu">
      <h3>Fare Details</h3>
      <p>Our Fare: HK${fareInfo.ourFare.toFixed(2)}</p>
      <p>Taxi Estimate: HK${fareInfo.taxiFareEstimate.toFixed(2)}</p>
    </div>
  );
};

MotionMenu.propTypes = {
  fareInfo: PropTypes.shape({
    ourFare: PropTypes.number.isRequired,
    taxiFareEstimate: PropTypes.number.isRequired,
  }).isRequired,
};

export default MotionMenu;
