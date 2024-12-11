// src/components/Map/MapContainer.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Circle,
  OverlayView,
  InfoWindow,
  Polyline,
  Marker,
} from "@react-google-maps/api";
import { FaLocationArrow } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import BackButton from "./BackButton";
import HomeButton from "./HomeButton";
import ViewBar from "./ViewBar";

import stationsData from "./stations.geojson";
import districtsData from "./districts.geojson";

import "./MapContainer.css";

// Hardcoded API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours";

// MapId
const mapId = "94527c02bbb6243";

// Libraries needed by the Google Maps instance
const libraries = ["geometry", "places"];

// Container style for the map
const containerStyle = { width: "100%", height: "100vh" };

// Views configuration
const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 11,
  tilt: 45,
  heading: 0,
};

const DISTRICT_VIEW_ZOOM = 12;
const STATION_VIEW_ZOOM_OFFSET = 2; // For StationView: MeView Zoom +2
const ME_VIEW_ZOOM = 15;
const ME_VIEW_TILT = 45;

// Circle distances in meters
const CIRCLE_DISTANCES = [500, 1000]; // meters

// Peak hours assumption
const PEAK_HOURS = [
  { start: 8, end: 10 },
  { start: 18, end: 20 },
];

// Base map styles (if any)
const BASE_STYLES = [];

// Styles for StationView to hide almost everything except the selected station
const STATION_VIEW_STYLES = [
  {
    featureType: "all",
    stylers: [{ visibility: "off" }],
  },
];

// Styles for RouteView to dim buildings and hide unnecessary info
const ROUTE_VIEW_STYLES = [
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape.man_made",
    stylers: [
      { color: "#e0e0e0" },
      { visibility: "simplified" },
      { lightness: 80 },
    ],
  },
  {
    featureType: "building",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#cccccc" }, { lightness: 80 }],
  },
];

// Check if current time is peak hour
function isPeakHour(date) {
  const hour = date.getHours();
  return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
}

// Calculate fare estimates
function calculateFare(distance, duration) {
  // distance in meters, duration in seconds
  // Approximate taxi fare logic:
  // Base fare: HK$24 for first 2km + HK$1 for each 200m beyond 2km
  const baseTaxi = 24;
  const extraMeters = Math.max(0, distance - 2000);
  const increments = Math.floor(extraMeters / 200) * 1;
  const taxiFareEstimate = baseTaxi + increments;

  // Our pricing:
  // Peak hours: starting fare = $65, off-peak = $35
  const startingFare = isPeakHour(new Date()) ? 65 : 35;
  // Aim for ~50% of taxi fare
  const target = taxiFareEstimate * 0.5;
  const ourFare = Math.max(target, startingFare);

  return { ourFare, taxiFareEstimate };
}

