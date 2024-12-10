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

// Use a vector map with a known vector mapId
const mapId = "94527c02bbb6243"; // Ensure this is a valid vector map ID from your Google Cloud project

const libraries = ["geometry"];
const containerStyle = { width: "100%", height: "100%" };

const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 11,
  tilt: 45,
  heading: 0,
  title: "Hong Kong",
};

const DISTRICT_VIEW_ZOOM = 12;
const STATION_VIEW_ZOOM = 17;
const ME_VIEW_ZOOM = 14;
const ME_VIEW_TILT = 45;
const CIRCLE_DISTANCES = [500, 1000]; // meters

function getViewTitle(view) {
  if (view.name === "CityView") return "Hong Kong";
  if (view.name === "MeView") return "Near me";
  if (view.name === "DistrictView") return view.districtName || "District";
  if (view.name === "StationView") return view.stationName || "Unnamed Station";
  return "";
}

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

  // Specify libraries and optionally a version that supports moveCamera
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours",
    libraries,
    // version: 'beta' // Optional: You can try specifying version if needed
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

      // Use moveCamera if available
      if (typeof map.moveCamera === "function") {
        map.moveCamera(cameraOptions);
      } else {
        // Fallback if moveCamera not supported
        map.panTo(view.center);
        map.setZoom(view.zoom);
        if (view.tilt !== undefined) map.setTilt(view.tilt);
        if (view.heading !== undefined) map.setHeading(view.heading);
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
    [userLocation, navigateToView, computeDistance]
  );

  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);

    if (userLocation) {
      const meView = {
        name: "MeView",
        center: userLocation,
        zoom: ME_VIEW_ZOOM,
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
            zoom: ME_VIEW_ZOOM,
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
              border: "2px solid #000",
              borderRadius: "50%",
              cursor: "pointer",
            }}
          ></div>
        </OverlayView>
      );
    });
  }, [currentView.name, filteredStations, handleMarkerClick]);

  const userOverlay = useMemo(() => {
    if (!userLocation) return null;
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
            borderBottom: "20px solid #2171ec",
            transform: "rotate(180deg)",
          }}
        ></div>
      </OverlayView>
    );
  }, [userLocation]);

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
                    <div
                      style={{
                        background: "#fff",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "14px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        transform: "translate(-50%, -100%)",
                        whiteSpace: "nowrap",
                        border: "1px solid #ccc",
                        color: "#333",
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

        {selectedStation && (
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
