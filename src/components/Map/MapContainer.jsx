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
  Marker,
  InfoWindow,
  DirectionsRenderer,
  Circle,
  OverlayView,
} from "@react-google-maps/api";
import { HgiLocationUser03 } from "react-icons/hgi"; // Adjust the import path to your icons library

const containerStyle = {
  width: "100%",
  height: "50vh",
};

const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 11, // Increased from 10 to 11
  tilt: 45,
  heading: 0,
};

const DISTRICT_VIEW_ZOOM = 12; // Example zoom level when reverting to district clusters
const STATION_VIEW_ZOOM = 17;
const ME_VIEW_ZOOM = 17;

// Distances for the user's location circles
const CIRCLE_DISTANCES = [500, 1000]; // meters
// We'll label them e.g. "500m" and "1km"

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
    libraries: ["geometry"],
  });

  // Fetch stations data once
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
          ...feature.properties,
        }));
        setStations(features);
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
      });
  }, []);

  const navigateToView = useCallback(
    (view) => {
      setViewHistory((prevHistory) => [...prevHistory, view]);
      if (map) {
        map.panTo(view.center);
        map.setZoom(view.zoom);
        if (view.tilt !== undefined) {
          map.setTilt(view.tilt);
        }
        if (view.heading !== undefined) {
          map.setHeading(view.heading);
        }
      }
    },
    [map]
  );

  const goBack = useCallback(() => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      setViewHistory(newHistory);
      const previousView = newHistory[newHistory.length - 1];
      if (map) {
        map.panTo(previousView.center);
        map.setZoom(previousView.zoom);
        if (previousView.tilt !== undefined) {
          map.setTilt(previousView.tilt);
        }
        if (previousView.heading !== undefined) {
          map.setHeading(previousView.heading);
        }
      }
    }
  }, [map, viewHistory]);

  // Group stations by district (assuming 'District' property)
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

  const highlightIcon = useMemo(() => {
    if (!isLoaded || !google?.maps?.SymbolPath) return null;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#2171ec", // a nice uber-blue highlight
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#ffffff",
    };
  }, [isLoaded]);

  const defaultStationIcon = useMemo(() => {
    if (!isLoaded || !google?.maps?.SymbolPath) return null;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#ffffff",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#000000",
    };
  }, [isLoaded]);

  const stationMarkers = useMemo(() => {
    return stations.map((station) => {
      const isSelected = selectedStation && selectedStation.id === station.id;
      return (
        <Marker
          key={station.id}
          position={station.position}
          onClick={() => handleMarkerClick(station)}
          icon={isSelected ? highlightIcon : defaultStationIcon}
        />
      );
    });
  }, [
    stations,
    selectedStation,
    handleMarkerClick,
    highlightIcon,
    defaultStationIcon,
  ]);

  const handleMarkerClick = useCallback(
    (station) => {
      const stationView = {
        name: "StationView",
        center: station.position,
        zoom: STATION_VIEW_ZOOM,
      };
      navigateToView(stationView);
      setSelectedStation(station);
      setShowCircles(false);

      if (userLocation && isLoaded && google?.maps?.DirectionsService) {
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
      }
    },
    [userLocation, isLoaded, navigateToView]
  );

  const handleMapClick = useCallback(() => {
    // User clicked map, not a station
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);

    // Priority: If user location known, center on user (MeView)
    if (userLocation) {
      const meView = {
        name: "MeView",
        center: userLocation,
        zoom: ME_VIEW_ZOOM,
      };
      navigateToView(meView);
      return;
    }

    // Else center back to district clusters (CityView)
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

          // Instead of setting directly to ME_VIEW_ZOOM, we zoom out by 2 levels from current
          const currentZoom = map.getZoom() || CITY_VIEW.zoom;
          map.setZoom(currentZoom - 2);
          map.panTo(userPos);

          setShowCircles(true);
          setViewHistory((prev) => [
            ...prev,
            { name: "MeView", center: userPos, zoom: currentZoom - 2 },
          ]);
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
  }, [map]);

  const onLoadMap = useCallback((mapInstance) => {
    mapRef.current = mapInstance;
    setMap(mapInstance);
  }, []);

  // Helper for placing circle labels
  // We'll place text at the top of each circle (north)
  const getCircleLabelPosition = useCallback((center, radius) => {
    // Approx 0.000009 degrees of lat ~ 1 meter
    const latOffset = radius * 0.000009;
    return {
      lat: center.lat + latOffset,
      lng: center.lng,
    };
  }, []);

  // District cluster markers (shown only in CityView)
  const districtMarkers = useMemo(() => {
    // Only render these if currentView is CityView
    if (currentView.name !== "CityView") return null;

    return districtClusters.map((cluster) => (
      <Marker
        key={cluster.district}
        position={cluster.position}
        icon={{
          // Provide a custom icon or a styled marker for clusters
          url: "/path/to/your/cluster-icon.png", // Update with actual icon
          scaledSize: new window.google.maps.Size(40, 40),
        }}
        onClick={() => {
          // Zoom in or navigate to a district view if needed
          // For simplicity, let's just zoom into DistrictView level centered on this cluster
          navigateToView({
            name: "DistrictView",
            center: cluster.position,
            zoom: DISTRICT_VIEW_ZOOM,
          });
        }}
      />
    ));
  }, [currentView.name, districtClusters, navigateToView]);

  const lastAnimationFrame = useRef(null);
  const isTouching = useRef(false);
  const isMouseDown = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return;

    const applyMapTransform = (deltaX, deltaY) => {
      if (!map) return;
      const currentTilt = map.getTilt() || 0;
      const currentHeading = map.getHeading() || 0;

      let newTilt = currentTilt + deltaY * 0.1;
      newTilt = Math.max(0, Math.min(67.5, newTilt));

      let newHeading = currentHeading + deltaX * 0.5;
      newHeading = (newHeading + 360) % 360;

      map.setTilt(newTilt);
      map.setHeading(newHeading);
    };

    const handleTouchStart = (e) => {
      isTouching.current = true;
      const touch = e.touches[0];
      lastPosition.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e) => {
      if (!isTouching.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPosition.current.x;
      const deltaY = touch.clientY - lastPosition.current.y;
      lastPosition.current = { x: touch.clientX, y: touch.clientY };

      if (lastAnimationFrame.current)
        cancelAnimationFrame(lastAnimationFrame.current);
      lastAnimationFrame.current = requestAnimationFrame(() =>
        applyMapTransform(deltaX, -deltaY)
      );
    };

    const handleTouchEnd = () => {
      isTouching.current = false;
    };

    const handleMouseDown = (e) => {
      isMouseDown.current = true;
      lastPosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isMouseDown.current) return;
      const deltaX = e.clientX - lastPosition.current.x;
      const deltaY = e.clientY - lastPosition.current.y;
      lastPosition.current = { x: e.clientX, y: e.clientY };

      if (lastAnimationFrame.current)
        cancelAnimationFrame(lastAnimationFrame.current);
      lastAnimationFrame.current = requestAnimationFrame(() =>
        applyMapTransform(deltaX, deltaY)
      );
    };

    const handleMouseUp = () => {
      isMouseDown.current = false;
    };

    mapDiv.addEventListener("touchstart", handleTouchStart, { passive: true });
    mapDiv.addEventListener("touchmove", handleTouchMove, { passive: true });
    mapDiv.addEventListener("touchend", handleTouchEnd, { passive: true });

    mapDiv.addEventListener("mousedown", handleMouseDown);
    mapDiv.addEventListener("mousemove", handleMouseMove);
    mapDiv.addEventListener("mouseup", handleMouseUp);

    return () => {
      mapDiv.removeEventListener("touchstart", handleTouchStart);
      mapDiv.removeEventListener("touchmove", handleTouchMove);
      mapDiv.removeEventListener("touchend", handleTouchEnd);

      mapDiv.removeEventListener("mousedown", handleMouseDown);
      mapDiv.removeEventListener("mousemove", handleMouseMove);
      mapDiv.removeEventListener("mouseup", handleMouseUp);
    };
  }, [map]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className="map-container"
      style={{ position: "relative" }}
      ref={mapRef}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentView.center}
        zoom={currentView.zoom}
        options={{
          mapId: "94527c02bbb6243",
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
            <Marker
              position={userLocation}
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              }}
            />
            {showCircles &&
              CIRCLE_DISTANCES.map((dist, i) => (
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
                  {/* Overlay text label on top of the circle line */}
                  <OverlayView
                    position={getCircleLabelPosition(userLocation, dist)}
                    mapPaneName={OverlayView.OVERLAY_LAYER}
                  >
                    <div
                      style={{
                        background: "#fff",
                        padding: "2px 6px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
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

        {/* District clusters only on CityView */}
        {districtMarkers}

        {/* Stations (only show if not in CityView to avoid clutter) */}
        {currentView.name !== "CityView" && stationMarkers}

        {selectedStation && (
          <InfoWindow
            position={selectedStation.position}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div>
              <h3>{selectedStation.Place || "Unnamed Station"}</h3>
              <p>{selectedStation.Address || "No address available"}</p>
            </div>
          </InfoWindow>
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
        <HgiLocationUser03 style={{ color: "#2171ec", fontSize: "24px" }} />
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
