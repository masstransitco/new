import React, { useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps"; // Only import what you need
import "./SceneContainer.css";

const SceneContainer = () => {
  const initialPosition = { lat: 22.295, lng: 114.172 }; // Set your initial position

  useEffect(() => {
    const loadMap = async () => {
      // Load the maps3d library
      const { Map3DElement } = await google.maps.importLibrary("maps3d");
      const map3DElement = new Map3DElement({
        center: {
          lat: initialPosition.lat,
          lng: initialPosition.lng,
          altitude: 16000000,
        },
        zoom: 16,
      });
      document.getElementById("scene-container").appendChild(map3DElement);
    };

    loadMap();
  }, []);

  return (
    <APIProvider apiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours">
      <div>
        <div className="pac-card" id="pac-card"></div>
        <div id="scene-container" style={{ width: "100%", height: "100vh" }} />
      </div>
    </APIProvider>
  );
};

export default SceneContainer;
