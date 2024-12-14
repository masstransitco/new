/* global google */
import React, { useEffect } from "react";
import "./SceneContainer.css";

const SceneContainer = () => {
  const initialCenter = {
    lat: 0,
    lng: 0,
    altitude: 16000000,
  };

  useEffect(() => {
    const loadMap = async () => {
      try {
        // Wait for Google Maps API to be ready
        await loadGoogleMapsScript();

        const { Map3DElement } = await google.maps.importLibrary("maps3d");

        if (!Map3DElement) {
          throw new Error("Map3DElement not available.");
        }

        const map3DElement = new Map3DElement({
          center: initialCenter,
        });

        document.getElementById("scene-container").appendChild(map3DElement);
      } catch (error) {
        console.error("Error loading Google Maps 3D library:", error);
        document.getElementById("scene-container").innerText =
          "Failed to load 3D Map. Please try again.";
      }
    };

    loadMap();
  }, []);

  return (
    <div id="scene-container" style={{ width: "100%", height: "100vh" }} />
  );
};

const loadGoogleMapsScript = () => {
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
      }, 5000); // Timeout after 5 seconds
    }
  });
};

export default SceneContainer;
