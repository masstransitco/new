// src/components/Map/MapContainer.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import UserCircles from "./UserCircles";

import useFetchGeoJSON from "../../hooks/useFetchGeoJSON";
import useMapGestures from "../../hooks/useMapGestures";

import "./MapContainer.css";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import ThreeJSOverlayView from "../../threejs/ThreeJSOverlayView";

// **Note:** Use environment variables for API keys in production.
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours"; // Replace with your actual API key or set it in .env

const mapId = "15431d2b469f209e"; // Your predefined mapId with styles from Google Console
const libraries = ["geometry", "places"];
const containerStyle = { width: "100%", height: "100vh" };
const BASE_CITY_CENTER = { lat: 22.236, lng: 114.191 };
const CITY_VIEW = {
  name: "CityView",
  center: BASE_CITY_CENTER,
  zoom: 11,
  tilt: 45,
  heading: 0,
};
const STATION_VIEW_ZOOM = 18; // Defined zoom level for StationView
const CIRCLE_DISTANCES = [500, 1000]; // meters
const PEAK_HOURS = [
  { start: 8, end: 10 },
  { start: 18, end: 20 },
];

const USER_STATES = {
  SELECTING_DEPARTURE: "SelectingDeparture",
  SELECTING_ARRIVAL: "SelectingArrival",
  DISPLAY_FARE: "DisplayFare",
};

