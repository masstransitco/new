// src/components/Map/FareInfoWindow.jsx

import React from "react";
import PropTypes from "prop-types";
import { InfoWindow } from "@react-google-maps/api"; // Ensure InfoWindow is imported

const FareInfoWindow = ({ position, fareInfo, onClose }) => {
  if (!fareInfo || fareInfo.ourFare === undefined) return null;

  return (
    <InfoWindow position={position} onCloseClick={onClose}>
      <div>
        <h3>Fare Information</h3>
        <p>Duration: {fareInfo.duration || "N/A"}</p>
        <p>Your Fare: HK${fareInfo.ourFare}</p>
        <p>Estimated Taxi Fare: HK${fareInfo.taxiFareEstimate}</p>
      </div>
    </InfoWindow>
  );
};

FareInfoWindow.propTypes = {
  position: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
  fareInfo: PropTypes.shape({
    duration: PropTypes.string,
    ourFare: PropTypes.number,
    taxiFareEstimate: PropTypes.number,
  }),
  onClose: PropTypes.func.isRequired,
};

export default FareInfoWindow;
