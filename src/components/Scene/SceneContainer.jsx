import React, { useEffect } from "react";

const SceneContainer = () => {
  const initialCenter = "22.2982,114.1729"; // Latitude and Longitude of Tsim Sha Tsui East
  const initialTilt = 67.5; // Desired tilt angle
  const initialAltitude = 1000; // Altitude in meters for zoomed-in view
  const initialHeading = 0; // Initial map rotation (0 = North)

  useEffect(() => {
    const ensureGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (typeof google !== "undefined") {
          resolve();
        } else {
          const interval = setInterval(() => {
            if (typeof google !== "undefined") {
              clearInterval(interval);
              resolve();
            }
          }, 100);

          setTimeout(() => {
            clearInterval(interval);
            reject(new Error("Google Maps API failed to load."));
          }, 5000);
        }
      });
    };

    const initializeMap = async () => {
      try {
        await ensureGoogleMaps();

        // Access the gmp-map-3d element
        const mapElement = document.querySelector("gmp-map-3d");

        if (mapElement) {
          // Programmatically set the center, tilt, altitude, and heading
          mapElement.center = initialCenter;
          mapElement.tilt = initialTilt;
          mapElement.altitude = initialAltitude; // Adjust altitude for zoom level
          mapElement.heading = initialHeading;

          console.log("Google Maps 3D map initialized successfully.");
        } else {
          console.error("gmp-map-3d element not found.");
        }
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
      }
    };

    initializeMap();
  }, []);

  return (
    <div style={{ height: "20vh", width: "100%" }}>
      {/* Render the gmp-map-3d tag directly */}
      <gmp-map-3d style={{ height: "100%", width: "100%" }}></gmp-map-3d>
    </div>
  );
};

export default SceneContainer;
