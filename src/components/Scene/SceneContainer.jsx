import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import "./SceneContainer.css";

const SceneContainer = ({ center }) => {
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapContainerRef = useRef(null); // Reference to the map container div
  const mapInstanceRef = useRef(null); // Reference to the Map3DElement instance

  // Effect to check if Google Maps API is loaded
  useEffect(() => {
    // Function to check API availability
    const checkGoogleMapsAPI = () => {
      if (
        window.google &&
        window.google.maps &&
        window.google.maps.importLibrary
      ) {
        setIsMapsLoaded(true);
        return true;
      }
      return false;
    };

    // Initial check
    if (!checkGoogleMapsAPI()) {
      // Poll every second to check if Google Maps API has loaded
      const interval = setInterval(() => {
        if (checkGoogleMapsAPI()) {
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

      // Cleanup function
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isMapsLoaded]);

  // Effect to initialize the map once the API is loaded
  useEffect(() => {
    if (!isMapsLoaded || loadError || !center || !mapContainerRef.current)
      return;

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

        // Create a new Map3DElement with the defined camera settings
        const map = new Map3DElement({
          ...camera,
          defaultLabelsDisabled: true,
          defaultUiDisabled: true,
        });

        // Append the map to the container div
        mapContainerRef.current.appendChild(map);
        mapInstanceRef.current = map; // Store the map instance for potential future use

        // Define fly-around animation options
        const flyOptions = {
          camera: {
            center: { lat: center.lat, lng: center.lng },
            tilt: 45,
            altitude: 150,
          },
          durationMillis: 60000, // 60 seconds for one complete rotation
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

  // Cleanup effect to remove the map instance when the component unmounts
  useEffect(() => {
    return () => {
      if (
        mapInstanceRef.current &&
        mapContainerRef.current.contains(mapInstanceRef.current)
      ) {
        mapContainerRef.current.removeChild(mapInstanceRef.current);
      }
    };
  }, []);

  // Render error or loading states
  if (loadError) {
    return <p>Error loading Google Maps API: {loadError}</p>;
  }

  if (!isMapsLoaded) {
    return <p>Loading Google Maps...</p>;
  }

  // Render the map container
  return (
    <div className="scene-container">
      <div
        id="three-d-map"
        ref={mapContainerRef}
        className="scene-map"
        style={{ height: "400px", width: "800px" }}
      ></div>
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
