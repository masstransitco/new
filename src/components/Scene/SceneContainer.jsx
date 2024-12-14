/* global google */

import React, { useEffect } from "react";
import "./SceneContainer.css";

const SceneContainer = () => {
  const apiKey = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours"; // Replace with your actual API key
  const initialCenter = {
    lat: 0, // Match the center latitude from Google's example
    lng: 0, // Match the center longitude from Google's example
    altitude: 16000000, // Match Google's example altitude
  };

  useEffect(() => {
    const loadMap = async () => {
      try {
        // Load the Maps 3D library and pass the API key
        await google.maps.importLibrary("maps3d", {
          key: apiKey, // Ensure the API key is provided
        });

        // Import the Map3DElement class
        const { Map3DElement } = await google.maps.importLibrary("maps3d");

        // Initialize the Map3D element with the given center
        const map3DElement = new Map3DElement({
          center: initialCenter,
          zoom: 16, // Optional: adjust zoom level as needed
        });

        // Append the 3D map to the DOM
        const container = document.getElementById("scene-container");
        container.appendChild(map3DElement);

        console.log("Map3D initialized successfully!");
      } catch (error) {
        console.error("Error loading Google Maps 3D library:", error);
      }
    };

    loadMap(); // Execute the map loading function on mount
  }, [apiKey]);

  return (
    <div id="scene-container" style={{ width: "100%", height: "100vh" }} />
  );
};

export default SceneContainer;
