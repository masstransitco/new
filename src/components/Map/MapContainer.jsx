/* global google */
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
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Initialize toast notifications
toast.configure();

// Vector map ID
const mapId = "94527c02bbb6243";

// Libraries
const libraries = ["geometry", "places"];
const containerStyle = { width: "100%", height: "100%" };

// Views
const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 11,
  tilt: 45,
  heading: 0,
};

const DISTRICT_VIEW_ZOOM = 12;
// Removed ROUTE_VIEW_TILT since it's unused
const STATION_VIEW_ZOOM_OFFSET = 2; // StationView = MeView Zoom +2
const ME_VIEW_ZOOM = 15;
const ME_VIEW_TILT = 45;
// ROUTE_VIEW_TILT removed

const CIRCLE_DISTANCES = [500, 1000]; // meters

// Peak hours assumption
const PEAK_HOURS = [
  { start: 8, end: 10 },
  { start: 18, end: 20 },
];

function getViewTitle(view, departureStation, destinationStation) {
  if (view.name === "CityView") {
    if (departureStation) {
      return `🌏 Hong Kong\n🔵 ${departureStation.Place}\n🟢 ${
        destinationStation ? destinationStation.Place : "Select destination"
      }`;
    }
    return "🌏 Hong Kong";
  }
  if (view.name === "MeView") return "🔍 Near me";
  if (view.name === "DistrictView")
    return `📍 ${view.districtName || "District"}`;
  if (view.name === "StationView")
    return `📍 ${view.stationName || "Unnamed Station"}`;
  if (view.name === "RouteView") return "🛤 Route View";
  if (view.name === "DriveView") return "🚗 Driving Route";
  return "";
}

// Base styles
const BASE_STYLES = [];

// Styles for StationView to hide buildings/labels except the selected station
const STATION_VIEW_STYLES = [
  {
    featureType: "all",
    stylers: [{ visibility: "off" }],
  },
];

// Styles for RouteView to dim buildings
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
    stylers: [{ color: "#e0e0e0", visibility: "simplified", lightness: 80 }],
  },
  {
    featureType: "building",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { color: "#cccccc" }, { lightness: 80 }],
  },
];

