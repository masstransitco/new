/* src/components/MapContainer.jsx */
/* global google */

import React, { useState, useEffect, useCallback, useRef } from "react";
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

// View Definitions
const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 113.926 },
  zoom: 10,
  tilt: 45,
  heading: 0,
};

const STATION_VIEW_ZOOM = 17;
const ME_VIEW_ZOOM = 17;

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showCircles, setShowCircles] = useState(false);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const currentView = viewHistory[viewHistory.length - 1];

  const mapRef = useRef(null);

  // Hardcoded API key for testing (replace this with an environment variable in production)
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours", // Replace with your actual API key or use an environment variable
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

  // Navigate to a specific view
  const navigateToView = useCallback(
    (view) => {
      setViewHistory((prevHistory) => [...prevHistory, view]);
      if (map) {
        map.panTo(view.center);
        map.setZoom(view.zoom);
        if (view.tilt !== undefined) {
          map.setTilt(view.tilt);
        }
        if (view.heading !== undefined) {
          map.setHeading(view.heading);
        }
      }
    },
    [map]
  );

  // Go back to the previous view
  const goBack = useCallback(() => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      setViewHistory(newHistory);
      const previousView = newHistory[newHistory.length - 1];
      if (map) {
        map.panTo(previousView.center);
        map.setZoom(previousView.zoom);
        if (previousView.tilt !== undefined) {
          map.setTilt(previousView.tilt);
        }
        if (previousView.heading !== undefined) {
          map.setHeading(previousView.heading);
        }
      }
    }
  }, [map, viewHistory]);

  // Handle Marker Click
  const handleMarkerClick = useCallback(
    (station) => {
      const stationView = {
        name: "StationView",
        center: station.position,
        zoom: STATION_VIEW_ZOOM,
      };
      navigateToView(stationView);
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
    },
    [userLocation, isLoaded, navigateToView]
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
          const meView = {
            name: "MeView",
            center: userPos,
            zoom: ME_VIEW_ZOOM,
          };
          navigateToView(meView);
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
  }, [map, navigateToView]);

  // Handle Map Clicks (Clears selections and directions)
  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);
  }, []);

  // Marker Icon Configuration (Same symbol for stations and clusters)
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

  // Custom Gesture Handling
  useEffect(() => {
    if (map) {
      const mapDiv = map.getDiv();

      let isTouching = false;
      let startX = 0;
      let startY = 0;

      const handleTouchStart = (e) => {
        isTouching = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      };

      const handleTouchMove = (e) => {
        if (!isTouching) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        startX = touch.clientX;
        startY = touch.clientY;

        // Adjust tilt and heading
        const currentTilt = map.getTilt() || 0;
        const currentHeading = map.getHeading() || 0;

        // Adjust tilt based on deltaY
        let newTilt = currentTilt + deltaY * 0.1;
        newTilt = Math.max(0, Math.min(67.5, newTilt)); // Tilt limits

        // Adjust heading based on deltaX
        let newHeading = currentHeading + deltaX * 0.5;
        newHeading = newHeading % 360;

        map.setTilt(newTilt);
        map.setHeading(newHeading);
      };

      const handleTouchEnd = () => {
        isTouching = false;
      };

      // Mouse Events
      let isMouseDown = false;
      let mouseX = 0;
      let mouseY = 0;

      const handleMouseDown = (e) => {
        isMouseDown = true;
        mouseX = e.clientX;
        mouseY = e.clientY;
      };

      const handleMouseMove = (e) => {
        if (!isMouseDown) return;
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Adjust tilt and heading
        const currentTilt = map.getTilt() || 0;
        const currentHeading = map.getHeading() || 0;

        // Adjust tilt based on deltaY
        let newTilt = currentTilt + deltaY * 0.1;
        newTilt = Math.max(0, Math.min(67.5, newTilt)); // Tilt limits

        // Adjust heading based on deltaX
        let newHeading = currentHeading + deltaX * 0.5;
        newHeading = newHeading % 360;

        map.setTilt(newTilt);
        map.setHeading(newHeading);
      };

      const handleMouseUp = () => {
        isMouseDown = false;
      };

      mapDiv.addEventListener("touchstart", handleTouchStart);
      mapDiv.addEventListener("touchmove", handleTouchMove);
      mapDiv.addEventListener("touchend", handleTouchEnd);

      mapDiv.addEventListener("mousedown", handleMouseDown);
      mapDiv.addEventListener("mousemove", handleMouseMove);
      mapDiv.addEventListener("mouseup", handleMouseUp);

      return () => {
        mapDiv.removeEventListener("touchstart", handleTouchStart);
        mapDiv.removeEventListener("touchmove", handleTouchMove);
        mapDiv.removeEventListener("touchend", handleTouchEnd);

        mapDiv.removeEventListener("mousedown", handleMouseDown);
        mapDiv.removeEventListener("mousemove", handleMouseMove);
        mapDiv.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [map]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="map-container"
      style={{ position: "relative" }}
      ref={mapRef}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: "94527c02bbb6243",
          tilt: currentView.tilt || 45,
          heading: currentView.heading || 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "none",
          rotateControl: true,
          minZoom: 10,
          draggable: false, // Disable camera pan
        }}
        onLoad={(mapInstance) => setMap(mapInstance)}
        onClick={handleMapClick}
      >
        {/* User Location Marker and Circles */}
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
        <MarkerClusterer
          options={{
            maxZoom: 10, // Clustering only at zoom 10 and below
          }}
          onClick={(cluster) => {
            const clusterCenter = cluster.getCenter();
            const clusterView = {
              name: "ClusterView",
              center: {
                lat: clusterCenter.lat(),
                lng: clusterCenter.lng(),
              },
              zoom: map.getZoom() + 2, // Adjust as needed
            };
            navigateToView(clusterView);
          }}
        >
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
              <h3>{selectedStation.Place || "Unnamed Station"}</h3>
              <p>{selectedStation.Address || "No address available"}</p>
            </div>
          </InfoWindow>
        )}

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
          top: "10px",
          left: "10px",
          width: "40px",
          height: "40px",
          backgroundColor: "#e7e8ec",
          color: "#000",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        📍
      </button>

      {/* Back Button */}
      <button
        onClick={goBack}
        style={{
          position: "absolute",
          top: "10px",
          left: "60px",
          width: "40px",
          height: "40px",
          backgroundColor: "#e7e8ec",
          color: "#000",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          zIndex: 1000,
          display: viewHistory.length > 1 ? "block" : "none",
        }}
      >
        ←
      </button>
    </div>
  );
};

export default MapContainer;
