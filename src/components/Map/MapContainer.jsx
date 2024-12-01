import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Autocomplete,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = {
  lat: 22.3964, // Default center: Hong Kong
  lng: 114.1095,
};

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchBox, setSearchBox] = useState(null);

  useEffect(() => {
    // Load GeoJSON data
    fetch("/stations.geojson") // Replace with your hosted GeoJSON file path
      .then((response) => response.json())
      .then((data) => {
        const features = data.features.map((feature) => ({
          id: feature.id,
          position: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
          },
          ...feature.properties,
        }));
        setStations(features);
      });
  }, []);

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  const onPlaceChanged = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place && place.geometry) {
        map.panTo(place.geometry.location);
        map.setZoom(15);
      }
    }
  };

  return (
    <LoadScript googleMapsApiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours" libraries={["places"]}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
      >
        {/* Search Bar */}
        <Autocomplete
          onLoad={(autocomplete) => setSearchBox(autocomplete)}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder="Search for a location"
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "300px",
              padding: "10px",
              zIndex: 10,
            }}
          />
        </Autocomplete>

        {/* Markers for Stations */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.position}
            onClick={() => setSelectedStation(station)}
          />
        ))}

        {/* Info Window for Selected Station */}
        {selectedStation && (
          <InfoWindow
            position={selectedStation.position}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div>
              <h3>{selectedStation.PLace}</h3>
              <p>{selectedStation.Address}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapContainer;
