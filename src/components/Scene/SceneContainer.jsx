import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import "./SceneContainer.css";

const SceneContainer = ({ center }) => {
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Check if Google Maps API is already loaded
    if (
      window.google &&
      window.google.maps &&
      window.google.maps.importLibrary
    ) {
      setIsMapsLoaded(true);
    } else {
      // Poll every second to check if Google Maps API has loaded
      const interval = setInterval(() => {
        if (
          window.google &&
          window.google.maps &&
          window.google.maps.importLibrary
        ) {
          setIsMapsLoaded(true);
          clearInterval(interval);
        }
      }, 1000);

      // Timeout after 10 seconds
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

    const initMap = async () => {
      try {
        // Import the Map3DElement library
        const { Map3DElement } = await window.google.maps.importLibrary(
          "maps3d"
        );

        // Define camera options
        const camera = {
          center: { lat: center.lat, lng: center.lng, altitude: 150 },
          tilt: 45,
          range: 1500, // Adjust as needed
        };

        // Configure the map element
        const map = mapRef.current;

        // Set initial camera settings
        map.camera = {
          center: { lat: center.lat, lng: center.lng, altitude: 150 },
          tilt: 45,
          range: 1500,
        };

        // Disable default labels and UI
        map.defaultLabelsDisabled = true;
        map.defaultUiDisabled = true;

        // Append the map to the DOM if not already appended
        if (!map.isInitialized) {
          document.querySelector(".scene-container").appendChild(map);
          map.isInitialized = true;
        }

        // Define fly-around animation options
        const flyOptions = {
          camera: {
            center: { lat: center.lat, lng: center.lng },
            tilt: 45,
            altitude: 150,
          },
          durationMillis: 1800, // 60 seconds for one complete rotation
          rounds: 1,
        };

        // Start the fly-around animation
        map.flyCameraAround(flyOptions);
      } catch (error) {
        console.error("Error initializing Map3DElement:", error);
        setLoadError("Failed to initialize 3D Map.");
      }
    };

    initMap();
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
        style={{ height: "400px", width: "800px" }}
        // Initial camera settings can be set via props or attributes if supported
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
