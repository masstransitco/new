import React, { useEffect } from "react";

const SceneContainer = () => {
  const initialCenter = "22.2982,114.1729"; // Center as a string "lat,lng"
  const initialTilt = 45.5; // Desired tilt angle
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
        const dialogs = document.querySelectorAll(
          '.gm-style > div[role="dialog"]'
        );
        dialogs.forEach((dialog) => {
          if (
            dialog.textContent.includes(
              "Using the alpha channel of the Google Maps JavaScript API"
            )
          ) {
            dialog.remove();
            console.log("Removed the alpha channel pop-up.");
          }
        });
      });

      // Observe changes in the document
      observer.observe(document.body, { childList: true, subtree: true });
    };

    // Initialize the map and remove the pop-up
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
