// src/components/Map/MapContainer.jsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  Polyline,
} from "@react-google-maps/api";

import ViewBar from "./ViewBar";
import InfoBox from "./InfoBox";
import UserOverlay from "./UserOverlay";
import UserCircles from "./UserCircles";
import DistrictMarkersRaw from "./DistrictMarkers";
import StationMarkersRaw from "./StationMarkers";
import SceneContainer from "../Scene/SceneContainer";
import MotionMenu from "../Menu/MotionMenu";
import DepartTime from "./DepartTime";

import useFetchGeoJSON from "../../hooks/useFetchGeoJSON";
import useMapGestures from "../../hooks/useMapGestures";
import PropTypes from "prop-types";

import "./MapContainer.css";

// Securely access the API key from environment variables
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours";

// Validate that the API key is provided
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error(
    "Google Maps API key is missing. Please set REACT_APP_GOOGLE_MAPS_API_KEY in your environment variables."
  );
}

const mapId = "94527c02bbb6243"; // Ensure this is valid
const libraries = ["places"]; // Removed 'geometry' as it's no longer used
const containerStyle = { width: "100%", height: "100vh" };
const BASE_CITY_CENTER = { lat: 22.236, lng: 114.191 };

const CITY_VIEW = {
  name: "CityView",
  center: BASE_CITY_CENTER,
  zoom: 11,
  tilt: 0,
  heading: 0,
};

const STATION_VIEW_ZOOM = 18;
const CIRCLE_DISTANCES = [500, 1000];

const USER_STATES = {
  SELECTING_DEPARTURE: "SelectingDeparture",
  SELECTED_DEPARTURE: "SelectedDeparture",
  SELECTING_ARRIVAL: "SelectingArrival",
  SELECTED_ARRIVAL: "SelectedArrival",
  DISPLAY_FARE: "DisplayFare",
};

const PEAK_HOURS = [
  { start: 8, end: 10 },
  { start: 18, end: 20 },
];

// Memoized components for performance
const DistrictMarkers = React.memo(DistrictMarkersRaw);
const StationMarkers = React.memo(StationMarkersRaw);

// Initial state for useReducer
const initialState = {
  userState: USER_STATES.SELECTING_DEPARTURE,
  departureStation: null,
  destinationStation: null,
};

// Reducer function to manage state transitions
const reducer = (state, action) => {
  switch (action.type) {
    case "SET_DEPARTURE":
      // Overwrite the departure station regardless of existing departure
      return {
        ...state,
        userState: USER_STATES.SELECTED_DEPARTURE,
        departureStation: action.payload,
      };

    case "SET_DESTINATION":
      // Overwrite the arrival station
      return {
        ...state,
        userState: USER_STATES.SELECTED_ARRIVAL,
        destinationStation: action.payload,
      };

    case "CHOOSE_DESTINATION":
      // Transition from SELECTED_DEPARTURE => SELECTING_ARRIVAL
      return {
        ...state,
        userState: USER_STATES.SELECTING_ARRIVAL,
      };

    case "CLEAR_DEPARTURE":
      return {
        ...state,
        userState: USER_STATES.SELECTING_DEPARTURE,
        departureStation: null,
        destinationStation: null,
      };

    case "CLEAR_DESTINATION":
      return {
        ...state,
        userState: USER_STATES.SELECTING_ARRIVAL,
        destinationStation: null,
      };

    // NEW: For opening the side-sheet to display trip info
    case "OPEN_TRIP_INFO":
      return {
        ...state,
        userState: USER_STATES.DISPLAY_FARE,
      };

    // NEW: For closing the side-sheet and returning to SELECTED_ARRIVAL
    case "CLOSE_TRIP_INFO":
      return {
        ...state,
        userState: USER_STATES.SELECTED_ARRIVAL,
      };

    default:
      console.warn(`Unhandled action type: ${action.type}`);
      return state;
  }
};

