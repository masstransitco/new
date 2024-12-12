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
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { FaLocationArrow } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import BackButton from "./BackButton";
import HomeButton from "./HomeButton";
import ViewBar from "./ViewBar";
import MotionMenu from "./src/components/Menu/MotionMenu"; // Ensure this component exists and is correctly implemented

import "./MapContainer.css";

// **Note:** Use environment variables for API keys in production.
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours";

// MapId
const mapId = "94527c02bbb6243";

// Libraries needed by the Google Maps instance
const libraries = ["geometry", "places"];

// Container style for the map
const containerStyle = { width: "100%", height: "100vh" };

// Base city center coordinates (e.g., Hong Kong)
const BASE_CITY_CENTER = { lat: 22.236, lng: 114.191 };

// Views configuration
const CITY_VIEW = {
  name: "CityView",
  center: BASE_CITY_CENTER,
  zoom: 11,
  tilt: 45,
  heading: 0,
};

const DISTRICT_VIEW_ZOOM = 12; // Base zoom for DistrictView
const DISTRICT_VIEW_ZOOM_ADJUSTED = DISTRICT_VIEW_ZOOM + 2; // +2 levels

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

// **User States**
const USER_STATES = {
  SELECTING_DEPARTURE: "SelectingDeparture",
  SELECTING_ARRIVAL: "SelectingArrival",
  DISPLAY_FARE: "DisplayFare",
};