const MapContainer = () => {
  // State Hooks
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const [showCircles, setShowCircles] = useState(false);
  const [departureStation, setDepartureStation] = useState(null);
  const [destinationStation, setDestinationStation] = useState(null);
  const [showChooseDestinationButton, setShowChooseDestinationButton] =
    useState(false);
  const [showWalkingRouteInfo, setShowWalkingRouteInfo] = useState(false);
  const [showDrivingRouteInfo, setShowDrivingRouteInfo] = useState(false);

  const currentView = viewHistory[viewHistory.length - 1];
  const mapRef = useRef(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Load stations.geojson
  useEffect(() => {
    // Assuming stationsData is already imported
    const features = stationsData.features.map((f) => ({
      id: f.id,
      position: {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      },
      District: f.properties.District,
      place: f.properties.place,
      Address: f.properties.Address,
    }));
    setStations(features);
  }, []);

  // Load districts.geojson (if applicable)
  useEffect(() => {
    // Assuming districtsData is already imported
    const districtsProcessed = districtsData.features.map((f) => ({
      name: f.properties.District,
      position: {
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      },
    }));
    setDistricts(districtsProcessed);
  }, []);

  // Navigate to a given view
  const navigateToView = useCallback(
    (view) => {
      if (!map) return;
      setViewHistory((prevHistory) => [...prevHistory, view]);

      map.panTo(view.center);
      map.setZoom(view.zoom);
      if (view.tilt !== undefined) map.setTilt(view.tilt);
      if (view.heading !== undefined) map.setHeading(view.heading);

      // Apply styles based on the view
      if (view.name === "RouteView") {
        map.setOptions({ styles: ROUTE_VIEW_STYLES });
      } else if (view.name === "StationView") {
        map.setOptions({ styles: STATION_VIEW_STYLES });
      } else {
        map.setOptions({ styles: BASE_STYLES });
      }
    },
    [map]
  );

  // Go back to the previous view
  const goBack = useCallback(() => {
    if (viewHistory.length <= 1) return;
    const newHistory = viewHistory.slice(0, -1);
    setViewHistory(newHistory);
    const previousView = newHistory[newHistory.length - 1];
    if (!map) return;

    map.panTo(previousView.center);
    map.setZoom(previousView.zoom);
    if (previousView.tilt !== undefined) map.setTilt(previousView.tilt);
    if (previousView.heading !== undefined)
      map.setHeading(previousView.heading);

    // Apply styles based on previous view
    if (previousView.name === "RouteView") {
      map.setOptions({ styles: ROUTE_VIEW_STYLES });
    } else if (previousView.name === "StationView") {
      map.setOptions({ styles: STATION_VIEW_STYLES });
    } else {
      map.setOptions({ styles: BASE_STYLES });
    }

    // Clear selectedStation if navigating back from StationView or other views
    if (previousView.name !== "StationView") {
      setSelectedStation(null);
    }
  }, [map, viewHistory]);

  // Compute distance between user and a position (used for station filters)
  const computeDistance = useCallback(
    (pos) => {
      if (!userLocation || !window.google?.maps?.geometry?.spherical)
        return Infinity;
      const userLatLng = new window.google.maps.LatLng(
        userLocation.lat,
        userLocation.lng
      );
      const stationLatLng = new window.google.maps.LatLng(pos.lat, pos.lng);
      return window.google.maps.geometry.spherical.computeDistanceBetween(
        userLatLng,
        stationLatLng
      );
    },
    [userLocation]
  );

  // Check if we are in MeView to filter stations
  const inMeView = currentView.name === "MeView";
  const filteredStations = useMemo(() => {
    if (!inMeView || !userLocation) return stations;
    return stations.filter((st) => computeDistance(st.position) <= 1000);
  }, [inMeView, userLocation, stations, computeDistance]);

  // Handle clicking on a station marker
  const handleMarkerClick = useCallback(
    (station) => {
      if (selectedStation && selectedStation.id === station.id) {
        // Second click on the same station: navigate to StationView
        if (currentView.name === "MeView") {
          // If within 1000m, try to get walking directions
          const dist = computeDistance(station.position);
          if (dist <= 1000 && window.google?.maps?.DirectionsService) {
            const directionsService =
              new window.google.maps.DirectionsService();
            directionsService.route(
              {
                origin: userLocation,
                destination: station.position,
                travelMode: "WALKING",
              },
              (result, status) => {
                if (status === "OK") {
                  setDirections(result);
                  const stationView = {
                    name: "StationView",
                    center: station.position,
                    zoom: ME_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
                    stationName: station.place || "Unnamed Station",
                  };
                  navigateToView(stationView);
                  setShowChooseDestinationButton(true);
                } else {
                  console.error("Directions request failed:", status);
                  toast.error("Unable to compute walking route.");
                }
              }
            );
          } else {
            // Too far for walking route, just go to StationView
            setDirections(null);
            const stationView = {
              name: "StationView",
              center: station.position,
              zoom: ME_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
              stationName: station.place || "Unnamed Station",
            };
            navigateToView(stationView);
            setShowChooseDestinationButton(true);
          }
        } else if (currentView.name === "DistrictView") {
          // From DistrictView directly to StationView (no walking route)
          setDirections(null);
          const stationView = {
            name: "StationView",
            center: station.position,
            zoom: DISTRICT_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
            stationName: station.place || "Unnamed Station",
          };
          navigateToView(stationView);
          setShowChooseDestinationButton(true);
        }
      } else {
        // First tap: just select the station
        setSelectedStation(station);
      }
    },
    [
      selectedStation,
      currentView.name,
      computeDistance,
      navigateToView,
      userLocation,
    ]
  );

  // Handle map click
  const handleMapClick = useCallback(() => {
    // Do not clear selectedStation here
    // Clearing is only allowed via Back and Home buttons
    // Optionally, provide feedback or keep the selection
  }, []);

  // Locate the user
  const locateMe = useCallback(() => {
    setDirections(null);
    // Do not clear selectedStation here

    if (!map) {
      toast.error("Map not ready.");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(userPos);
          const meView = {
            name: "MeView",
            center: userPos,
            zoom: ME_VIEW_ZOOM,
            tilt: ME_VIEW_TILT,
          };
          navigateToView(meView);
          setShowCircles(true);
        },
        (error) => {
          console.error("Location error:", error);
          toast.error(
            "Unable to access your location. Please enable location services."
          );
        }
      );
    } else {
      toast.error("Geolocation not supported by your browser.");
    }
  }, [map, navigateToView]);

  // Handle Home button click
  const handleHomeClick = useCallback(() => {
    // Navigate back to CityView
    const homeView = {
      name: "CityView",
      center: CITY_VIEW.center,
      zoom: CITY_VIEW.zoom,
      tilt: CITY_VIEW.tilt,
      heading: CITY_VIEW.heading,
    };
    setViewHistory([homeView]);
    map.panTo(homeView.center);
    map.setZoom(homeView.zoom);
    if (homeView.tilt !== undefined) map.setTilt(homeView.tilt);
    if (homeView.heading !== undefined) map.setHeading(homeView.heading);
    map.setOptions({ styles: BASE_STYLES });
    setSelectedStation(null);
    setDepartureStation(null);
    setDestinationStation(null);
    setDirections(null);
    setShowChooseDestinationButton(false);
    setShowCircles(false);
  }, [map]);

  // Handle map load
  const onLoadMap = useCallback((mapInstance) => {
    console.log("Map loaded");
    setMap(mapInstance);
  }, []);

  // Invoke locateMe when map is set
  useEffect(() => {
    if (map) {
      console.log("Invoking locateMe after map is set");
      locateMe();
    }
  }, [map, locateMe]);

  // District overlays in CityView
  const districtOverlays = useMemo(() => {
    if (currentView.name !== "CityView") return null;
    return districts.map((d) => {
      const handleDistrictClick = () => {
        const dv = {
          name: "DistrictView",
          center: d.position,
          zoom: DISTRICT_VIEW_ZOOM,
          districtName: d.name,
        };
        navigateToView(dv);
      };

      return (
        <Marker
          key={d.name}
          position={d.position}
          onClick={handleDistrictClick}
          icon={{
            url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: { width: 24, height: 24 }, // Increased size for visibility
          }}
        />
      );
    });
  }, [currentView.name, districts, navigateToView]);

  // Station overlays in MeView or DistrictView
  const stationOverlays = useMemo(() => {
    if (currentView.name !== "MeView" && currentView.name !== "DistrictView")
      return null;
    return filteredStations.map((station) => {
      const handleClick = () => handleMarkerClick(station);
      const isSelected = selectedStation && selectedStation.id === station.id;
      return (
        <Marker
          key={station.id}
          position={station.position}
          onClick={handleClick}
          icon={{
            url: isSelected
              ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
              : "https://maps.google.com/mapfiles/ms/icons/green-dot.png", // Changed to green for better visibility
            scaledSize: { width: 24, height: 24 }, // Increased size for visibility
          }}
        />
      );
    });
  }, [currentView.name, filteredStations, selectedStation, handleMarkerClick]);

  // User arrow overlay
  const userOverlay = useMemo(() => {
    if (!userLocation) return null;
    let tilt = currentView.tilt || 0;
    const arrowRotation = 180 - (tilt / 65) * 30;
    return (
      <OverlayView
        position={userLocation}
        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "20px solid #2171ec",
            transform: `rotate(${arrowRotation}deg)`,
            transformOrigin: "center",
          }}
        ></div>
      </OverlayView>
    );
  }, [userLocation, currentView.tilt]);

  // Get label position for radius circles
  const getCircleLabelPosition = useCallback((center, radius) => {
    const latOffset = radius * 0.000009; // Approx conversion of meters to lat offset
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  // Handle "Choose your destination" button click
  const handleChooseDestinationClick = useCallback(() => {
    if (selectedStation) {
      setDepartureStation(selectedStation);
    }
    setDestinationStation(null);
    setSelectedStation(null);
    setDirections(null);
    setShowChooseDestinationButton(false);
    // Prompt user to select a destination from CityView
    navigateToView(CITY_VIEW);
  }, [selectedStation, navigateToView]);

  // If we are in DriveView and have directions + stations, compute fare info
  let fareInfo = null;
  if (
    currentView.name === "DriveView" &&
    directions &&
    departureStation &&
    destinationStation
  ) {
    const route = directions.routes[0].legs[0];
    const dist = route.distance.value; // meters
    const dur = route.duration.value; // seconds
    const { ourFare, taxiFareEstimate } = calculateFare(dist, dur);
    fareInfo = { ourFare, taxiFareEstimate, time: route.duration.text };
  }

  // Directions Renderer options
  const directionsOptions = useMemo(() => {
    return {
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#276ef1",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      },
    };
  }, []);

  // Handle route click (to show info windows)
  const handleRouteClick = useCallback(() => {
    if (currentView.name === "RouteView") {
      setShowWalkingRouteInfo(true);
    } else if (currentView.name === "DriveView") {
      setShowDrivingRouteInfo(true);
    }
  }, [currentView.name]);

  // Gesture Handling Logic
  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    let isInteracting = false;
    let lastX = 0;
    let lastY = 0;
    let animationFrameId = null;

    const handlePointerDown = (e) => {
      isInteracting = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handlePointerMove = (e) => {
      if (!isInteracting) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      // Throttle updates using requestAnimationFrame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const currentTilt = map.getTilt() || 0;
        const currentHeading = map.getHeading() || 0;

        let newTilt = currentTilt + dy * 0.1;
        newTilt = Math.max(0, Math.min(67.5, newTilt)); // Limit tilt between 0 and 67.5 degrees

        let newHeading = currentHeading + dx * 0.5;
        newHeading = (newHeading + 360) % 360; // Normalize heading between 0-360

        map.setOptions({
          tilt: newTilt,
          heading: newHeading,
        });
      });
    };

    const handlePointerUp = () => {
      isInteracting = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    // Add event listeners
    mapDiv.addEventListener("pointerdown", handlePointerDown, {
      passive: false,
    });
    mapDiv.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    mapDiv.addEventListener("pointerup", handlePointerUp, { passive: false });
    mapDiv.addEventListener("pointercancel", handlePointerUp, {
      passive: false,
    });
    mapDiv.addEventListener("pointerleave", handlePointerUp, {
      passive: false,
    });

    // Cleanup event listeners on unmount
    return () => {
      mapDiv.removeEventListener("pointerdown", handlePointerDown);
      mapDiv.removeEventListener("pointermove", handlePointerMove);
      mapDiv.removeEventListener("pointerup", handlePointerUp);
      mapDiv.removeEventListener("pointercancel", handlePointerUp);
      mapDiv.removeEventListener("pointerleave", handlePointerUp);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [map]);

  // Check for load errors
  if (loadError) {
    return (
      <div>
        Error loading maps. Please check your API key and network connection.
      </div>
    );
  }

  // If not loaded yet, show a loading message
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  // Determine if we should show the "Choose your destination" button
  const showChooseDestination =
    currentView.name === "StationView" && showChooseDestinationButton;

  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%", height: "100vh" }}
      ref={mapRef}
    >
      {/* ToastContainer for toast notifications */}
      <ToastContainer />

      {/* Top Bar with Back and Home Buttons and ViewBar */}
      <div className="top-bar">
        {/* Back Button */}
        {viewHistory.length > 1 && <BackButton onClick={goBack} />}

        {/* Home Button */}
        <HomeButton onClick={handleHomeClick} />

        {/* ViewBar */}
        <ViewBar
          stationName={
            selectedStation ? selectedStation.place : "Unnamed Station"
          }
        />
      </div>

      {/* "Choose your destination" Button */}
      {showChooseDestination && (
        <div
          onClick={handleChooseDestinationClick}
          className="choose-destination-button"
        >
          💚 Choose your destination
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: mapId, // Reintroduced mapId for custom styling
          tilt: currentView.tilt || 45,
          heading: currentView.heading || 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: currentView.name === "StationView" ? "none" : "auto", // Conditional gesture handling
          rotateControl: true,
          minZoom: 10,
          draggable: currentView.name !== "StationView",
          styles:
            currentView.name === "RouteView"
              ? ROUTE_VIEW_STYLES
              : currentView.name === "StationView"
              ? STATION_VIEW_STYLES
              : BASE_STYLES,
        }}
        onLoad={onLoadMap}
        onClick={handleMapClick}
      >
        {/* User Location Circles */}
        {userLocation &&
          showCircles &&
          CIRCLE_DISTANCES.map((dist) => (
            <React.Fragment key={dist}>
              <Circle
                center={userLocation}
                radius={dist}
                options={{
                  strokeColor: "#2171ec",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillOpacity: 0,
                }}
              />
              <OverlayView
                position={getCircleLabelPosition(userLocation, dist)}
                mapPaneName={OverlayView.OVERLAY_LAYER}
              >
                <div className="circle-label">
                  {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                </div>
              </OverlayView>
            </React.Fragment>
          ))}

        {/* District Overlays (in CityView) */}
        {districtOverlays}

        {/* Station Overlays (in MeView or DistrictView) */}
        {stationOverlays}

        {/* User Arrow Overlay */}
        {userOverlay}

        {/* Directions Renderer */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={directionsOptions}
          />
        )}

        {/* Custom Polylines for Route Click Handling (to show route info) */}
        {directions &&
          directions.routes.map((route, routeIndex) =>
            route.legs.map((leg, legIndex) =>
              leg.steps.map((step, stepIndex) =>
                step.path.map((path, pathIndex) => (
                  <Polyline
                    key={`${routeIndex}-${legIndex}-${stepIndex}-${pathIndex}`}
                    path={step.path}
                    options={{
                      strokeColor: "#276ef1",
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                    }}
                    onClick={handleRouteClick}
                  />
                ))
              )
            )
          )}

        {/* Walking Route Info (on RouteView) */}
        {showWalkingRouteInfo && currentView.name === "RouteView" && (
          <InfoWindow
            position={selectedStation?.position}
            onCloseClick={() => setShowWalkingRouteInfo(false)}
          >
            <div className="info-window">
              <h3>Walking Route Info</h3>
              <p>
                Estimated walking time:{" "}
                {directions?.routes[0]?.legs[0]?.duration.text}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Driving Route Info (on DriveView) */}
        {showDrivingRouteInfo &&
          currentView.name === "DriveView" &&
          fareInfo && (
            <InfoWindow
              position={destinationStation?.position}
              onCloseClick={() => setShowDrivingRouteInfo(false)}
            >
              <div className="info-window">
                <h3>Driving Route Info</h3>
                <p>Estimated driving time: {fareInfo.time}</p>
                <p>Fare: HK${fareInfo.ourFare.toFixed(2)}</p>
                <p>
                  (Taxi Estimate: HK${fareInfo.taxiFareEstimate.toFixed(2)})
                </p>
              </div>
            </InfoWindow>
          )}
      </GoogleMap>

      {/* Locate Me Button */}
      <div
        className="locate-me-button"
        onClick={locateMe}
        aria-label="Locate me"
      >
        <FaLocationArrow />
      </div>
    </div>
  );
};

export default MapContainer;
