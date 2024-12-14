import React, { useEffect } from "react";

const SceneContainer = () => {
  const initialCenter = "22.2982,114.1729"; // Center as a string "lat,lng"
  const initialTilt = 67.5; // Desired tilt angle

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
            reject(new Error("3D Maps API failed to load."));
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
          // Set the center, tilt, altitude, and heading attributes
          mapElement.setAttribute("center", initialCenter); // Center as a string
          mapElement.setAttribute("tilt", initialTilt); // Tilt as a number

          console.log("3D environment initialized.");
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
    <div style={{ height: "30vh", width: "100%" }}>
      {/* Render the gmp-map-3d tag directly */}
      <gmp-map-3d
        style={{ height: "100%", width: "100%" }}
        default-labels-disabled
      ></gmp-map-3d>
    </div>
  );
};

export default SceneContainer;