const MapContainer = ({ onStationSelect, onStationDeselect }) => {
  // -------------------
  // **State Hooks**
  // -------------------
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const [showCircles, setShowCircles] = useState(false);
  const [departureStation, setDepartureStation] = useState(null);
  const [destinationStation, setDestinationStation] = useState(null);
  const [fareInfo, setFareInfo] = useState(null);
  const [userState, setUserState] = useState(USER_STATES.SELECTING_DEPARTURE);
  const [viewBarText, setViewBarText] = useState("Stations near me");
  const [routeInfo, setRouteInfo] = useState(null);

  const currentView = viewHistory[viewHistory.length - 1];

  // -------------------
  // **Refs**
  // -------------------
  const threeOverlayRef = useRef(null);

  // -------------------
  // **Google Maps API Loader**
  // -------------------
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    version: "weekly", // Use a stable version
  });

  // -------------------
  // **Fetch GeoJSON Data**
  // -------------------
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

  // -------------------
  // **Parse and Transform Data**
  // -------------------
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

  // -------------------
  // **Apply Gesture Handling Hook**
  // -------------------
  useMapGestures(map);

  // -------------------
  // **Utility Functions**
  // -------------------

  /**
   * Checks if the current time is within peak hours.
   * @param {Date} date - The current date and time.
   * @returns {boolean} - True if peak hour, else false.
   */
  const isPeakHour = useCallback((date) => {
    const hour = date.getHours();
    return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
  }, []);

  /**
   * Calculates fare based on distance and duration.
   * @param {number} distance - Distance in meters.
   * @param {number} durationInSeconds - Duration in seconds.
   * @returns {Object} - Contains ourFare, taxiFareEstimate, distanceKm, estTime.
   */
  const calculateFare = useCallback(
    (distance, durationInSeconds) => {
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

      // Calculate distanceKm and estTime for ViewBar
      const distanceKm = (distance / 1000).toFixed(2);
      const estTime = `${Math.floor(durationInSeconds / 3600)} hr ${Math.floor(
        (durationInSeconds % 3600) / 60
      )} mins`;

      return { ourFare, taxiFareEstimate, distanceKm, estTime };
    },
    [isPeakHour]
  );

  // -------------------
  // **Navigate to a Given View**
  // -------------------
  const navigateToView = useCallback(
    (view) => {
      if (!map) return;

      setViewHistory((prevHistory) => [...prevHistory, view]);

      map.panTo(view.center);
      map.setZoom(view.zoom);
      if (view.tilt !== undefined) map.setTilt(view.tilt);
      if (view.heading !== undefined) map.setHeading(view.heading);

      // **Removed custom styles application**
      // Since styles are managed via mapId, no need to set styles here

      // Update ViewBar text based on view
      if (view.name === "CityView") {
        setViewBarText("Hong Kong");
      } else if (view.name === "DistrictView") {
        setViewBarText(view.districtName || "District");
      } else if (view.name === "StationView") {
        setViewBarText(view.districtName || "Station");
      } else if (view.name === "MeView") {
        setViewBarText("Stations near me");
      } else if (view.name === "DriveView") {
        // Update with distance and estimated time if needed
        setViewBarText("Driving to destination");
      }
    },
    [map]
  );

  // -------------------
  // **Handle Home Button Click**
  // -------------------
  const handleHomeClick = useCallback(() => {
    const homeView = {
      name: "CityView",
      center: BASE_CITY_CENTER,
      zoom: CITY_VIEW.zoom,
      tilt: CITY_VIEW.tilt,
      heading: CITY_VIEW.heading,
    };
    navigateToView(homeView);
    setDepartureStation(null);
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
    setShowCircles(false);
    setViewBarText("Hong Kong");
    setUserState(USER_STATES.SELECTING_DEPARTURE);

    // Inform App.jsx to hide SceneContainer
    if (onStationDeselect) {
      onStationDeselect();
    }

    // Remove all 3D overlays
    if (threeOverlayRef.current) {
      threeOverlayRef.current.clearLabels();
      threeOverlayRef.current.clearModels();
    }
  }, [
    navigateToView,
    onStationDeselect,
    threeOverlayRef,
    setDepartureStation,
    setDestinationStation,
    setDirections,
    setFareInfo,
    setShowCircles,
    setViewBarText,
    setUserState,
  ]);

  // -------------------
  // **Handle Station Selection**
  // -------------------
  const handleStationSelection = useCallback(
    (station) => {
      if (userState === USER_STATES.SELECTING_DEPARTURE) {
        setDepartureStation(station);
        setViewBarText(`Stations near me`);
        const stationView = {
          name: "StationView",
          center: station.position,
          zoom: STATION_VIEW_ZOOM, // Zoom level 18
          tilt: 67.5,
          heading: 0,
          districtName: station.district, // Pass district name for ViewBar
        };
        navigateToView(stationView);
        setUserState(USER_STATES.SELECTING_ARRIVAL); // Corrected state transition

        if (onStationSelect) {
          onStationSelect(station);
        }

        // **Add 3D Label and Animate Camera**
        if (threeOverlayRef.current) {
          threeOverlayRef.current.addLabel(
            station.position,
            station.place,
            `label-${station.id}`
          );
          threeOverlayRef.current.animateCameraTo(
            station.position,
            20, // Zoom level after animation
            60, // Tilt after animation
            0, // Heading after animation
            () => {
              // Animation complete callback
            }
          );
        }

        // **Add 3D Model for Selected Station**
        if (threeOverlayRef.current) {
          const loader = new GLTFLoader();
          loader.load(
            "/models/station.glb", // Ensure you have a station model
            (gltf) => {
              const stationModel = gltf.scene;
              stationModel.scale.set(5, 5, 5); // Adjust scale as needed
              threeOverlayRef.current.addModel(
                station.position,
                stationModel,
                `station-${station.id}`
              );
            },
            undefined,
            (error) => {
              console.error("Error loading station model:", error);
            }
          );
        }
      } else if (userState === USER_STATES.SELECTING_ARRIVAL) {
        setDestinationStation(station);
        setUserState(USER_STATES.DISPLAY_FARE);
        navigateToDriveView();
      }
    },
    [
      userState,
      navigateToView,
      navigateToDriveView,
      onStationSelect,
      threeOverlayRef,
    ]
  );

  // -------------------
  // **Handle Model Click**
  // -------------------
  const handleModelClick = useCallback(
    (identifier) => {
      // Determine if the clicked model is a station or other entity
      if (identifier.startsWith("station-")) {
        const stationId = identifier.replace("station-", "");
        const station = stations.find((s) => s.id === stationId);
        if (station) {
          handleStationSelection(station);
        }
      } else if (identifier === "user") {
        // Handle user model click if needed
        console.log("User model clicked.");
      }
      // Add more conditions as needed for different models
    },
    [stations, handleStationSelection]
  );

  // -------------------
  // **Initialize ThreeJSOverlayView**
  // -------------------
  useEffect(() => {
    if (!isLoaded || !map) return;

    const overlay = new ThreeJSOverlayView(THREE);
    threeOverlayRef.current = overlay;

    // Define a callback to handle model clicks
    overlay.setOnModelClick(handleModelClick);

    overlay.setMap(map);

    // Cleanup on unmount
    return () => {
      overlay.setMap(null);
    };
  }, [isLoaded, map, handleModelClick]);

  // -------------------
  // **Navigate to DriveView**
  // -------------------
  const navigateToDriveView = useCallback(() => {
    if (
      !map ||
      !departureStation ||
      !destinationStation ||
      !threeOverlayRef.current
    )
      return;

    // Calculate heading from departure to destination
    const departureLatLng = new window.google.maps.LatLng(
      departureStation.position.lat,
      departureStation.position.lng
    );
    const destinationLatLng = new window.google.maps.LatLng(
      destinationStation.position.lat,
      destinationStation.position.lng
    );
    const heading = window.google.maps.geometry.spherical.computeHeading(
      departureLatLng,
      destinationLatLng
    );

    const driveView = {
      name: "DriveView",
      center: departureStation.position,
      zoom: 16,
      tilt: 35,
      heading: heading,
    };
    navigateToView(driveView);

    // Add 3D car model and animate
    const loader = new GLTFLoader();
    loader.load(
      "/models/car.glb",
      (gltf) => {
        const carModel = gltf.scene;
        carModel.scale.set(2, 2, 2); // Adjust scale as needed
        threeOverlayRef.current.addModel(
          departureStation.position,
          carModel,
          "car"
        );

        // Animate car along the route
        if (directions) {
          const route = directions.routes[0];
          const path = route.overview_path.map((latLng) => ({
            lat: latLng.lat(),
            lng: latLng.lng(),
          }));
          threeOverlayRef.current.animateModelAlongPath(
            "car",
            path,
            12000,
            () => {
              console.log("Car animation completed");
            }
          );
        }
      },
      undefined,
      (error) => {
        console.error("Error loading car.glb model:", error);
      }
    );
  }, [
    map,
    departureStation,
    destinationStation,
    navigateToView,
    directions,
    threeOverlayRef,
  ]);

  // -------------------
  // **Replace Marker with 3D Model on MeView**
  // -------------------
  const replaceMarkerWith3DModel = useCallback(() => {
    if (!threeOverlayRef.current || !userLocation) return;

    // Load the ME.glb model
    const loader = new GLTFLoader();
    loader.load(
      "/models/ME.glb", // Corrected path
      (gltf) => {
        const meModel = gltf.scene;
        meModel.scale.set(5, 5, 5); // Adjust scale as needed
        threeOverlayRef.current.addModel(userLocation, meModel, "user");
      },
      undefined,
      (error) => {
        console.error("Error loading ME.glb model:", error);
      }
    );
  }, [threeOverlayRef, userLocation]);

  // -------------------
  // **Handle "Choose Destination" Button Click**
  // -------------------
  const handleChooseDestination = () => {
    const chooseDestinationView = {
      name: "CityView",
      center: BASE_CITY_CENTER,
      zoom: CITY_VIEW.zoom,
      tilt: CITY_VIEW.tilt,
      heading: CITY_VIEW.heading,
    };
    navigateToView(chooseDestinationView);
    setUserState(USER_STATES.SELECTING_ARRIVAL);
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
    setViewBarText("Select your arrival station");

    // Inform App.jsx to hide SceneContainer
    if (onStationDeselect) {
      onStationDeselect();
    }

    // Remove all 3D overlays
    if (threeOverlayRef.current) {
      threeOverlayRef.current.clearLabels();
      threeOverlayRef.current.clearModels();
    }
  };

  // -------------------
  // **Handle Clear Departure Selection**
  // -------------------
  const handleClearDeparture = () => {
    setDepartureStation(null);
    setDirections(null);
    setFareInfo(null);
    setViewBarText("Stations near me");
    setUserState(USER_STATES.SELECTING_DEPARTURE);

    // Inform App.jsx to hide SceneContainer
    if (onStationDeselect) {
      onStationDeselect();
    }

    // Remove departure label and model
    if (threeOverlayRef.current && departureStation) {
      threeOverlayRef.current.removeLabel(`label-${departureStation.id}`);
      threeOverlayRef.current.removeModel(`station-${departureStation.id}`);
    }
  };

  // -------------------
  // **Handle Clear Arrival Selection**
  // -------------------
  const handleClearArrival = () => {
    setDestinationStation(null);
    setDirections(null);
    setFareInfo(null);
    setViewBarText(
      departureStation
        ? `Departure: ${departureStation.district}, ${departureStation.place}`
        : "Stations near me"
    );
    setUserState(USER_STATES.SELECTING_ARRIVAL);
  };

  // -------------------
  // **Handle Map Load**
  // -------------------
  const onLoadMap = useCallback(
    (mapInstance) => {
      console.log("Map loaded");
      setMap(mapInstance);

      // **Add labels to all districts once map is loaded**
      if (threeOverlayRef.current) {
        districts.forEach((district) => {
          threeOverlayRef.current.addLabel(
            district.position,
            district.name,
            `label-${district.id}`
          );
        });
      }
    },
    [districts]
  );

  // -------------------
  // **Locate the User**
  // -------------------
  const locateMe = useCallback(() => {
    setDirections(null);
    setFareInfo(null);

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
          setViewBarText("Stations near me");

          // **Replace marker with 3D model on MeView**
          replaceMarkerWith3DModel();
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
  }, [map, navigateToView, replaceMarkerWith3DModel]);

  // -------------------
  // **Invoke locateMe When Map is Set**
  // -------------------
  useEffect(() => {
    if (map) {
      console.log("Invoking locateMe after map is set");
      locateMe();
    }
  }, [map, locateMe]);

  // -------------------
  // **Get Label Position for Radius Circles**
  // -------------------
  const getCircleLabelPosition = useCallback((center, radius) => {
    const latOffset = radius * 0.000009; // Approx conversion of meters to lat offset
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  // -------------------
  // **Directions Renderer Options**
  // -------------------
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

  // -------------------
  // **Handle Route Click (to Show Info Windows)**
  // -------------------
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

  // -------------------
  // **Loading and Error States for Data Fetching**
  // -------------------
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

  // -------------------
  // **Render Component**
  // -------------------
  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%", height: "100vh" }}
    >
      {/* ViewBar without Back Button */}
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
          userState === USER_STATES.SELECTING_DEPARTURE
        }
        onChooseDestination={handleChooseDestination}
        onHome={handleHomeClick} // Passing handleHomeClick here
        isCityView={currentView.name === "CityView"}
        userState={userState}
        isMeView={currentView.name === "MeView"}
        distanceKm={fareInfo ? fareInfo.distanceKm : null}
        estTime={fareInfo ? fareInfo.estTime : null}
      />

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: mapId, // Utilize the predefined mapId for styles
          tilt: currentView.tilt || 0,
          heading: currentView.heading || 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "auto",
          rotateControl: false,
          minZoom: 10,
          draggable: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          // **Removed custom styles**
          // Styles are managed via mapId; no need to set 'styles' here
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
            info={routeInfo}
            onClose={() => setRouteInfo(null)}
          />
        )}
      </GoogleMap>

      {/* MotionMenu for displaying fare information */}
      {userState === USER_STATES.DISPLAY_FARE && (
        <MotionMenu fareInfo={fareInfo} />
      )}
    </div>
  );
};

export default MapContainer;
