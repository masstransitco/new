import React, { useEffect, useRef } from "react";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import "./SceneContainer.css";

const SceneContainer = () => {
  const sceneRef = useRef(null);

  useEffect(() => {
    // Initialize the WebScene with the provided item ID
    const webScene = new WebScene({
      portalItem: {
        id: "4304b6c3b2084330b4a2153da9fbbcf0", // Your WebScene item ID
      },
    });

    // Create the SceneView
    const view = new SceneView({
      container: sceneRef.current, // Reference to the div element
      map: webScene, // Pass the WebScene instance
    });

    return () => {
      // Clean up the view when the component is unmounted
      if (view) {
        view.destroy();
      }
    };
  }, []);

  return <div ref={sceneRef} style={{ width: "100%", height: "100vh" }} />;
};

export default SceneContainer;
