import React from "react";
import PropTypes from "prop-types";

const FareInfoWindow = ({ position, fareInfo, onClose }) => {
  if (!fareInfo) return null;

  return (
    <InfoWindow position={position} onCloseClick={onClose}>
      <div>
        <h3>Fare Information</h3>
        <p>Duration: {fareInfo.duration}</p>
        <p>Your Fare: HK${fareInfo.ourFare}</p>
        <p>Estimated Taxi Fare: HK${fareInfo.taxiFareEstimate}</p>
      </div>
    </InfoWindow>
  );
};

FareInfoWindow.propTypes = {
  position: PropTypes.object.isRequired,
  fareInfo: PropTypes.shape({
    duration: PropTypes.string,
    ourFare: PropTypes.number,
    taxiFareEstimate: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
};

export default FareInfoWindow;
