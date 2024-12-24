// src/components/Scene/SceneContainer.jsx

import React, { useEffect, useState, useRef } from "react";
import PropTypes from "prop-types";
import "./SceneContainer.css";

const SceneContainer = ({ center }) => {
  const [isMapsLoaded, setIsMapsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // 1) Check if Google Maps API is loaded
  useEffect(() => {
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

    if (!checkGoogleMapsAPI()) {
      const interval = setInterval(() => {
        if (checkGoogleMapsAPI()) {
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

  // 2) Initialize the Map3D once API is ready
  useEffect(() => {
    if (!isMapsLoaded || loadError || !mapContainerRef.current) return;

    const initMap = async () => {
      try {
        const { Map3DElement } = await window.google.maps.importLibrary(
          "maps3d"
        );

        // Create a 3D map instance if it doesn’t already exist
        if (!mapInstanceRef.current) {
          const defaultCamera = {
            center: { lat: 22.236, lng: 114.191, altitude: 200 },
            tilt: 45,
            range: 1500,
          };
          const map = new Map3DElement({
            ...defaultCamera,
            defaultLabelsDisabled: true,
          });

          mapContainerRef.current.appendChild(map);
          mapInstanceRef.current = map;
        }
      } catch (error) {
        console.error("Error initializing Map3DElement:", error);
        setLoadError("Failed to initialize 3D Map.");
      }
    };

    initMap();
  }, [isMapsLoaded, loadError]);

  // 3) Whenever `center` changes, fly the camera around
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;

    try {
      // Adjust camera and animate to the new center
      mapInstanceRef.current.flyCameraAround({
        camera: {
          center: { lat: center.lat, lng: center.lng, altitude: 200 }, // Consistent altitude
          tilt: 45,
          range: 1500,
        },
        durationMillis: 60000, // 60 seconds for one complete rotation
        rounds: 1,
      });
    } catch (error) {
      console.error("Error re-flying camera:", error);
      setLoadError("Fly camera error.");
    }
  }, [center]);

  // 4) Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (
        mapInstanceRef.current &&
        mapContainerRef.current?.contains(mapInstanceRef.current)
      ) {
        mapContainerRef.current.removeChild(mapInstanceRef.current);
      }
    };
  }, []);

  // Render error or loading states
  if (loadError) {
    return <p>Error loading Google Maps 3D API: {loadError}</p>;
  }

  if (!isMapsLoaded) {
    return <p>Loading 3D Map...</p>;
  }

  // Render the 3D map container
  return (
    <div className="scene-container">
      <div
        id="three-d-map"
        ref={mapContainerRef}
        className="scene-map"
        style={{ height: "400px", width: "800px" }}
      />
    </div>
  );
};

SceneContainer.propTypes = {
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lng: PropTypes.number.isRequired,
  }),
};

export default React.memo(SceneContainer);
