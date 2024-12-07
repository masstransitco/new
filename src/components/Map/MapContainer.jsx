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
  MarkerClusterer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "70vh",
};

const CITY_VIEW = {
  name: "CityView",
  center: { lat: 22.353, lng: 114.076 },
  zoom: 10,
  tilt: 45,
  heading: 0,
};

const STATION_VIEW_ZOOM = 17;
const ME_VIEW_ZOOM = 17;

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
          navigateToView({
            name: "MeView",
            center: userPos,
            zoom: ME_VIEW_ZOOM,
          });
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

  const handleMapClick = useCallback(() => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null);
  }, []);

  const markerIcon = useMemo(() => {
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
    return stations.map((station) => (
      <Marker
        key={station.id}
        position={station.position}
        onClick={() => handleMarkerClick(station)}
        icon={markerIcon}
      />
    ));
  }, [stations, handleMarkerClick, markerIcon]);

  const lastAnimationFrame = useRef(null);
  const isTouching = useRef(false);
  const isMouseDown = useRef(false);
  const lastPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!map) return;
    const mapDiv = map.getDiv();
    if (!mapDiv) return; // Check for null mapDiv

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
        onLoad={(mapInstance) => setMap(mapInstance)}
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
            {showCircles && (
              <>
                <Circle
                  center={userLocation}
                  radius={500}
                  options={{
                    strokeColor: "#FFFFFF",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillOpacity: 0,
                  }}
                />
                <Circle
                  center={userLocation}
                  radius={1000}
                  options={{
                    strokeColor: "#FFFFFF",
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillOpacity: 0,
                  }}
                />
              </>
            )}
          </>
        )}

        <MarkerClusterer
          options={{
            maxZoom: 10,
          }}
          onClick={(cluster) => {
            const clusterCenter = cluster.getCenter();
            if (!clusterCenter) return;
            const clusterView = {
              name: "ClusterView",
              center: {
                lat: clusterCenter.lat(),
                lng: clusterCenter.lng(),
              },
              zoom: map.getZoom() + 2,
            };
            navigateToView(clusterView);
          }}
        >
          {(clusterer) =>
            stationMarkers.map((marker) =>
              React.cloneElement(marker, { clusterer })
            )
          }
        </MarkerClusterer>

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

      <button
        onClick={locateMe}
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
      >
        📍
      </button>

      <button
        onClick={goBack}
        style={{
          position: "absolute",
          top: "10px",
          left: "60px",
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