function isPeakHour(date) {
  const hour = date.getHours();
  return PEAK_HOURS.some((p) => hour >= p.start && hour < p.end);
}

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

  const { isLoaded } = useJsApiLoader({
    // Hardcoded API key as requested, but recommended to use environment variables in production
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours",
    libraries,
  });

  // Load stations
  useEffect(() => {
    fetch("/stations.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load stations GeoJSON");
        return r.json();
      })
      .then((data) => {
        const features = data.features.map((f) => ({
          id: f.id,
          position: {
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          },
          District: f.properties.District,
          Place: f.properties.Place,
          Address: f.properties.Address,
        }));
        setStations(features);
      })
      .catch((err) => {
        console.error("Error loading stations:", err);
        toast.error("Failed to load stations data.");
      });
  }, []);

  // Load districts
  useEffect(() => {
    fetch("/districts.geojson")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load districts GeoJSON");
        return r.json();
      })
      .then((data) => {
        const districtsData = data.features.map((f) => ({
          name: f.properties.District,
          position: {
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
          },
        }));
        setDistricts(districtsData);
      })
      .catch((err) => {
        console.error("Error loading districts:", err);
        toast.error("Failed to load districts data.");
      });
  }, []);

  const navigateToView = useCallback(
    (view) => {
      if (!map) return;
      setViewHistory((prevHistory) => [...prevHistory, view]);

      map.panTo(view.center);
      map.setZoom(view.zoom);
      if (view.tilt !== undefined) map.setTilt(view.tilt);
      if (view.heading !== undefined) map.setHeading(view.heading);

      // Apply styles based on view
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

    // Apply styles based on view
    if (previousView.name === "RouteView") {
      map.setOptions({ styles: ROUTE_VIEW_STYLES });
    } else if (previousView.name === "StationView") {
      map.setOptions({ styles: STATION_VIEW_STYLES });
    } else {
      map.setOptions({ styles: BASE_STYLES });
    }
  }, [map, viewHistory]);

  // Filter stations in MeView by distance <=1000m
  const computeDistance = useCallback(
    (pos) => {
      if (!userLocation || !google?.maps?.geometry?.spherical) return Infinity;
      const userLatLng = new google.maps.LatLng(
        userLocation.lat,
        userLocation.lng
      );
      const stationLatLng = new google.maps.LatLng(pos.lat, pos.lng);
      return google.maps.geometry.spherical.computeDistanceBetween(
        userLatLng,
        stationLatLng
      );
    },
    [userLocation]
  );

  const inMeView = currentView.name === "MeView";
  const filteredStations = useMemo(() => {
    if (!inMeView || !userLocation) return stations;
    return stations.filter((st) => computeDistance(st.position) <= 1000);
  }, [inMeView, userLocation, stations, computeDistance]);

  const handleMarkerClick = useCallback(
    (station) => {
      if (selectedStation && selectedStation.id === station.id) {
        // Second tap: navigate to StationView
        if (currentView.name === "MeView") {
          // Show walking route if within 1000m
          const dist = computeDistance(station.position);
          if (dist <= 1000 && google?.maps?.DirectionsService) {
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
                  const stationView = {
                    name: "StationView",
                    center: station.position,
                    zoom: ME_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
                    stationName: station.Place || "Unnamed Station",
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
            // No walking route if too far, just go to StationView
            setDirections(null);
            const stationView = {
              name: "StationView",
              center: station.position,
              zoom: ME_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
              stationName: station.Place || "Unnamed Station",
            };
            navigateToView(stationView);
            setShowChooseDestinationButton(true);
          }
        } else if (currentView.name === "DistrictView") {
          // From DistrictView to StationView (no walking routes)
          setDirections(null);
          const stationView = {
            name: "StationView",
            center: station.position,
            zoom: DISTRICT_VIEW_ZOOM + STATION_VIEW_ZOOM_OFFSET,
            stationName: station.Place || "Unnamed Station",
          };
          navigateToView(stationView);
          setShowChooseDestinationButton(true);
        }
      } else {
        // First tap: select the station
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

  const handleMapClick = useCallback(() => {
    // If user clicks map, deselect station
    setSelectedStation(null);
    setDirections(null);
    setShowCircles(false);

    // Return to a stable view (MeView if user location known, else CityView)
    if (userLocation) {
      const meView = {
        name: "MeView",
        center: userLocation,
        zoom: ME_VIEW_ZOOM,
        tilt: ME_VIEW_TILT,
      };
      navigateToView(meView);
      setShowCircles(true);
    } else {
      navigateToView(CITY_VIEW);
    }
  }, [userLocation, navigateToView]);

  const locateMe = useCallback(() => {
    setDirections(null);
    setSelectedStation(null);

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

  const onLoadMap = useCallback(
    (mapInstance) => {
      mapRef.current = mapInstance;
      setMap(mapInstance);

      // After map loads, show CityView initially
      navigateToView(CITY_VIEW);

      // Then prompt for geolocation after a delay
      const timer = setTimeout(() => {
        locateMe();
      }, 2000); // 2-second delay

      return () => clearTimeout(timer);
    },
    [navigateToView, locateMe]
  );

  // District overlays in CityView
  const districtOverlays = useMemo(() => {
    if (currentView.name !== "CityView") return null;
    return districts.map((d) => {
      const handleDistrictClick = () => {
        // DistrictView:
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
            scaledSize: new google.maps.Size(20, 20),
          }}
        />
      );
    });
  }, [currentView.name, districts, navigateToView]);

  // Station overlays (in MeView and DistrictView)
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
              ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" // Selected station icon
              : "https://maps.google.com/mapfiles/ms/icons/white-dot.png", // Default station icon
            scaledSize: new google.maps.Size(20, 20),
          }}
        />
      );
    });
  }, [currentView.name, filteredStations, selectedStation, handleMarkerClick]);

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

  const getCircleLabelPosition = useCallback((center, radius) => {
    const latOffset = radius * 0.000009;
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  // Handle Choose Destination button:
  const handleChooseDestinationClick = useCallback(() => {
    if (selectedStation) {
      // Set departureStation to the currently selected station
      setDepartureStation(selectedStation);
    }
    setDestinationStation(null);
    setSelectedStation(null);
    setDirections(null);
    setShowChooseDestinationButton(false);
    // Now, prompt user to select a destination from CityView
    navigateToView(CITY_VIEW);
  }, [selectedStation, navigateToView]);

  // We removed handleDestinationSelect since it was never called or needed

  // Display fare info
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

  const viewTitle = getViewTitle(
    currentView,
    departureStation,
    destinationStation
  );

  if (!isLoaded) {
    // Ensure this return is after all hooks have been called so no hook violation occurs
    return <div>Loading...</div>;
  }

  // Determine if we should show “Choose your destination” button:
  const showChooseDestination =
    currentView.name === "StationView" && showChooseDestinationButton;

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

  const handleRouteClick = useCallback(() => {
    // Show route info based on current view
    if (currentView.name === "RouteView") {
      setShowWalkingRouteInfo(true);
    } else if (currentView.name === "DriveView") {
      setShowDrivingRouteInfo(true);
    }
  }, [currentView.name]);

  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%", height: "100%" }}
      ref={mapRef}
    >
      {/* ViewBar */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "9999px",
          zIndex: 1100,
          fontSize: "16px",
          fontWeight: "500",
          textAlign: "center",
          whiteSpace: "pre-wrap",
        }}
      >
        {viewTitle}
      </div>

      {showChooseDestination && (
        <div
          onClick={handleChooseDestinationClick}
          style={{
            position: "absolute",
            top: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#00a500",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            zIndex: 1200,
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            transition: "transform 0.3s, box-shadow 0.3s",
            animation: "pulse 2s infinite",
            maxWidth: "80%",
          }}
        >
          💚 Choose your destination
        </div>
      )}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: mapId,
          tilt: currentView.tilt || 45,
          heading: currentView.heading || 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: currentView.name === "StationView" ? "none" : "auto",
          rotateControl: true,
          minZoom: 10,
          draggable: currentView.name !== "StationView",
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
                <div
                  style={{
                    color: "#2171ec",
                    fontSize: "14px",
                    fontWeight: "bold",
                    textShadow: "0 0 4px rgba(33,113,236,0.5)",
                    transform: "translate(-50%, -100%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
                </div>
              </OverlayView>
            </React.Fragment>
          ))}

        {/* District Overlays */}
        {districtOverlays}

        {/* Station Overlays */}
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

        {/* Custom Polylines for Route Click Handling */}
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

        {/* Walking Route Info */}
        {showWalkingRouteInfo && currentView.name === "RouteView" && (
          <InfoWindow
            position={selectedStation?.position}
            onCloseClick={() => setShowWalkingRouteInfo(false)}
          >
            <div
              style={{
                background: "#fff",
                padding: "10px",
                borderRadius: "4px",
              }}
            >
              <h3>Walking Route Info</h3>
              <p>
                Estimated walking time:{" "}
                {directions?.routes[0]?.legs[0]?.duration.text}
              </p>
            </div>
          </InfoWindow>
        )}

        {/* Driving Route Info */}
        {showDrivingRouteInfo &&
          currentView.name === "DriveView" &&
          fareInfo && (
            <InfoWindow
              position={destinationStation?.position}
              onCloseClick={() => setShowDrivingRouteInfo(false)}
            >
              <div
                style={{
                  background: "#fff",
                  padding: "10px",
                  borderRadius: "4px",
                }}
              >
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
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          backgroundColor: "#fff",
          borderRadius: "4px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          padding: "8px",
          zIndex: 1000,
        }}
        onClick={locateMe}
        aria-label="Locate me"
      >
        <FaLocationArrow style={{ color: "#2171ec", fontSize: "24px" }} />
      </div>

      {/* Back Button */}
      {viewHistory.length > 1 && (
        <button
          onClick={goBack}
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
          aria-label="Go back"
        >
          ←
        </button>
      )}

      {/* CSS Keyframes for Pulse Animation */}
      <style>
        {`
          @keyframes pulse {
            0% {
              transform: translateX(-50%) scale(1);
              box-shadow: 0 0 5px rgba(0, 165, 0, 0.7);
            }
            50% {
              transform: translateX(-50%) scale(1.05);
              box-shadow: 0 0 15px rgba(0, 165, 0, 1);
            }
            100% {
              transform: translateX(-50%) scale(1);
              box-shadow: 0 0 5px rgba(0, 165, 0, 0.7);
            }
          }
        `}
      </style>
    </div>
  );
};

export default MapContainer;
