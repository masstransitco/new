import React, { useState, useEffect, useCallback } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  DirectionsRenderer,
  Circle,
  Autocomplete,
} from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const containerStyle = {
  width: "100%",
  height: "50vh",
};

const center = {
  lat: 22.3964,
  lng: 114.1095,
};

// Custom Map Styles (Dark Gray)
const darkGrayMapStyle = [
  {
    featureType: "all",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ visibility: "simplified" }, { color: "#2c2c2c" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#1f1f1f" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e0e0e" }],
  },
];

// Custom Cluster Icon Creation
const createClusterIcon = (cluster) => {
  const count = cluster.getSize();
  const div = document.createElement("div");
  div.style.background = "white";
  div.style.borderRadius = "50%";
  div.style.width = "40px";
  div.style.height = "40px";
  div.style.display = "flex";
  div.style.justifyContent = "center";
  div.style.alignItems = "center";
  div.style.color = "#000";
  div.style.fontSize = "14px";
  div.style.fontWeight = "bold";
  div.textContent = count.toString();
  return div;
};

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showCircles, setShowCircles] = useState(false);
  const [markerClusterer, setMarkerClusterer] = useState(null);

  // Fetch Stations Data
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
        alert("Failed to load station data. Please try again later.");
      });
  }, []);

  // Initialize Map and Clusterer
  const onMapLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      // Fit bounds to show all markers
      const bounds = new window.google.maps.LatLngBounds();
      stations.forEach((station) => bounds.extend(station.position));
      mapInstance.fitBounds(bounds);

      // Initialize MarkerClusterer with custom icons
      const clusterer = new MarkerClusterer({
        map: mapInstance,
        markers: [],
        renderer: {
          render: (cluster) => {
            return createClusterIcon(cluster);
          },
        },
      });

      // Create Markers
      const markers = stations.map((station) => {
        const marker = new window.google.maps.Marker({
          position: station.position,
          label: "", // Start with no label
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#ffffff",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#000000",
          },
        });

        marker.addListener("click", () => handleMarkerClick(station));
        return marker;
      });

      clusterer.addMarkers(markers);
      setMarkerClusterer(clusterer);

      // Listen for clustering events to toggle labels
      clusterer.addListener("clusteringend", () => {
        const clusters = clusterer.getClusters();
        const clustersVisible = clusters.some(
          (cluster) => cluster.getSize() > 1
        );

        markers.forEach((marker) => {
          // Show "1" label only if clusters are visible
          if (clustersVisible) {
            marker.setLabel({
              text: "1",
              color: "#000",
              fontSize: "12px",
              fontWeight: "bold",
            });
          } else {
            marker.setLabel("");
          }
        });
      });
    },
    [stations]
  );

  // Locate User
  const locateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userPos);
          map.panTo(userPos);
          map.setZoom(15);
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
  };

  // Handle Map Clicks
  const handleMapClick = (event) => {
    if (markerClusterer) {
      const clusters = markerClusterer.getClusters();
      const clickedLatLng = event.latLng;
      const closestCluster = findClosestCluster(clickedLatLng, clusters);

      if (
        closestCluster &&
        isWithinClusterVisibility(closestCluster, clickedLatLng)
      ) {
        // Snap to the closest cluster
        map.panTo(closestCluster.getCenter());
        map.setZoom(map.getZoom() + 2); // Adjust zoom as needed
      } else if (!clusters.some((cluster) => cluster.isShowing())) {
        // If only individual markers are visible, re-center to initial view
        const bounds = new window.google.maps.LatLngBounds();
        stations.forEach((station) => bounds.extend(station.position));
        map.fitBounds(bounds);
      }

      setSelectedStation(null);
      setShowCircles(false);
      setDirections(null);
    }
  };

  // Find the closest cluster to the clicked position
  const findClosestCluster = (latLng, clusters) => {
    let closest = null;
    let minDistance = Infinity;
    clusters.forEach((cluster) => {
      const distance =
        window.google.maps.geometry.spherical.computeDistanceBetween(
          cluster.getCenter(),
          latLng
        );
      if (distance < minDistance) {
        minDistance = distance;
        closest = cluster;
      }
    });
    return closest;
  };

  // Determine if the clicked position is within a cluster's bounds
  const isWithinClusterVisibility = (cluster, latLng) => {
    const bounds = cluster.getBounds();
    return bounds.contains(latLng);
  };

  // Handle Marker Click
  const handleMarkerClick = (station) => {
    setSelectedStation(station);
    setShowCircles(false);

    if (userLocation) {
      const directionsService = new window.google.maps.DirectionsService();
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

    map.panTo(station.position);
    map.setZoom(15);
  };

  // Handle Search
  const handleSearch = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place && place.geometry) {
        const location = place.geometry.location;
        map.panTo(location);
        map.setZoom(15);
      }
    }
  };

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours" // Replace with your API key
      libraries={["places", "geometry"]}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          styles: darkGrayMapStyle,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          zoomControl: false, // Remove zoom buttons
          gestureHandling: "none", // Disable all user gestures
          rotateControl: false, // Disable rotation
        }}
        onLoad={onMapLoad}
        onClick={handleMapClick}
      >
        {/* Locate Me Button */}
        <button
          onClick={locateMe}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 10,
            padding: "10px 15px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Locate Me
        </button>

        {/* Search Bar */}
        <Autocomplete
          onLoad={(autocomplete) => setSearchBox(autocomplete)}
          onPlaceChanged={handleSearch}
        >
          <input
            type="text"
            placeholder="Search for a location"
            aria-label="Location search"
            style={{
              position: "absolute",
              top: "10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "300px",
              padding: "10px",
              zIndex: 10,
            }}
          />
        </Autocomplete>

        {/* User Location Marker */}
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

        {/* Selected Station InfoWindow */}
        {selectedStation && (
          <InfoWindow
            position={selectedStation.position}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div>
              <h3>{selectedStation?.Place || "Unnamed Station"}</h3>
              <p>{selectedStation?.Address || "No address available"}</p>
            </div>
          </InfoWindow>
        )}

        {/* Directions */}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapContainer;
