// src/components/Scene/SceneContainer.jsx
import React, { useEffect, useState } from "react";

const SceneContainer = ({ selectedStation, selectedDistrict }) => {
  const [geojson, setGeojson] = useState(null);
  const [currentPlace, setCurrentPlace] = useState(null);

  useEffect(() => {
    if (selectedStation) {
      setCurrentPlace({
        coordinates: [
          selectedStation.position.lng,
          selectedStation.position.lat,
        ],
        name: selectedStation.place,
      });
    } else if (selectedDistrict) {
      setCurrentPlace({
        coordinates: [
          selectedDistrict.position.lng,
          selectedDistrict.position.lat,
        ],
        name: selectedDistrict.name,
      });
    }
  }, [selectedStation, selectedDistrict]);

  useEffect(() => {
    const fetchGeojson = async () => {
      try {
        const response = await fetch("/stations.geojson");
        const data = await response.json();
        setGeojson(data);
      } catch (error) {
        console.error("Error fetching GeoJSON file:", error);
      }
    };
    fetchGeojson();
  }, []);

  useEffect(() => {
    const loadGoogleMaps = () => {
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
      if (!currentPlace) {
        console.warn("No place data available to initialize the 3D map.");
        return;
      }

      try {
        await loadGoogleMaps();

        const mapElement = document.querySelector("gmp-map-3d");
        if (mapElement) {
          const [lng, lat] = currentPlace.coordinates;
          mapElement.setAttribute("center", `${lat},${lng}`);
          mapElement.setAttribute("tilt", "67.5");
          mapElement.setAttribute("heading", "0");
          mapElement.setAttribute("altitude", "1000");
          mapElement.setAttribute("range", "1500");
        } else {
          console.error("gmp-map-3d element not found.");
        }
      } catch (error) {
        console.error("Error initializing the 3D map:", error);
      }
    };

    initializeMap();
  }, [currentPlace]);

  return (
    <div style={{ height: "30vh", width: "100%" }}>
      {geojson ? (
        geojson.features && geojson.features.length > 0 ? (
          <gmp-map-3d
            style={{ height: "100%", width: "100%" }}
            default-labels-disabled
          ></gmp-map-3d>
        ) : (
          <p>No data available.</p>
        )
      ) : (
        <p>Loading station data...</p>
      )}
    </div>
  );
};

export default SceneContainer;
