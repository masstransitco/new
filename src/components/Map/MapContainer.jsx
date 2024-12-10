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
} from "@react-google-maps/api";
import { FaLocationArrow } from "react-icons/fa";

// Vector map ID
const mapId = "94527c02bbb6243";

// Libraries
const libraries = ["geometry"];
const containerStyle = { width: "100%", height: "100%" };

const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 11,
  tilt: 45,
  heading: 0,
};

const DISTRICT_VIEW_ZOOM = 12;
const STATION_VIEW_ZOOM = 17;
// Increased ME_VIEW_ZOOM by +1 (was 14, now 15)
const ME_VIEW_ZOOM = 15;
const ME_VIEW_TILT = 45;
const ROUTE_VIEW_TILT = 65; // For route view

const CIRCLE_DISTANCES = [500, 1000]; // meters

function getViewTitle(view) {
  if (view.name === "CityView") return "Hong Kong";
  if (view.name === "MeView") return "Near me";
  if (view.name === "DistrictView") return view.districtName || "District";
  if (view.name === "StationView") return view.stationName || "Unnamed Station";
  if (view.name === "RouteView") return view.stationName || "Route View";
  return "";
}

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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours",
    libraries,
  });

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
          District: feature.properties.District,
          Place: feature.properties.Place,
          Address: feature.properties.Address,
        }));
        setStations(features);
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
      });
  }, []);

  const navigateToView = useCallback(
    (view) => {
      if (!map) return;
      const cameraOptions = {
        center: view.center,
        zoom: view.zoom,
        tilt: view.tilt !== undefined ? view.tilt : currentView.tilt || 45,
        heading:
          view.heading !== undefined ? view.heading : currentView.heading || 0,
      };

      setViewHistory((prevHistory) => [...prevHistory, view]);

      if (typeof map.moveCamera === "function") {
        map.moveCamera(cameraOptions);
      } else {
        map.panTo(view.center);
        map.setZoom(view.zoom);
        if (view.tilt !== undefined) map.setTilt(view.tilt);
        if (view.heading !== undefined) map.setHeading(view.heading);
      }

      // If RouteView, apply styles
      if (view.name === "RouteView") {
        map.setOptions({ styles: ROUTE_VIEW_STYLES });
      } else {
        map.setOptions({ styles: [] });
      }
    },
    [map, currentView]
  );

  const goBack = useCallback(() => {
    if (viewHistory.length <= 1) return;
    const newHistory = viewHistory.slice(0, -1);
    setViewHistory(newHistory);
    const previousView = newHistory[newHistory.length - 1];
    if (!map) return;

    const cameraOptions = {
      center: previousView.center,
      zoom: previousView.zoom,
      tilt: previousView.tilt !== undefined ? previousView.tilt : 45,
      heading: previousView.heading !== undefined ? previousView.heading : 0,
    };

    if (typeof map.moveCamera === "function") {
      map.moveCamera(cameraOptions);
    } else {
      map.panTo(previousView.center);
      map.setZoom(previousView.zoom);
      if (previousView.tilt !== undefined) map.setTilt(previousView.tilt);
      if (previousView.heading !== undefined)
        map.setHeading(previousView.heading);
    }

    // Restore styles if not route view
    if (previousView.name === "RouteView") {
      map.setOptions({ styles: ROUTE_VIEW_STYLES });
    } else {
      map.setOptions({ styles: [] });
    }
  }, [map, viewHistory]);

  const stationsByDistrict = useMemo(() => {
    const grouping = {};
    stations.forEach((st) => {
      const district = st.District || "Unknown";
      if (!grouping[district]) grouping[district] = [];
      grouping[district].push(st);
    });
    return grouping;
  }, [stations]);

  const districtClusters = useMemo(() => {
    return Object.entries(stationsByDistrict).map(([district, stList]) => {
      let latSum = 0,
        lngSum = 0;
      stList.forEach((s) => {
        latSum += s.position.lat;
        lngSum += s.position.lng;
      });
      const centroid = {
        lat: latSum / stList.length,
        lng: lngSum / stList.length,
      };
      return { district, position: centroid, count: stList.length };
    });
  }, [stationsByDistrict]);

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
      const stationView = {
        name: "StationView",
        center: station.position,
        zoom: STATION_VIEW_ZOOM,
        stationName: station.Place || "Unnamed Station",
      };
      navigateToView(stationView);
      setSelectedStation(station);
      setShowCircles(false);

      if (userLocation && google?.maps?.DirectionsService) {
        if (computeDistance(station.position) <= 1000) {
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

                // Now that we have a route, go to RouteView:
                // RouteView: zoom = currentView.zoom -1, tilt=65, heading towards station
                const userLatLng = new google.maps.LatLng(
                  userLocation.lat,
                  userLocation.lng
                );
                const stationLatLng = new google.maps.LatLng(
                  station.position.lat,
                  station.position.lng
                );
                const heading = google.maps.geometry.spherical.computeHeading(
                  userLatLng,
                  stationLatLng
                );
                const routeView = {
                  name: "RouteView",
                  center: {
                    lat: (userLocation.lat + station.position.lat) / 2,
                    lng: (userLocation.lng + station.position.lng) / 2,
                  },
                  zoom: (currentView.zoom || ME_VIEW_ZOOM) - 1,
                  tilt: ROUTE_VIEW_TILT,
                  heading,
                  stationName: station.Place || "Unnamed Station",
                };
                navigateToView(routeView);
              } else {
                console.error("Directions request failed:", status);
              }
            }
          );
        } else {
          setDirections(null);
        }
      }
    },
    [userLocation, navigateToView, computeDistance, currentView.zoom]
  );

  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);

    if (userLocation) {
      const meView = {
        name: "MeView",
        center: userLocation,
        zoom: ME_VIEW_ZOOM, // now 15
        tilt: ME_VIEW_TILT,
      };
      navigateToView(meView);
      return;
    }

    navigateToView(CITY_VIEW);
  }, [userLocation, navigateToView]);

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
            zoom: ME_VIEW_ZOOM, // now 15
            tilt: ME_VIEW_TILT,
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

  const onLoadMap = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
  }, []);

  const getCircleLabelPosition = useCallback((center, radius) => {
    const latOffset = radius * 0.000009;
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  const districtOverlays = useMemo(() => {
    if (currentView.name !== "CityView") return null;
    return districtClusters.map((cluster) => {
      const handleDistrictClick = () => {
        const districtView = {
          name: "DistrictView",
          center: cluster.position,
          zoom: DISTRICT_VIEW_ZOOM,
          districtName: cluster.district,
        };
        navigateToView(districtView);
      };

      return (
        <OverlayView
          key={cluster.district}
          position={cluster.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            onClick={handleDistrictClick}
            style={{
              width: "20px",
              height: "20px",
              background: "#fff",
              border: "2px solid #000",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          ></div>
        </OverlayView>
      );
    });
  }, [currentView.name, districtClusters, navigateToView]);

  const stationOverlays = useMemo(() => {
    if (currentView.name === "CityView") return null;
    // Blue border for stations in any view (especially MeView)
    return filteredStations.map((station) => {
      const handleClick = () => handleMarkerClick(station);
      return (
        <OverlayView
          key={station.id}
          position={station.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            onClick={handleClick}
            style={{
              width: "20px",
              height: "20px",
              background: "#fff",
              border: "2px solid #2171ec", // blue border
              borderRadius: "50%",
              cursor: "pointer",
            }}
          ></div>
        </OverlayView>
      );
    });
  }, [currentView.name, filteredStations, handleMarkerClick]);

  // User arrow should point down by default: Just use borderTop instead of borderBottom
  // We'll adjust its transform based on map tilt
  const userOverlay = useMemo(() => {
    if (!userLocation) return null;
    let tilt = currentView.tilt || 0;
    // Slight adjustment to arrow rotation based on tilt
    // For simplicity, rotate arrow to appear "flattened" as tilt increases
    const arrowRotation = 180 - (tilt / 65) * 30; // arbitrary math to change angle slightly

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
            borderTop: "20px solid #2171ec", // now pointing down by default
            transform: `rotate(${arrowRotation}deg)`,
            transformOrigin: "center",
          }}
        ></div>
      </OverlayView>
    );
  }, [userLocation, currentView.tilt]);

  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    let isInteracting = false;
    let lastX = 0;
    let lastY = 0;

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

      const currentTilt = map.getTilt() || 0;
      const currentHeading = map.getHeading() || 0;

      let newTilt = currentTilt + dy * 0.1;
      newTilt = Math.max(0, Math.min(67.5, newTilt));

      let newHeading = currentHeading + dx * 0.5;
      newHeading = (newHeading + 360) % 360;

      map.setOptions({
        tilt: newTilt,
        heading: newHeading,
      });
    };

    const handlePointerUp = () => {
      isInteracting = false;
    };

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

    return () => {
      mapDiv.removeEventListener("pointerdown", handlePointerDown);
      mapDiv.removeEventListener("pointermove", handlePointerMove);
      mapDiv.removeEventListener("pointerup", handlePointerUp);
      mapDiv.removeEventListener("pointercancel", handlePointerUp);
      mapDiv.removeEventListener("pointerleave", handlePointerUp);
    };
  }, [map]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  const viewTitle = getViewTitle(currentView);

  // On StationView and RouteView hide the infobox by default.
  // We previously showed it when selectedStation was defined.
  // Now, we only show it if we are not in StationView or RouteView.
  const showInfobox =
    selectedStation &&
    currentView.name !== "StationView" &&
    currentView.name !== "RouteView";

  return (
    <div
      className="map-container"
      style={{ position: "relative", width: "100%" }}
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
        }}
      >
        {viewTitle}
      </div>

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
          gestureHandling: "none",
          rotateControl: true,
          minZoom: 10,
          draggable: false,
        }}
        onLoad={onLoadMap}
        onClick={handleMapClick}
      >
        {userLocation && (
          <>
            {showCircles &&
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
                    {/* Removed white pill background, text now blue & more "pop" */}
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
          </>
        )}

        {districtOverlays}
        {stationOverlays}
        {userOverlay}

        {showInfobox && (
          <OverlayView
            position={selectedStation.position}
            mapPaneName={OverlayView.OVERLAY_LAYER}
          >
            <div
              style={{
                background: "#fff",
                padding: "8px",
                borderRadius: "4px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              }}
            >
              <h3 style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
                {selectedStation.Place || "Unnamed Station"}
              </h3>
              <p style={{ margin: 0, fontSize: "12px" }}>
                {selectedStation.Address || "No address available"}
              </p>
            </div>
          </OverlayView>
        )}

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
      >
        <FaLocationArrow style={{ color: "#2171ec", fontSize: "24px" }} />
      </div>

      {/* Back Button */}
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
          display: viewHistory.length > 1 ? "block" : "none",
        }}
      >
        ←
      </button>
    </div>
  );
};

export default MapContainer;
