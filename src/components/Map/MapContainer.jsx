/* src/components/MapContainer.jsx */
/* global google */

import React, { useState, useEffect, useCallback } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  Circle,
  MarkerClusterer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "50vh",
};

const center = {
  lat: 22.3964,
  lng: 114.1095,
};

// Custom map styles
const darkGrayMapStyle = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#1c1c1c" }],
  },
  // Add more styles as needed...
];

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showCircles, setShowCircles] = useState(false);

  // Hardcoded API key for testing (replace this with an environment variable in production)
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours",
    libraries: ["geometry"],
  });

  // Fetch Stations Data
  useEffect(() => {
    fetch("/stations.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load GeoJSON");
        return response.json();
      })
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
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
      });
  }, []);

  // Handle Marker Click
  const handleMarkerClick = useCallback(
    (station) => {
      setSelectedStation(station);
      setShowCircles(false);

      if (userLocation && isLoaded) {
        const directionsService = new google.maps.DirectionsService();
        directionsService.route(
          {
            origin: userLocation,
            destination: station.position,
            travelMode: "WALKING",
          },
          (result, status) => {
            if (status === "OK") {
              setDirections(result);
            } else {
              console.error("Directions request failed:", status);
            }
          }
        );
      }

      if (map) {
        map.panTo(station.position);
        map.setZoom(15);
      }
    },
    [userLocation, map, isLoaded]
  );

  // Locate User Functionality
  const locateMe = useCallback(() => {
    setDirections(null);
    setSelectedStation(null);

    if (!map) {
      alert("Map is not initialized yet.");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userPos);
          map.panTo(userPos);
          map.setZoom(15);
          setShowCircles(true);
        },
        (error) => {
          console.error("Error fetching user location:", error);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [map]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="map-container" style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          mapTypeId: "satellite",
          tilt: 45,
          styles: darkGrayMapStyle,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "auto",
          rotateControl: false,
        }}
        onLoad={(mapInstance) => setMap(mapInstance)}
        onClick={() => {
          setSelectedStation(null);
          setDirections(null);
        }}
      >
        {/* Station Markers */}
        <MarkerClusterer>
          {(clusterer) =>
            stations.map((station) => (
              <Marker
                key={station.id}
                position={station.position}
                clusterer={clusterer}
                onClick={() => handleMarkerClick(station)}
              />
            ))
          }
        </MarkerClusterer>

        {/* Directions Renderer */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#276ef1",
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        )}
      </GoogleMap>

      {/* Locate Me Button */}
      <button
        onClick={locateMe}
        style={{
          position: "absolute",
          top: "90%",
          left: "10px",
          zIndex: 1000,
        }}
      >
        Locate Me
      </button>
    </div>
  );
};

export default MapContainer;
