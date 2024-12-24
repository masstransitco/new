import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import "./SceneContainer.css";

const SceneContainer = ({ center }) => {
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.maps3d) {
      setIsMapsLoaded(true);
    } else {
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.maps3d) {
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

    const map = mapRef.current;

    // Set bounds, center, and tilt
    map.bounds = hkBounds;
    map.center = {
      lat: center.lat,
      lng: center.lng,
      altitude: 150,
    };
    map.tilt = 45;

    // Initialize FlyCameraAroundAnimation
    try {
      const animation = new window.google.maps.maps3d.FlyCameraAroundAnimation({
        camera: {
          center: {
            lat: center.lat,
            lng: center.lng,
          },
          tilt: 45,
          altitude: 150,
        },
        durationMillis: 1500, // 15 seconds for one complete rotation
        rounds: 1,
      });

      map.startAnimation(animation);
    } catch (error) {
      console.error("FlyCameraAroundAnimation initialization failed:", error);
      setLoadError("FlyCameraAroundAnimation is not available.");
    }
  }, [isMapsLoaded, loadError, center]);

  if (loadError) {
    return <p>Error loading Google Maps API: {loadError}</p>;
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