const MapContainer = ({
  onStationSelect,
  onStationDeselect,
  onDistrictSelect,
  onFareInfo,
}) => {
  const [map, setMap] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [viewHistory, setViewHistory] = useState([CITY_VIEW]);
  const [showCircles, setShowCircles] = useState(false);
  const [viewBarText, setViewBarText] = useState("Stations near me");

  // Scene container bottom sheet minimized or expanded
  const [sceneMinimized, setSceneMinimized] = useState(false);

  // States for managing DepartTime modal and selected departure time
  const [isDepartTimeOpen, setIsDepartTimeOpen] = useState(false);
  const [departureTime, setDepartureTime] = useState(null);

  // NEW: Side-sheet for trip info
  const [showTripInfoSheet, setShowTripInfoSheet] = useState(false);

  // useReducer for managing userState, departureStation, destinationStation
  const [state, dispatch] = useReducer(reducer, initialState);
  const { userState, departureStation, destinationStation } = state;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const {
    data: stationsData = [],
    loading: stationsLoading,
    error: stationsError,
  } = useFetchGeoJSON("/stations.geojson");

  const {
    data: districtsData = [],
    loading: districtsLoading,
    error: districtsError,
  } = useFetchGeoJSON("/districts.geojson");

  const stations = useMemo(() => {
    return stationsData.map((feature, index) => ({
      id: feature.id != null ? String(feature.id) : `station-${index}`,
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
    return districtsData.map((feature, index) => ({
      id: feature.id != null ? String(feature.id) : `district-${index}`,
      name: feature.properties.District,
      position: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
      description: feature.properties.Description,
    }));
  }, [districtsData]);

  // Custom gesture hook
  useMapGestures(map);

  // Memoized current view
  const currentView = useMemo(() => {
    return viewHistory[viewHistory.length - 1];
  }, [viewHistory]);

  // Callback to check if current time is peak hour
  const isPeakHour = useCallback((date) => {
    const hour = date.getHours();
    return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
  }, []);

  // Fare calculation logic
  const calculateFare = useCallback(
    (distance, durationInSeconds) => {
      const baseTaxi = 24;
      const extraMeters = Math.max(0, distance - 2000);
      const increments = Math.floor(extraMeters / 200);
      const taxiFareEstimate = baseTaxi + increments;

      const peak = isPeakHour(new Date());
      const startingFare = peak ? 65 : 35;
      const ourFare = Math.max(taxiFareEstimate * 0.7, startingFare);

      const distanceKm = (distance / 1000).toFixed(2);
      const hrs = Math.floor(durationInSeconds / 3600);
      const mins = Math.floor((durationInSeconds % 3600) / 60);
      const estTime = `${hrs > 0 ? hrs + " hr " : ""}${mins} mins`;

      return { ourFare, taxiFareEstimate, distanceKm, estTime };
    },
    [isPeakHour]
  );

  // Debug logs
  useEffect(() => {
    console.log("userState:", userState);
    console.log("departureStation:", departureStation);
    console.log("destinationStation:", destinationStation);
  }, [userState, departureStation, destinationStation]);

  // Navigation to different views
  const navigateToView = useCallback(
    (view) => {
      if (!map) {
        console.warn("Map not ready.");
        return;
      }
      setViewHistory((prev) => [...prev, view]);
      map.panTo(view.center);
      map.setZoom(view.zoom);

      if (view.tilt !== undefined) map.setTilt(view.tilt);
      if (view.heading !== undefined) map.setHeading(view.heading);

      switch (view.name) {
        case "CityView":
          setViewBarText("All Districts");
          // When user goes back to CityView, automatically minimize scene container
          setSceneMinimized(true);
          break;
        case "DistrictView":
          setViewBarText(view.districtName || "District");
          // Also minimize scene container
          setSceneMinimized(true);
          break;
        case "StationView":
          setViewBarText(view.stationName || "Station");
          break;
        case "MeView":
          setViewBarText("Stations near me");
          setSceneMinimized(true);
          break;
        case "DriveView":
          break;
        default:
          setViewBarText("");
      }
      console.log(`Navigated to ${view.name}`);
    },
    [map]
  );

  // Handle navigation to DriveView
  const navigateToDriveView = useCallback(() => {
    if (!map || !departureStation || !destinationStation) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: departureStation.position,
        destination: destinationStation.position,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") {
          setDirections(result);
          const route = result.routes[0]?.legs[0];
          if (!route) return;
          const fare = calculateFare(
            route.distance.value,
            route.duration.value
          );
          setViewBarText(
            `Distance: ${fare.distanceKm} km | Est Time: ${fare.estTime}`
          );

          if (onFareInfo) onFareInfo(fare);

          navigateToView({
            name: "DriveView",
            center: {
              lat:
                (departureStation.position.lat +
                  destinationStation.position.lat) /
                2,
              lng:
                (departureStation.position.lng +
                  destinationStation.position.lng) /
                2,
            },
            zoom: 13,
          });
          console.log("Navigated to DriveView with directions.");
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );
  }, [
    map,
    departureStation,
    destinationStation,
    calculateFare,
    navigateToView,
    onFareInfo,
  ]);

  // 1) ALLOW REPLACEMENT OF SELECTED DEPARTURE OR ARRIVAL DIRECTLY
  // handleStationSelection
  const handleStationSelection = useCallback(
    (station) => {
      // If user is picking or replacing the departure
      if (
        userState === USER_STATES.SELECTING_DEPARTURE ||
        userState === USER_STATES.SELECTED_DEPARTURE
      ) {
        // Overwrite the departure station
        dispatch({ type: "SET_DEPARTURE", payload: station });
        if (onStationSelect) onStationSelect(station);

        navigateToView({
          name: "StationView",
          center: station.position,
          zoom: STATION_VIEW_ZOOM,
          stationName: station.place,
        });
        console.log(`Selected/Updated departure station: ${station.place}`);
        setSceneMinimized(false);
      }
      // If user is picking or replacing the arrival
      else if (
        userState === USER_STATES.SELECTING_ARRIVAL ||
        userState === USER_STATES.SELECTED_ARRIVAL
      ) {
        dispatch({ type: "SET_DESTINATION", payload: station });
        console.log(`Selected/Updated arrival station: ${station.place}`);
        // For arrival, automatically recalc drive route
        navigateToDriveView();
      }
    },
    [userState, navigateToView, navigateToDriveView, onStationSelect]
  );

  // District click
  const handleDistrictClick = useCallback(
    (district) => {
      if (!map) {
        console.warn("Map not ready.");
        return;
      }
      const stationsInDistrict = stations.filter(
        (st) =>
          st.district &&
          st.district.trim().toLowerCase() ===
            district.name.trim().toLowerCase()
      );

      const bounds = new window.google.maps.LatLngBounds();
      stationsInDistrict.forEach((st) => bounds.extend(st.position));
      if (stationsInDistrict.length === 0) {
        bounds.extend(district.position);
      }
      map.fitBounds(bounds);
      map.setTilt(45);

      navigateToView({
        name: "DistrictView",
        center: map.getCenter().toJSON(),
        zoom: map.getZoom(),
        tilt: 45,
        heading: map.getHeading() || 0,
        districtName: district.name,
      });

      if (onDistrictSelect) onDistrictSelect(district);
      setViewBarText(district.name);
      console.log(`District clicked: ${district.name}`);
    },
    [map, navigateToView, stations, onDistrictSelect]
  );

  // Handle map load
  const onLoadMap = useCallback((mapInstance) => {
    setMap(mapInstance);
    console.log("Map loaded.");
  }, []);

  // Home button => CityView
  const handleHomeClick = useCallback(() => {
    // If user is in StationView or DistrictView or MeView => go CityView
    navigateToView(CITY_VIEW);
    // No userState changes => keep userState
    console.log("Home button clicked => CityView");
  }, [navigateToView]);

  // CLEAR departure
  const handleClearDeparture = useCallback(() => {
    dispatch({ type: "CLEAR_DEPARTURE" });
    if (onStationDeselect) onStationDeselect();
    navigateToView(CITY_VIEW);
    setSceneMinimized(true);
    setDirections(null);
    console.log("Cleared departure => CityView");
  }, [navigateToView, onStationDeselect]);

  // CLEAR arrival
  const handleClearArrival = useCallback(() => {
    dispatch({ type: "CLEAR_DESTINATION" });
    navigateToView(CITY_VIEW);
    setSceneMinimized(true);
    setDirections(null);
    console.log("Cleared arrival => CityView");
  }, [navigateToView]);

  // DEPARTTIME => user picks time => from SELECTED_DEPARTURE => SELECTING_ARRIVAL
  const handleDepartureTimeConfirm = useCallback(
    ({ selectedTime, bookingType }) => {
      // We store the departureTime
      setDepartureTime(selectedTime);

      // bookingType can be "pay-as-you-go" or "station-to-station"
      if (bookingType === "pay-as-you-go") {
        console.log(
          "Confirmed Pay-As-You-Go booking, departureTime:",
          selectedTime
        );
      } else {
        console.log(
          "User pressed 'Choose Destination' after picking departure time"
        );
      }

      dispatch({ type: "CHOOSE_DESTINATION" }); // SELECTING_ARRIVAL
      setIsDepartTimeOpen(false);
    },
    []
  );

  // "Choose Destination" => open DepartTime modal
  const handleChooseDestination = useCallback(() => {
    setIsDepartTimeOpen(true);
  }, []);

  // Locate Me
  const locateMe = useCallback(() => {
    setDirections(null);
    if (!map) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(userPos);
          navigateToView({
            name: "MeView",
            center: userPos,
            zoom: 15,
          });
          setShowCircles(true);
          console.log("Located user => MeView");
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    } else {
      console.error("Geolocation not supported");
    }
  }, [map, navigateToView]);

  // Auto-locate if SELECTING_DEPARTURE with no userLocation
  useEffect(() => {
    console.log("User state changed:", userState);
    if (map && userState === USER_STATES.SELECTING_DEPARTURE && !userLocation) {
      locateMe();
    }
  }, [map, locateMe, userState, userLocation]);

  // Determine which stations to display
  const displayedStations = useMemo(() => {
    // If CityView => only districts => no stations
    if (currentView.name === "CityView") return [];

    // DistrictView / MeView => show all stations
    if (currentView.name === "DistrictView" || currentView.name === "MeView") {
      return stations;
    }

    // StationView => only selected station’s marker
    if (currentView.name === "StationView") {
      if (departureStation) return [departureStation];
      if (destinationStation) return [destinationStation];
      return [];
    }

    // DriveView => departure & arrival
    if (currentView.name === "DriveView") {
      return [departureStation, destinationStation].filter(Boolean);
    }

    // Otherwise, fallback to userState logic
    switch (userState) {
      case USER_STATES.SELECTING_DEPARTURE:
      case USER_STATES.SELECTED_DEPARTURE:
        // Show all stations unless in CityView
        if (currentView.name === "CityView") {
          return [];
        }
        return stations;

      case USER_STATES.SELECTING_ARRIVAL:
      case USER_STATES.SELECTED_ARRIVAL:
      case USER_STATES.DISPLAY_FARE:
        // Show departure plus arrival if set
        return [departureStation, destinationStation].filter(Boolean);

      default:
        return stations;
    }
  }, [currentView, userState, departureStation, destinationStation, stations]);

  // Directions Options
  const directionsOptions = useMemo(
    () => ({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#276ef1",
        strokeOpacity: 0.8,
        strokeWeight: 4,
      },
    }),
    []
  );

  // Fit map bounds
  useEffect(() => {
    if (map && stations.length > 0 && districts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      stations.forEach((station) => station && bounds.extend(station.position));
      districts.forEach(
        (district) => district && bounds.extend(district.position)
      );
      map.fitBounds(bounds);
      console.log("Fit map bounds => all stations and districts");
    }
  }, [map, stations, districts]);

  // SIDE-SHEET for trip info => userState=DISPLAY_FARE
  const handleOpenTripInfo = () => {
    // Switch to userState=DISPLAY_FARE
    dispatch({ type: "OPEN_TRIP_INFO" });
    setShowTripInfoSheet(true);
  };
  const handleCloseTripInfo = () => {
    setShowTripInfoSheet(false);
    // Return to SELECTED_ARRIVAL
    dispatch({ type: "CLOSE_TRIP_INFO" });
  };

  // Conditionally show the side-sheet (trip info)
  const showTripSheet =
    userState === USER_STATES.DISPLAY_FARE && showTripInfoSheet;

  // Handle Google Maps API load error
  if (loadError) {
    return (
      <div className="error-message">
        Error loading maps. Please check your API key and network connection.
      </div>
    );
  }

  // Handle Google Maps API loading state
  if (!isLoaded) {
    return <div className="loading-message">Loading map...</div>;
  }

  // Handle stations data loading state
  if (stationsLoading || districtsLoading) {
    return <div className="loading-message">Loading map data...</div>;
  }

  // Handle stations or districts data error
  if (stationsError || districtsError) {
    return (
      <div className="error-message">
        Error loading map data. Please try again later.
      </div>
    );
  }

  return (
    <div className="map-container">
      <ViewBar
        departure={null}
        arrival={null}
        viewBarText={viewBarText}
        onHome={handleHomeClick}
        onLocateMe={locateMe}
        isMeView={currentView.name === "MeView"}
        isDistrictView={currentView.name === "DistrictView"}
        isStationView={
          userState === USER_STATES.SELECTED_DEPARTURE ||
          userState === USER_STATES.SELECTING_ARRIVAL ||
          userState === USER_STATES.SELECTED_ARRIVAL
        }
      />

      <div className="lower-panel">
        {/* DEPARTURE InfoBox */}
        {departureStation && (
          <InfoBox
            type="Departure"
            location={departureStation.place}
            departureTime={departureTime} // Pass the selected departure time
            onClear={handleClearDeparture}
          />
        )}

        {/* ARRIVAL InfoBox */}
        {destinationStation && (
          <InfoBox
            type="Arrival"
            location={destinationStation.place}
            onClear={handleClearArrival}
          />
        )}

        {/* "Choose Departure Time" or "Confirm trip" button */}
        {userState === USER_STATES.SELECTED_DEPARTURE && (
          <button
            className="choose-destination-button-lower"
            onClick={handleChooseDestination}
            aria-label="Choose Departure Time"
          >
            Choose Departure Time
          </button>
        )}

        {userState === USER_STATES.SELECTED_ARRIVAL && (
          <button
            className="confirm-trip-button-lower"
            onClick={() => console.log("Confirm trip clicked")}
            aria-label="Confirm trip"
          >
            Confirm trip
          </button>
        )}

        {/* "trip info" button (circle shaped with an icon) => only in SELECTED_ARRIVAL */}
        {userState === USER_STATES.SELECTED_ARRIVAL && destinationStation && (
          <button
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#4B5563",
              color: "#fff",
              fontSize: 18,
              marginTop: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={handleOpenTripInfo}
            aria-label="Open Trip Info"
          >
            i
          </button>
        )}

        {/* SceneContainer bottom sheet => either departure or arrival station */}
        {showSceneContainer && (
          <div className={`scene-wrapper ${sceneVisibleClass}`}>
            <div className="scene-container-header">
              <button
                className="toggle-scene-button"
                onClick={() => setSceneMinimized((prev) => !prev)}
                aria-label={
                  sceneMinimized ? "Expand 3D Map" : "Minimize 3D Map"
                }
              >
                {sceneMinimized ? "Expand 3D Map" : "Minimize 3D Map"}
              </button>
            </div>
            <SceneContainer
              center={
                userState === USER_STATES.SELECTED_DEPARTURE
                  ? departureStation.position
                  : destinationStation.position
              }
            />
          </div>
        )}

        {/* MotionMenu bottom sheet */}
        {false && // disable auto-render of MotionMenu
          userState === USER_STATES.SELECTED_ARRIVAL &&
          destinationStation &&
          directions && (
            <div className="scene-wrapper visible" style={{ height: "40vh" }}>
              <MotionMenu
                departureStation={departureStation}
                arrivalStation={destinationStation}
                directions={directions}
                calculateFare={calculateFare}
                onContinue={() => {
                  console.log("User chose departure time");
                }}
                buttonText="Choose departure time"
              />
            </div>
          )}
      </div>

      {/* RENDER THE Trip Info SIDE-SHEET => If userState=DISPLAY_FARE */}
      {showTripSheet && directions && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "75vw",
            maxWidth: "400px",
            height: "100vh",
            background: "#2E2E2E",
            color: "#fff",
            padding: "16px",
            boxShadow: "2px 0 8px rgba(0,0,0,0.3)",
            transition: "transform 0.4s ease-in-out",
            zIndex: 2000,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Trip Info</h3>
          {/* Reuse logic from MotionMenu to calculate fare */}
          {(() => {
            const route = directions?.routes[0]?.legs[0];
            if (!route) return <p>No route found.</p>;
            const fareInfo = calculateFare(
              route.distance.value,
              route.duration.value
            );
            return (
              <>
                <p>
                  <strong>Departure:</strong> {departureStation?.place}
                </p>
                <p>
                  <strong>Arrival:</strong> {destinationStation?.place}
                </p>
                <p>
                  <strong>Distance:</strong> {fareInfo.distanceKm} km
                </p>
                <p>
                  <strong>Estimated Time:</strong> {fareInfo.estTime}
                </p>
                <p>
                  <strong>Your Fare:</strong> HK${fareInfo.ourFare.toFixed(2)}
                </p>
                <p>
                  <strong>Taxi Fare Estimate:</strong> HK$
                  {fareInfo.taxiFareEstimate.toFixed(2)}
                </p>
              </>
            );
          })()}
          <button
            style={{
              marginTop: "20px",
              backgroundColor: "#1F2937",
              color: "#fff",
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "10px 16px",
              cursor: "pointer",
            }}
            onClick={handleCloseTripInfo}
            aria-label="Close Trip Info"
          >
            Close
          </button>
        </div>
      )}

      {/* Render DepartTime Modal */}
      <DepartTime
        open={isDepartTimeOpen}
        onClose={() => setIsDepartTimeOpen(false)}
        onConfirm={handleDepartureTimeConfirm} // For departure time selection
      />

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: mapId,
          tilt: currentView.tilt || 0,
          heading: currentView.heading || 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: "none",
          rotateControl: false,
        }}
        onLoad={onLoadMap}
      >
        {userLocation && showCircles && (
          <UserCircles
            userLocation={userLocation}
            distances={CIRCLE_DISTANCES}
            getLabelPosition={(c, r) => ({
              lat: c.lat + r * 0.000009,
              lng: c.lng,
            })}
          />
        )}

        {userLocation && (
          <UserOverlay
            userLocation={userLocation}
            mapHeading={map?.getHeading() || 0}
          />
        )}

        {directions && (
          <>
            <DirectionsRenderer
              directions={directions}
              options={directionsOptions}
            />
            {directions.routes.map((route, routeIndex) =>
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
                  />
                ))
              )
            )}
          </>
        )}

        {/* CityView: only districts */}
        {currentView.name === "CityView" && (
          <DistrictMarkers
            districts={districts}
            onDistrictClick={handleDistrictClick}
          />
        )}

        {/* DistrictView / MeView => show all station markers */}
        {(currentView.name === "DistrictView" ||
          currentView.name === "MeView") && (
          <StationMarkers
            stations={displayedStations}
            onStationClick={handleStationSelection}
          />
        )}

        {/* Other Views => station markers based on displayedStations */}
        {currentView.name !== "CityView" &&
          currentView.name !== "DistrictView" &&
          currentView.name !== "MeView" && (
            <StationMarkers
              stations={displayedStations}
              onStationClick={handleStationSelection}
            />
          )}
      </GoogleMap>
    </div>
  );
};

MapContainer.propTypes = {
  onStationSelect: PropTypes.func.isRequired,
  onStationDeselect: PropTypes.func.isRequired,
  onDistrictSelect: PropTypes.func.isRequired,
  onFareInfo: PropTypes.func.isRequired,
};

export default MapContainer;
