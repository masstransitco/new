import React, { useEffect } from "react";

const SceneContainer = () => {
  const initialCenter = "22.2982,114.1729"; // Center as a string "lat,lng"
  const initialTilt = 67.5; // Desired tilt angle
  const initialAltitude = "1000"; // Altitude as a string to avoid type coercion issues
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
          // Set the center, tilt, altitude, and heading attributes
          mapElement.setAttribute("center", initialCenter); // Center as a string
          mapElement.setAttribute("tilt", initialTilt); // Tilt as a number
          mapElement.setAttribute("altitude", initialAltitude); // Altitude as a string
          mapElement.setAttribute("heading", initialHeading); // Heading (0 = North)

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