const MapContainer = () => {
  // State Hooks
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const [showCircles, setShowCircles] = useState(false);
  const [departureStation, setDepartureStation] = useState(null);
  const [destinationStation, setDestinationStation] = useState(null);
  const [fareInfo, setFareInfo] = useState(null);
  const [userState, setUserState] = useState(USER_STATES.SELECTING_DEPARTURE);
  const [viewBarText, setViewBarText] = useState("Hong Kong"); // Default to "Hong Kong"
  const [showWalkingRouteInfo, setShowWalkingRouteInfo] = useState(false);
  const [showDrivingRouteInfo, setShowDrivingRouteInfo] = useState(false);

  const currentView = viewHistory[viewHistory.length - 1];
  const mapRef = useRef(null);

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Fetch stations.geojson from public directory
  useEffect(() => {
    fetch("/stations.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch stations.geojson");
        }
        return response.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.features)) {
          const features = data.features.map((f) => ({
            id:
              f.id ||
              `${f.properties.place}-${f.geometry.coordinates[0]}-${f.geometry.coordinates[1]}`,
            position: {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            },
            District: f.properties.District,
            place: f.properties.place,
            Address: f.properties.Address,
          }));
          setStations(features);
        } else {
          console.error(
            "stations.geojson does not contain a valid 'features' array."
          );
          setStations([]); // Prevents 'undefined' by setting to empty array
        }
      })
      .catch((error) => {
        console.error("Error fetching stations.geojson:", error);
        toast.error("Failed to load station data.");
        setStations([]); // Prevents 'undefined' by setting to empty array
      });
  }, []);

  // Fetch districts.geojson from public directory
  useEffect(() => {
    fetch("/districts.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch districts.geojson");
        }
        return response.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.features)) {
          const districtsProcessed = data.features.map((f) => ({
            name: f.properties.District,
            position: {
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0],
            },
          }));
          setDistricts(districtsProcessed);
        } else {
          console.error(
            "districts.geojson does not contain a valid 'features' array."
          );
          setDistricts([]); // Prevents 'undefined' by setting to empty array
        }
      })
      .catch((error) => {
        console.error("Error fetching districts.geojson:", error);
        toast.error("Failed to load district data.");
        setDistricts([]); // Prevents 'undefined' by setting to empty array
      });
  }, []);

  // **Navigate to a given view**
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

  // **Go back to the previous view**
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

    // **Updated ViewBar Display Based on View**
    if (previousView.name === "CityView") {
      // Display "Hong Kong" in ViewBar
      setViewBarText("Hong Kong");
      setUserState(USER_STATES.SELECTING_DEPARTURE); // Reset to selecting departure if returning to CityView
    } else if (previousView.name === "DistrictView") {
      // Display selected district name in ViewBar
      setViewBarText(previousView.districtName || "District");
      setUserState(USER_STATES.SELECTING_DEPARTURE); // Ensure state remains selecting departure
    } else if (previousView.name === "StationView") {
      // When going back to StationView, maintain current userState
      // No action needed
    } else {
      // Default or other views
      setViewBarText("");
    }

    // Clear selected stations if navigating back from StationView or other views
    if (previousView.name !== "StationView") {
      setDepartureStation(null);
      setDestinationStation(null);
      setDirections(null);
      setFareInfo(null);
    }
  }, [map, viewHistory]);

  // **Handle station selection based on user state**
  const handleStationSelection = useCallback(
    (station) => {
      if (userState === USER_STATES.SELECTING_DEPARTURE) {
        setDepartureStation(station);
        setViewBarText(`Departure: ${station.place}`);
        map.panTo(station.position);
        map.setZoom(18);
        map.setTilt(65);
        toast.success(`Set departure to ${station.place}`);
        setUserState(USER_STATES.SELECTING_ARRIVAL);
      } else if (userState === USER_STATES.SELECTING_ARRIVAL) {
        setDestinationStation(station);
        setViewBarText(`Arrival: ${station.place}`);
        toast.success(`Set arrival to ${station.place}`);
        setUserState(USER_STATES.DISPLAY_FARE);
      }
    },
    [userState, map]
  );

  // **Navigate to RouteView and set tilt appropriately**
  const navigateToRouteView = useCallback(() => {
    if (!map) return;
    map.setTilt(65); // Try setting the tilt to 65
    const currentTilt = map.getTilt() || 0;
    if (currentTilt > 65) {
      map.setTilt(45); // Fall back to 45 if 65 exceeds max tilt
    }
    const routeView = {
      name: "RouteView",
      center: departureStation.position, // Assuming departureStation is defined
      zoom: 15,
      tilt: map.getTilt(),
      heading: map.getHeading(),
    };
    navigateToView(routeView);
  }, [map, navigateToView, departureStation]);

  // **Handle "Choose Destination" button click**
  const handleChooseDestination = () => {
    setViewBarText("Choose your destination");
    setUserState(USER_STATES.SELECTING_ARRIVAL);
  };

  // **Compute fare once both departure and arrival are selected**
  useEffect(() => {
    if (departureStation && destinationStation) {
      // Fetch directions between departure and arrival
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: departureStation.position,
          destination: destinationStation.position,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            // Compute fare based on distance and duration
            const route = result.routes[0].legs[0];
            const distance = route.distance.value; // in meters
            const duration = route.duration.value; // in seconds
            const fare = calculateFare(distance, duration);
            setFareInfo(fare);
          } else {
            console.error(`error fetching directions ${result}`);
            toast.error("Failed to fetch directions.");
          }
        }
      );
    }
  }, [departureStation, destinationStation]);

  // **Fare Calculation Function**
  const calculateFare = (distance, duration) => {
    // distance in meters, duration in seconds
    // Base fare: HK$24 for first 2km + HK$1 for each 200m beyond 2km
    const baseTaxi = 24;
    const extraMeters = Math.max(0, distance - 2000);
    const increments = Math.floor(extraMeters / 200) * 1;
    const taxiFareEstimate = baseTaxi + increments;

    // Our pricing:
    // Peak hours: starting fare = $65, off-peak = $35
    const isPeak = isPeakHour(new Date());
    const startingFare = isPeak ? 65 : 35;
    // Aim for ~50% of taxi fare
    const ourFare = Math.max(taxiFareEstimate * 0.5, startingFare);

    return { ourFare, taxiFareEstimate };
  };

  // **Check if current time is peak hour**
  const isPeakHour = (date) => {
    const hour = date.getHours();
    return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
  };

  // **Locate the user**
  const locateMe = useCallback(() => {
    setDirections(null);
    setFareInfo(null);
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
          setViewBarText("You are here");
          toast.success("Located you successfully!");
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

  // **Handle Home button click**
  const handleHomeClick = useCallback(() => {
    const homeView = {
      name: "CityView",
      center: BASE_CITY_CENTER,
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
    setDepartureStation(null);
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
    setShowCircles(false);
    setViewBarText("Hong Kong");
    setUserState(USER_STATES.SELECTING_DEPARTURE); // Reset to selecting departure on Home
  }, [map]);

  // **Handle map load**
  const onLoadMap = useCallback((mapInstance) => {
    console.log("Map loaded");
    setMap(mapInstance);
  }, []);

  // **Invoke locateMe when map is set**
  useEffect(() => {
    if (map) {
      console.log("Invoking locateMe after map is set");
      locateMe();
    }
  }, [map, locateMe]);

  // **Compute distance between user and a position (used for station filters)**
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

  // **Check if we are in MeView to filter stations**
  const inMeView = currentView.name === "MeView";
  const filteredStations = useMemo(() => {
    if (!inMeView || !userLocation) return stations;
    return stations.filter((st) => computeDistance(st.position) <= 1000);
  }, [inMeView, userLocation, stations, computeDistance]);

  // **District overlays in CityView**
  const districtOverlays = useMemo(() => {
    if (currentView.name !== "CityView") return null;
    return districts.map((d) => {
      const handleDistrictClick = () => {
        const dv = {
          name: "DistrictView",
          center: d.position,
          zoom: DISTRICT_VIEW_ZOOM_ADJUSTED,
          districtName: d.name,
        };
        navigateToView(dv);
        setViewBarText(d.name || "District");
        setUserState(USER_STATES.SELECTING_DEPARTURE); // Ensure state remains selecting departure
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

  // **Station overlays in MeView or DistrictView**
  const stationOverlays = useMemo(() => {
    if (currentView.name !== "MeView" && currentView.name !== "DistrictView")
      return null;
    return filteredStations.map((station) => {
      const handleClick = () => handleStationSelection(station);
      const isSelected =
        (departureStation && departureStation.id === station.id) ||
        (destinationStation && destinationStation.id === station.id);
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
  }, [
    currentView.name,
    filteredStations,
    departureStation,
    destinationStation,
    handleStationSelection,
  ]);

  // **User arrow overlay**
  const userOverlay = useMemo(() => {
    if (!userLocation) return null;

    const arrowRotation = map?.getHeading() || 0; // Rotate based on map heading
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
            borderTop: "20px solid #2171ec", // Adjusted color for visibility
            transform: `rotate(${arrowRotation}deg)`,
            transformOrigin: "center",
            zIndex: 10, // Ensure it's above other overlays
          }}
        />
      </OverlayView>
    );
  }, [userLocation, currentView.tilt]);

  // **Get label position for radius circles**
  const getCircleLabelPosition = useCallback((center, radius) => {
    const latOffset = radius * 0.000009; // Approx conversion of meters to lat offset
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  // **Directions Renderer options**
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

  // **Handle route click (to show info windows)**
  const handleRouteClick = useCallback(() => {
    if (currentView.name === "RouteView") {
      setShowWalkingRouteInfo(true);
    } else if (currentView.name === "DriveView") {
      setShowDrivingRouteInfo(true);
    }
  }, [currentView.name]);

  // **Gesture Handling Logic**
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

  // **Check for load errors**
  if (loadError) {
    return (
      <div>
        Error loading maps. Please check your API key and network connection.
      </div>
    );
  }

  // **If not loaded yet, show a loading message**
  if (!isLoaded) {
    return <div>Loading...</div>;
  }

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

        {/* ViewBar with Dynamic Text and Locate Me Button */}
        <ViewBar
          departure={departureStation?.place}
          arrival={destinationStation?.place}
          onLocateMe={locateMe}
          viewBarText={viewBarText}
        />
      </div>

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
          gestureHandling: "none", // **Disabled all default gesture handling**
          rotateControl: false, // Optionally disable rotate control if not needed
          minZoom: 10,
          draggable: false, // **Disabled dragging to rely on custom gestures**
          scrollwheel: false, // **Disabled scrollwheel zooming**
          disableDoubleClickZoom: true, // **Disabled double-click zooming**
          styles:
            currentView.name === "RouteView"
              ? ROUTE_VIEW_STYLES
              : currentView.name === "StationView"
              ? STATION_VIEW_STYLES
              : BASE_STYLES,
        }}
        onLoad={onLoadMap}
        onClick={() => {
          /* Optionally handle map clicks */
        }}
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

        {/* Polyline for Clickable Route */}
        {directions &&
          directions.routes.map((route, routeIndex) =>
            route.legs.map((leg, legIndex) =>
              leg.steps.map((step, stepIndex) => (
                <Polyline
                  key={`${routeIndex}-${legIndex}-${stepIndex}`}
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
          )}

        {/* Fare Info Window */}
        {fareInfo && userState === USER_STATES.DISPLAY_FARE && (
          <InfoWindow
            position={destinationStation.position}
            onCloseClick={() => setFareInfo(null)}
          >
            <div className="info-window">
              <h3>Fare Information</h3>
              <p>
                Estimated driving time:{" "}
                {directions.routes[0].legs[0].duration.text}
              </p>
              <p>Fare: HK${fareInfo.ourFare.toFixed(2)}</p>
              <p>(Taxi Estimate: HK${fareInfo.taxiFareEstimate.toFixed(2)})</p>
            </div>
          </InfoWindow>
        )}

        {/* Walking Route Info Window */}
        {showWalkingRouteInfo && currentView.name === "RouteView" && (
          <InfoWindow
            position={departureStation.position}
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

        {/* Driving Route Info Window */}
        {showDrivingRouteInfo && currentView.name === "DriveView" && (
          <InfoWindow
            position={destinationStation.position}
            onCloseClick={() => setShowDrivingRouteInfo(false)}
          >
            <div className="info-window">
              <h3>Driving Route Info</h3>
              <p>
                Estimated driving time:{" "}
                {directions?.routes[0]?.legs[0]?.duration.text}
              </p>
              <p>Fare: HK${fareInfo?.ourFare.toFixed(2)}</p>
              <p>(Taxi Estimate: HK${fareInfo?.taxiFareEstimate.toFixed(2)})</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Render "Choose Destination" button */}
      {departureStation && !destinationStation && (
        <div className="choose-destination-button">
          <button onClick={handleChooseDestination}>Choose Destination</button>
        </div>
      )}

      {/* MotionMenu for displaying fare information */}
      <MotionMenu fareInfo={fareInfo} />
    </div>
  );
};

export default MapContainer;
