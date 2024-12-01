import React, { useRef, useEffect } from "react";
import MapView from "@arcgis/core/views/MapView";
import WebMap from "@arcgis/core/WebMap";
import "./MapContainer.css";

const MapContainer = () => {
  const mapDivRef = useRef(null);

  useEffect(() => {
    if (mapDivRef.current) {
      // Create a new WebMap instance
      const webMap = new WebMap({
        portalItem: {
          id: "646769bec315439d8bc0b3d6a2079dfe", // The app's ID from the URL
        },
      });

      // Create a new MapView instance
      const view = new MapView({
        container: mapDivRef.current,
        map: webMap,
      });

      // Clean up the MapView instance when the component unmounts
      return () => {
        if (view) {
          view.destroy();
        }
      };
    }
  }, []);

  return (
    <div
      ref={mapDivRef}
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    />
  );
};

export default MapContainer;
