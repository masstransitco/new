// src/components/Map/MapContainer.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Polyline,
} from "@react-google-maps/api";

import ViewBar from "./ViewBar";
import MotionMenu from "../Menu/MotionMenu";
import FareInfoWindow from "./FareInfoWindow";
import RouteInfoWindow from "./RouteInfoWindow";
import UserOverlay from "./UserOverlay";
import UserCircles from "./UserCircles";
import DistrictMarkers from "./DistrictMarkers";
import StationMarkers from "./StationMarkers";

import useFetchGeoJSON from "../../hooks/useFetchGeoJSON";
import useMapGestures from "../../hooks/useMapGestures";

import "./MapContainer.css";

// **Note:** Use environment variables for API keys in production.
// Keeping the API key hardcoded as per your request.
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours";

// MapId for custom styling
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
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const [showCircles, setShowCircles] = useState(false);
  const [departureStation, setDepartureStation] = useState(null);
  const [destinationStation, setDestinationStation] = useState(null);
  const [fareInfo, setFareInfo] = useState(null);
  const [userState, setUserState] = useState(USER_STATES.SELECTING_DEPARTURE);
  const [viewBarText, setViewBarText] = useState("Hong Kong"); // Default to "Hong Kong"
  const [routeInfo, setRouteInfo] = useState(null);

  const currentView = viewHistory[viewHistory.length - 1];

  // Load Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // **Fetch GeoJSON Data**
  const {
    data: stationsData,
    loading: stationsLoading,
    error: stationsError,
  } = useFetchGeoJSON("/stations.geojson");

  const {
    data: districtsData,
    loading: districtsLoading,
    error: districtsError,
  } = useFetchGeoJSON("/districts.geojson");

  // **Parse and Transform Stations Data**
  const stations = useMemo(() => {
    return stationsData.map((feature) => ({
      id: feature.id,
      place: feature.properties.Place,
      address: feature.properties.Address,
      position: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
      district: feature.properties.District,
    }));
  }, [stationsData]);

  // **Parse and Transform Districts Data**
  const districts = useMemo(() => {
    return districtsData.map((feature) => ({
      id: feature.id,
      name: feature.properties.District,
      position: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
      description: feature.properties.Description,
    }));
  }, [districtsData]);

  // **Apply Gesture Handling Hook**
  useMapGestures(map);

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

      // Update ViewBar text based on view
      if (view.name === "CityView") {
        setViewBarText("Hong Kong");
      } else if (view.name === "DistrictView") {
        setViewBarText(view.districtName || "District");
      } else if (view.name === "StationView") {
        setViewBarText("Near Me");
      } else if (view.name === "MeView") {
        setViewBarText("Near Me");
      }
    },
    [map]
  );

  // **Navigate to RouteView and set tilt appropriately**
  const navigateToRouteView = useCallback(() => {
    if (!map || !departureStation) return;

    const routeView = {
      name: "RouteView",
      center: departureStation.position,
      zoom: 15,
      tilt: 45,
      heading: 0,
    };
    navigateToView(routeView);
  }, [map, navigateToView, departureStation]);

  // **Handle station selection based on user state**
  const handleStationSelection = useCallback(
    (station) => {
      if (userState === USER_STATES.SELECTING_DEPARTURE) {
        setDepartureStation(station);
        setViewBarText(`Departure: ${station.place}`);
        map.panTo(station.position);
        map.setZoom(18);
        map.setTilt(65);
        setUserState(USER_STATES.SELECTING_ARRIVAL);
      } else if (userState === USER_STATES.SELECTING_ARRIVAL) {
        setDestinationStation(station);
        setViewBarText(`Arrival: ${station.place}`);
        setUserState(USER_STATES.DISPLAY_FARE);

        // **Invoke navigateToRouteView after setting arrival station**
        navigateToRouteView();
      }
    },
    [userState, map, navigateToRouteView]
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

  // **Handle "Choose Destination" button click**
  const handleChooseDestination = () => {
    const cityView = {
      name: "CityView",
      center: BASE_CITY_CENTER,
      zoom: CITY_VIEW.zoom,
      tilt: CITY_VIEW.tilt,
      heading: CITY_VIEW.heading,
    };
    navigateToView(cityView);
    setUserState(USER_STATES.SELECTING_ARRIVAL);
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
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
            const duration = route.duration.text; // formatted text
            const fare = calculateFare(distance, duration);
            setFareInfo(fare);
          } else {
            console.error(`Error fetching directions: ${result}`);
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
      console.error("Map not ready.");
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
            zoom: 15,
            tilt: 45,
          };
          navigateToView(meView);
          setShowCircles(true);
          setViewBarText("Near Me");
        },
        (error) => {
          console.error(
            "Unable to access your location. Please enable location services.",
            error
          );
        }
      );
    } else {
      console.error("Geolocation not supported by your browser.");
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

  // **Handle Clear Departure Selection**
  const handleClearDeparture = () => {
    setDepartureStation(null);
    setDirections(null);
    setFareInfo(null);
    setViewBarText("Hong Kong");
    setUserState(USER_STATES.SELECTING_DEPARTURE);
  };

  // **Handle Clear Arrival Selection**
  const handleClearArrival = () => {
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
    setViewBarText(
      departureStation ? `Departure: ${departureStation.place}` : "Hong Kong"
    );
    setUserState(USER_STATES.SELECTING_ARRIVAL);
  };

  // **Handle district click**
  const handleDistrictClick = useCallback(
    (district) => {
      const districtView = {
        name: "DistrictView",
        center: district.position,
        zoom: 14, // Adjusted zoom level for district view
        districtName: district.name,
      };
      navigateToView(districtView);
      setViewBarText(district.name || "District");
      setUserState(USER_STATES.SELECTING_DEPARTURE); // Ensure state remains selecting departure
    },
    [navigateToView]
  );

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
      setRouteInfo({
        title: "Walking Route Info",
        description: `Estimated walking time: ${directions?.routes[0]?.legs[0]?.duration.text}`,
        position: departureStation.position,
      });
    } else if (currentView.name === "DriveView") {
      setRouteInfo({
        title: "Driving Route Info",
        description: `Estimated driving time: ${
          directions?.routes[0]?.legs[0]?.duration.text
        }. Fare: HK$${fareInfo?.ourFare.toFixed(
          2
        )} (Taxi Estimate: HK$${fareInfo?.taxiFareEstimate.toFixed(2)})`,
        position: destinationStation.position,
      });
    }
  }, [
    currentView.name,
    directions,
    fareInfo,
    departureStation,
    destinationStation,
  ]);

  // **Loading and Error States for Data Fetching**
  if (loadError) {
    return (
      <div className="error-message">
        Error loading maps. Please check your API key and network connection.
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="loading-message">Loading map...</div>;
  }

  if (stationsLoading || districtsLoading) {
    return <div className="loading-message">Loading map data...</div>;
  }

  if (stationsError || districtsError) {
    return (
      <div className="error-message">
        Error loading map data. Please try again later.
      </div>
    );
  }

  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%", height: "100vh" }}
    >
      {/* ViewBar with Back and Home Buttons */}
      <ViewBar
        departure={departureStation?.place}
        arrival={destinationStation?.place}
        onLocateMe={locateMe}
        viewBarText={viewBarText}
        onClearDeparture={handleClearDeparture}
        onClearArrival={handleClearArrival}
        showChooseDestination={
          departureStation &&
          !destinationStation &&
          userState !== USER_STATES.SELECTING_ARRIVAL
        }
        onChooseDestination={handleChooseDestination}
        onBack={goBack} // Pass goBack function to ViewBar
        onHome={handleHomeClick} // Pass handleHomeClick function to ViewBar
        isCityView={currentView.name === "CityView"} // Pass isCityView flag to ViewBar
      />

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
        {userLocation && showCircles && (
          <UserCircles
            userLocation={userLocation}
            distances={CIRCLE_DISTANCES}
            getLabelPosition={getCircleLabelPosition}
          />
        )}

        {/* District Overlays (in CityView) */}
        {currentView.name === "CityView" && (
          <DistrictMarkers
            districts={districts}
            onDistrictClick={handleDistrictClick}
          />
        )}

        {/* Station Overlays (in MeView or DistrictView) */}
        {(currentView.name === "MeView" ||
          currentView.name === "DistrictView") && (
          <StationMarkers
            stations={filteredStations}
            onStationClick={handleStationSelection}
            selectedStations={{
              departure: departureStation,
              destination: destinationStation,
            }}
          />
        )}

        {/* User Arrow Overlay */}
        {userLocation && (
          <UserOverlay
            userLocation={userLocation}
            mapHeading={map?.getHeading() || 0}
          />
        )}

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
        {fareInfo &&
          userState === USER_STATES.DISPLAY_FARE &&
          destinationStation && (
            <FareInfoWindow
              position={destinationStation.position}
              fareInfo={{
                duration: directions.routes[0].legs[0].duration.text,
                ourFare: fareInfo.ourFare,
                taxiFareEstimate: fareInfo.taxiFareEstimate,
              }}
              onClose={() => setFareInfo(null)}
            />
          )}

        {/* Route Info Window */}
        {routeInfo && (
          <RouteInfoWindow
            position={routeInfo.position}
            title={routeInfo.title}
            description={routeInfo.description}
            onClose={() => setRouteInfo(null)}
          />
        )}
      </GoogleMap>

      {/* MotionMenu for displaying fare information */}
      <MotionMenu fareInfo={fareInfo} />
    </div>
  );
};

export default MapContainer;
