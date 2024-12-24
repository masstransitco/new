import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import "./SceneContainer.css";

const SceneContainer = ({ center }) => {
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsMapsLoaded(true);
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.maps) {
          setIsMapsLoaded(true);
          clearInterval(interval);
        }
      }, 1000);

      const timeout = setTimeout(() => {
        if (!isMapsLoaded) {
          setLoadError("Google Maps API failed to load.");
          clearInterval(interval);
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isMapsLoaded]);

  useEffect(() => {
    if (!isMapsLoaded || loadError || !center || !mapRef.current) return;

    const hkBounds = {
      north: 22.58,
      south: 22.15,
      west: 113.8,
      east: 114.5,
    };

    mapRef.current.bounds = hkBounds;
    mapRef.current.center = {
      lat: center.lat,
      lng: center.lng,
      altitude: 150,
    };
    mapRef.current.tilt = 45;

    // Start fly-around animation
    const animation = new window.google.maps.maps3d.FlyAroundAnimation({
      camera: {
        center: {
          lat: center.lat,
          lng: center.lng,
        },
        tilt: 45,
        altitude: 150,
      },
      durationMillis: 15000, // 30 seconds for one complete rotation
      rounds: 1,
    });

    mapRef.current.startAnimation(animation);
  }, [isMapsLoaded, loadError, center]);

  if (loadError) {
    return <p>Error loading Google Maps API.</p>;
  }

  if (!isMapsLoaded) {
    return <p>Loading Google Maps...</p>;
  }

  return (
    <div className="scene-container">
      <gmp-map-3d
        id="three-d-map"
        ref={mapRef}
        className="scene-map"
        default-labels-disabled
        default-ui-disabled
      ></gmp-map-3d>
    </div>
  );
};

SceneContainer.propTypes = {
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }).isRequired,
};

export default React.memo(SceneContainer);
