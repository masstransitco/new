// src/components/Scene/SceneContainer.jsx
import React, { useEffect, useState } from "react";

const SceneContainer = ({ selectedStation }) => {
  const [geojson, setGeojson] = useState(null);
  const [currentStation, setCurrentStation] = useState(null);

  useEffect(() => {
    if (selectedStation) {
      setCurrentStation(selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    if (!selectedStation) return;

    // Fetch the GeoJSON file dynamically
    const fetchGeojson = async () => {
      try {
        const response = await fetch("/stations.geojson");
        const data = await response.json();
        setGeojson(data);

        // Set the selected station as currentStation if not already set
        if (data.features && data.features.length > 0 && !currentStation) {
          const station = data.features.find(
            (feature) => feature.properties.Place === selectedStation.place
          );
          setCurrentStation(station);
        }
      } catch (error) {
        console.error("Error fetching GeoJSON file:", error);
      }
    };

    fetchGeojson();
  }, [selectedStation, currentStation]);

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
      if (!currentStation) {
        console.warn("No station data available to initialize the map.");
        return;
      }

      try {
        await loadGoogleMaps();

        // Get the 3D map element
        const mapElement = document.querySelector("gmp-map-3d");

        if (mapElement) {
          const { coordinates } = currentStation.geometry;
          const [lng, lat] = coordinates; // GeoJSON format uses [longitude, latitude]

          // Set initial map properties
          mapElement.setAttribute("center", `${lat},${lng}`);
          mapElement.setAttribute("tilt", "67.5");
          mapElement.setAttribute("heading", "0");
          mapElement.setAttribute("altitude", "1000");
          mapElement.setAttribute("range", "1500");

          console.log(`Map initialized at: ${currentStation.properties.Place}`);
        } else {
          console.error("gmp-map-3d element not found.");
        }
      } catch (error) {
        console.error("Error initializing the map:", error);
      }
    };

    initializeMap();
  }, [currentStation]);

  const handleStationChange = (station) => {
    setCurrentStation(station);
  };

  return (
    <div style={{ height: "30vh", width: "100%" }}>
      {geojson ? (
        geojson.features.length > 0 ? (
          <>
            {/* Dropdown to select a station */}
            <select
              onChange={(e) =>
                handleStationChange(
                  geojson.features.find(
                    (feature) => feature.properties.Place === e.target.value
                  )
                )
              }
            >
              {geojson.features.map((feature) => (
                <option key={feature.id} value={feature.properties.Place}>
                  {feature.properties.Place}
                </option>
              ))}
            </select>

            {/* Render the 3D map */}
            <gmp-map-3d
              style={{ height: "100%", width: "100%" }}
              default-labels-disabled
            ></gmp-map-3d>
          </>
        ) : (
          <p>No station data available.</p>
        )
      ) : (
        <p>Loading station data...</p>
      )}
    </div>
  );
};

export default SceneContainer;
