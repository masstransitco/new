import React, { useEffect, useState } from "react";
import { APIProvider, Map3DElement } from "@vis.gl/react-google-maps";
import "./SceneContainer.css";

const SceneContainer = () => {
  const [map3DElement, setMap3DElement] = useState(null);
  const initialPosition = { lat: 22.295, lng: 114.172 }; // Set your initial position

  useEffect(() => {
    const loadMap = async () => {
      const { Map3DElement } = await google.maps.importLibrary("maps3d");
      const newMap3DElement = new Map3DElement({
        center: {
          lat: initialPosition.lat,
          lng: initialPosition.lng,
          altitude: 16000000,
        },
        zoom: 16,
      });
      setMap3DElement(newMap3DElement);
      document.getElementById("scene-container").appendChild(newMap3DElement);
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
