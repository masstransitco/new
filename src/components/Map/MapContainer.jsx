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

// Hard-coded Google Maps API key
const GOOGLE_MAPS_API_KEY = "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours";
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error("Google Maps API key is missing.");
}

const mapId = "94527c02bbb6243";
const libraries = ["places"];
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

const DistrictMarkers = React.memo(DistrictMarkersRaw);
const StationMarkers = React.memo(StationMarkersRaw);

const initialState = {
  userState: USER_STATES.SELECTING_DEPARTURE,
  departureStation: null,
  destinationStation: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_DEPARTURE":
      return {
        ...state,
        userState: USER_STATES.SELECTED_DEPARTURE,
        departureStation: action.payload,
      };
    case "SET_DESTINATION":
      return {
        ...state,
        userState: USER_STATES.SELECTED_ARRIVAL,
        destinationStation: action.payload,
      };
    case "CHOOSE_DESTINATION":
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
    case "OPEN_TRIP_INFO":
      return {
        ...state,
        userState: USER_STATES.DISPLAY_FARE,
      };
    case "CLOSE_TRIP_INFO":
      return {
        ...state,
        userState: USER_STATES.SELECTED_ARRIVAL,
      };
    default:
      console.warn(`Unhandled action type: ${action.type}`);
      return state;
  }
}

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
  const [sceneMinimized, setSceneMinimized] = useState(false);
  const [isDepartTimeOpen, setIsDepartTimeOpen] = useState(false);
  const [departureTime, setDepartureTime] = useState(null);
  const [showTripInfoSheet, setShowTripInfoSheet] = useState(false);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { userState, departureStation, destinationStation } = state;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Retrieve data and rename for clarity
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

  useMapGestures(map);

  const currentView = useMemo(
    () => viewHistory[viewHistory.length - 1],
    [viewHistory]
  );

  const isPeakHour = useCallback((date) => {
    const hour = date.getHours();
    return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
  }, []);

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

  useEffect(() => {
    console.log("userState:", userState);
    console.log("departureStation:", departureStation);
    console.log("destinationStation:", destinationStation);
  }, [userState, departureStation, destinationStation]);

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
          setSceneMinimized(true);
          break;
        case "DistrictView":
          setViewBarText(view.districtName || "District");
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
    onFareInfo,
    navigateToView,
  ]);

  const handleStationSelection = useCallback(
    (station) => {
      if (
        userState === USER_STATES.SELECTING_DEPARTURE ||
        userState === USER_STATES.SELECTED_DEPARTURE
      ) {
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
      } else if (
        userState === USER_STATES.SELECTING_ARRIVAL ||
        userState === USER_STATES.SELECTED_ARRIVAL
      ) {
        dispatch({ type: "SET_DESTINATION", payload: station });
        console.log(`Selected/Updated arrival station: ${station.place}`);
        navigateToDriveView();
      }
    },
    [userState, navigateToView, navigateToDriveView, onStationSelect]
  );

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

  const onLoadMap = useCallback((mapInstance) => {
    setMap(mapInstance);
    console.log("Map loaded.");
  }, []);

  const handleHomeClick = useCallback(() => {
    navigateToView(CITY_VIEW);
    console.log("Home => CityView");
  }, [navigateToView]);

  const handleClearDeparture = useCallback(() => {
    dispatch({ type: "CLEAR_DEPARTURE" });
    if (onStationDeselect) onStationDeselect();
    navigateToView(CITY_VIEW);
    setSceneMinimized(true);
    setDirections(null);
    console.log("Cleared departure => CityView");
  }, [navigateToView, onStationDeselect]);

  const handleClearArrival = useCallback(() => {
    dispatch({ type: "CLEAR_DESTINATION" });
    navigateToView(CITY_VIEW);
    setSceneMinimized(true);
    setDirections(null);
    console.log("Cleared arrival => CityView");
  }, [navigateToView]);

  const handleDepartureTimeConfirm = useCallback(
    ({ selectedTime, bookingType }) => {
      setDepartureTime(selectedTime);
      if (bookingType === "pay-as-you-go") {
        console.log("Pay-As-You-Go booking =>", selectedTime);
      } else {
        console.log("Station-to-Station =>", selectedTime);
      }
      dispatch({ type: "CHOOSE_DESTINATION" });
      setIsDepartTimeOpen(false);
    },
    []
  );

  const handleChooseDestination = useCallback(() => {
    setIsDepartTimeOpen(true);
  }, []);

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
        (err) => console.error("Location error:", err)
      );
    } else {
      console.error("Geolocation not supported");
    }
  }, [map, navigateToView]);

  useEffect(() => {
    if (map && userState === USER_STATES.SELECTING_DEPARTURE && !userLocation) {
      locateMe();
    }
  }, [map, userState, userLocation, locateMe]);

  const displayedStations = useMemo(() => {
    if (currentView.name === "CityView") return [];
    if (currentView.name === "DistrictView" || currentView.name === "MeView") {
      return stations;
    }
    if (currentView.name === "StationView") {
      if (departureStation) return [departureStation];
      if (destinationStation) return [destinationStation];
      return [];
    }
    if (currentView.name === "DriveView") {
      return [departureStation, destinationStation].filter(Boolean);
    }
    switch (userState) {
      case USER_STATES.SELECTING_DEPARTURE:
      case USER_STATES.SELECTED_DEPARTURE:
        if (currentView.name === "CityView") return [];
        return stations;

      case USER_STATES.SELECTING_ARRIVAL:
      case USER_STATES.SELECTED_ARRIVAL:
      case USER_STATES.DISPLAY_FARE:
        return [departureStation, destinationStation].filter(Boolean);

      default:
        return stations;
    }
  }, [currentView, userState, departureStation, destinationStation, stations]);

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

  useEffect(() => {
    if (map && stations.length > 0 && districts.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      stations.forEach((st) => st && bounds.extend(st.position));
      districts.forEach((dt) => dt && bounds.extend(dt.position));
      map.fitBounds(bounds);
    }
  }, [map, stations, districts]);

  const handleOpenTripInfo = () => {
    dispatch({ type: "OPEN_TRIP_INFO" });
    setShowTripInfoSheet(true);
  };
  const handleCloseTripInfo = () => {
    setShowTripInfoSheet(false);
    dispatch({ type: "CLOSE_TRIP_INFO" });
  };

  const showTripSheet =
    userState === USER_STATES.DISPLAY_FARE && showTripInfoSheet;

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

  const showSceneContainer =
    (userState === USER_STATES.SELECTED_DEPARTURE && departureStation) ||
    (userState === USER_STATES.SELECTED_ARRIVAL && destinationStation);

  const sceneVisibleClass =
    showSceneContainer && !sceneMinimized ? "visible" : "minimized";

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
        {departureStation && (
          <InfoBox
            type="Departure"
            location={departureStation.place}
            departureTime={departureTime}
            onClear={handleClearDeparture}
          />
        )}
        {destinationStation && (
          <InfoBox
            type="Arrival"
            location={destinationStation.place}
            onClear={handleClearArrival}
          />
        )}

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

        {false && // If we want to re-enable MotionMenu, set this to true or remove the condition
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

      <DepartTime
        open={isDepartTimeOpen}
        onClose={() => setIsDepartTimeOpen(false)}
        onConfirm={handleDepartureTimeConfirm}
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

        {currentView.name === "CityView" && (
          <DistrictMarkers
            districts={districts}
            onDistrictClick={handleDistrictClick}
          />
        )}

        {(currentView.name === "DistrictView" ||
          currentView.name === "MeView") && (
          <StationMarkers
            stations={displayedStations}
            onStationClick={handleStationSelection}
          />
        )}

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
