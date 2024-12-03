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
import "./MapContainer.css"; // Ensure this path is correct based on your project structure

const containerStyle = {
  width: "100%",
  height: "50vh",
};

const center = {
  lat: 22.3964,
  lng: 114.1095,
};

// Uber-Inspired Dark Gray Map Styles
const darkGrayMapStyle = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }], // Hides all labels
  },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#242424" }], // Subtle dark gray for administrative boundaries
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#1c1c1c" }], // Darker background for landscape
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }], // Darker gray for points of interest
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      { color: "#383838" }, // Subtle contrast for roads
      { visibility: "simplified" },
    ],
  },
  {
    featureType: "road",
    elementType: "labels",
    stylers: [{ visibility: "off" }], // Hides road labels
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#333333" }], // Slightly lighter for transit lines
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1a1a1a" }], // Dark tone for water
  },
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
        alert("Failed to load station data. Please try again later.");
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

  // Locate User (Renamed to "Near Me" and adjusted functionality)
  const locateMe = useCallback(() => {
    // Clear existing directions and selected station
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
          alert(
            "Unable to access your location. Please ensure location services are enabled."
          );
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  }, [map]);

  // Handle Map Clicks (Clears selections and directions)
  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);
  }, []);

  // Marker Icon Configuration
  const markerIcon = isLoaded
    ? {
        path: google.maps.SymbolPath.CIRCLE,
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
    <div className="map-container" style={{ position: "relative" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          mapTypeId: "satellite",
          tilt: 45,
          styles: darkGrayMapStyle, // Added missing comma above
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
        {/* User Location Marker (Hidden when directions are active) */}
        {!directions && userLocation && (
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
            <div className="info-window">
              <h3>{selectedStation.Place || "Unnamed Station"}</h3>
              <p>{selectedStation.Address || "No address available"}</p>
            </div>
          </InfoWindow>
        )}

        {/* Directions Renderer (Hides user marker) */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // Prevents default markers from DirectionsRenderer
              polylineOptions: {
                strokeColor: "#276ef1", // Uber's blue for the route
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            }}
          />
        )}
      </GoogleMap>

      {/* "Near Me" Button */}
      <button
        onClick={locateMe}
        style={{
          position: "absolute",
          left: "10px",
          width: "40px", // Fixed width
          height: "40px", // Fixed height
          backgroundColor: "#e7e8ec",
          color: "#ffffff",
          border: "none",
          borderRadius: "1%", // Rounded Square
          fontSize: "1rem",
          fontWeight: "600",
          cursor: "pointer",
          zIndex: 1100,
          transition:
            "background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
          display: "flex", // Align icon in center
          alignItems: "center",
          justifyContent: "center",
        }}
        className="locate-me-button"
      >
        🔘
      </button>
    </div>
  );
};

export default MapContainer;
