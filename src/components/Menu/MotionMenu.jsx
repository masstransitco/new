import React from "react";
import PropTypes from "prop-types";

const MotionMenu = ({ fareInfo }) => {
  if (!fareInfo) return null;

  return (
    <div className="motion-menu">
      <h3>Fare Details</h3>
      <p>Your Fare: HK${fareInfo.ourFare}</p>
      <p>Estimated Taxi Fare: HK${fareInfo.taxiFareEstimate}</p>
      <p>Distance: {fareInfo.distanceKm} km</p>
      <p>Estimated Time: {fareInfo.estTime}</p>
    </div>
  );
};

MotionMenu.propTypes = {
  fareInfo: PropTypes.shape({
    ourFare: PropTypes.number,
    taxiFareEstimate: PropTypes.number,
    distanceKm: PropTypes.string,
    estTime: PropTypes.string,
  }),
};

export default MotionMenu;
