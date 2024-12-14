import React, { useEffect } from "react";

const SceneContainer = () => {
  const initialCenter = "22.2982,114.1729"; // Center as a string "lat,lng"
  const initialTilt = 45; // Desired tilt angle
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
          // Set the center, tilt, and heading attributes
          mapElement.setAttribute("center", initialCenter);
          mapElement.setAttribute("tilt", initialTilt);
          mapElement.setAttribute("heading", initialHeading);

          console.log("Google Maps 3D map initialized successfully.");
        } else {
          console.error("gmp-map-3d element not found.");
        }
      } catch (error) {
        console.error("Failed to load Google Maps API:", error);
      }
    };

    const removeAlphaPopup = () => {
      const observer = new MutationObserver(() => {
        const popup = document.querySelector('.gm-style > div[role="dialog"]');
        if (popup) {
          popup.remove();
          console.log("Removed v=alpha pop-up");
          observer.disconnect(); // Stop observing once the pop-up is removed
        }
      });

      // Observe the map container for child node changes
      const mapContainer = document.querySelector('.gm-style');
      if (mapContainer) {
        observer.observe(mapContainer, { childList: true, subtree: true });
      }
    };

    // Initialize the map and remove pop-up
    initializeMap();
    removeAlphaPopup();
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