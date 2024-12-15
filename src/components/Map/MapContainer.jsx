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
import DistrictMarkers from "./DistrictMarkers";
import StationMarkers from "./StationMarkers";

import useFetchGeoJSON from "../../hooks/useFetchGeoJSON";
import useMapGestures from "../../hooks/useMapGestures";

import "./MapContainer.css";

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import ThreeJSOverlayView from "../../threejs/ThreeJSOverlayView";

// **Note:** Use environment variables for API keys in production.
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY"; // **Replace with your actual API key securely**

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
  const [viewBarText, setViewBarText] = useState("Stations near me");
  const [routeInfo, setRouteInfo] = useState(null);
  const [showMarkers, setShowMarkers] = useState(true); // Controls visibility of traditional markers

  const currentView = viewHistory[viewHistory.length - 1];

  // Ref for ThreeJSOverlayView
  const threeOverlayRef = useRef(null);

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

  // **Initialize ThreeJSOverlayView**
  useEffect(() => {
    if (!isLoaded || !map) return;

    const overlay = new ThreeJSOverlayView(map, THREE);
    threeOverlayRef.current = overlay;

    overlay.setMap(map);

    // **Do not override lifecycle methods here.**
    // Remove the following lines to prevent disrupting ThreeJSOverlayView's internal bindings:
    /*
    overlay.onAdd = () => {
      // Add initial objects or configurations if needed
    };
    */

    // Cleanup on unmount
    return () => {
      overlay.setMap(null);
    };
  }, [isLoaded, map]);

  // **Navigate to a given view**
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

  // **Navigate to DriveView**
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

  // **Handle station selection based on user state**
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
        setUserState(USER_STATES.SELECTING_ARRIVAL); // **Corrected state transition**

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

      // Hide traditional markers when overlays are active
      setShowMarkers(false);
    },
    [
      userState,
      navigateToView,
      navigateToDriveView,
      onStationSelect,
      threeOverlayRef,
    ]
  );

  // **Enhancement 4: Replace marker with 3D model on MeView**
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

  // **Handle "Choose Destination" button click**
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

    // Show traditional markers again
    setShowMarkers(true);
  };

  // **Check if current time is peak hour**
  const isPeakHour = (date) => {
    const hour = date.getHours();
    return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
  };

  // **Fare Calculation Function**
  const calculateFare = (distance, durationInSeconds) => {
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
            const fare = calculateFare(distance, route.duration.value); // Pass duration in seconds
            setFareInfo(fare);

            // Update ViewBar title with distance and estimated time
            const distanceKm = (distance / 1000).toFixed(2);
            const durationMinutes = Math.floor(route.duration.value / 60);
            const durationHours = Math.floor(durationMinutes / 60);
            const remainingMinutes = durationMinutes % 60;
            const estTime = `${
              durationHours > 0 ? `${durationHours} hr ` : ""
            }${remainingMinutes} mins`;
            setViewBarText(`Distance: ${distanceKm} km, Est Time: ${estTime}`);

            // **Enhancement 3: Animate car on DriveView**
            navigateToDriveView();
          } else {
            console.error(`Error fetching directions: ${result}`);
          }
        }
      );
    }
  }, [
    departureStation,
    destinationStation,
    calculateFare,
    navigateToDriveView,
  ]);

  // **Locate the user**
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
    // **Removed styles reset**
    // No need to set styles as they are managed via mapId
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

    // Show traditional markers again
    setShowMarkers(true);
  }, [map, onStationDeselect]);

  // **Handle Clear Departure Selection**
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
    if (threeOverlayRef.current) {
      threeOverlayRef.current.removeLabel(`label-${departureStation?.id}`);
      threeOverlayRef.current.removeModel(`station-${departureStation?.id}`);
    }

    // Show traditional markers again
    setShowMarkers(true);
  };

  // **Handle Clear Arrival Selection**
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
      setViewBarText("Select your arrival station");

      // **Add label to district**
      if (threeOverlayRef.current) {
        threeOverlayRef.current.addLabel(
          district.position,
          district.name,
          `label-${district.id}`
        );
      }

      // Hide traditional markers when overlays are active
      setShowMarkers(false);
    },
    [navigateToView, threeOverlayRef]
  );

  // **Handle map load**
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
        onHome={handleHomeClick}
        isCityView={currentView.name === "CityView"}
        userState={userState}
        isMeView={currentView.name === "MeView"}
        distanceKm={fareInfo ? (fareInfo.distanceKm || 0).toFixed(2) : null}
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

        {/* District Overlays (in CityView) */}
        {currentView.name === "CityView" && showMarkers && (
          <DistrictMarkers
            districts={districts}
            onDistrictClick={handleDistrictClick}
          />
        )}

        {/* Station Overlays (in MeView or DistrictView) */}
        {(currentView.name === "MeView" ||
          currentView.name === "DistrictView") &&
          showMarkers && (
            <StationMarkers
              stations={filteredStations}
              onStationClick={handleStationSelection}
              selectedStations={{
                departure: departureStation,
                destination: destinationStation,
              }}
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
