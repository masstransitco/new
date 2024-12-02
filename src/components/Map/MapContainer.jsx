/* src/components/MapContainer.jsx */

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

// Custom Map Styles (Dark Gray)
const darkGrayMapStyle = [
  // ... your map styles
];

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showCircles, setShowCircles] = useState(false);

  // Load the Google Maps script
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours", // Replace with your API key
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
        alert("Failed to load station data. Please try again later.");
      });
  }, []);

  // Handle Marker Click
  const handleMarkerClick = useCallback(
    (station) => {
      setSelectedStation(station);
      setShowCircles(false);

      if (userLocation && isLoaded) {
        const directionsService = new window.google.maps.DirectionsService();
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

  // Locate User
  const locateMe = useCallback(() => {
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
          alert(
            "Unable to access your location. Please ensure location services are enabled."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [map]);

  // Handle Map Clicks
  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);
  }, []);

  // Marker Icon
  const markerIcon = isLoaded
    ? {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#000000",
      }
    : null;

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={{
        styles: darkGrayMapStyle,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true, // Enable zoom buttons
        gestureHandling: "auto", // Enable user gestures
        rotateControl: false, // Disable rotation
      }}
      onLoad={(mapInstance) => setMap(mapInstance)}
      onClick={handleMapClick}
    >
      {/* Locate Me Button */}
      <button onClick={locateMe} className="locate-me-button">
        Locate Me
      </button>

      {/* User Location Marker */}
      {userLocation && (
        <>
          <Marker
            position={userLocation}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
          />
          {showCircles && (
            <>
              <Circle
                center={userLocation}
                radius={500}
                options={{
                  strokeColor: "#FFFFFF",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillOpacity: 0,
                }}
              />
              <Circle
                center={userLocation}
                radius={1000}
                options={{
                  strokeColor: "#FFFFFF",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillOpacity: 0,
                }}
              />
            </>
          )}
        </>
      )}

      {/* Station Markers with MarkerClusterer */}
      <MarkerClusterer>
        {(clusterer) =>
          stations.map((station) => (
            <Marker
              key={station.id}
              position={station.position}
              clusterer={clusterer}
              onClick={() => handleMarkerClick(station)}
              icon={markerIcon}
            />
          ))
        }
      </MarkerClusterer>

      {/* Selected Station InfoWindow */}
      {selectedStation && (
        <InfoWindow
          position={selectedStation.position}
          onCloseClick={() => setSelectedStation(null)}
        >
          <div>
            <h3>{selectedStation?.Place || "Unnamed Station"}</h3>
            <p>{selectedStation?.Address || "No address available"}</p>
          </div>
        </InfoWindow>
      )}

      {/* Directions */}
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
};

export default MapContainer;
