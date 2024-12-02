import React, { useState, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "50vh",
};

const center = {
  lat: 22.3964, // Default center: Hong Kong
  lng: 114.1095,
};

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

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [walkingTime, setWalkingTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load GeoJSON data with error handling
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
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error);
        alert("Failed to load station data. Please try again later.");
        setIsLoading(false);
      });
  }, []);

  const debounce = (func, delay) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func(...args), delay);
    };
  };

  const onPlaceChanged = debounce(() => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place && place.geometry) {
        map.panTo(place.geometry.location);
        map.setZoom(15);
      }
    }
  }, 300);

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

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

  const handleMarkerClick = (station) => {
    setSelectedStation(station);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userPos);

          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(
            {
              origin: userPos,
              destination: station.position,
              travelMode: "WALKING",
            },
            (result, status) => {
              if (status === "OK" && result?.routes?.[0]?.legs?.[0]) {
                setDirections(result);
                setWalkingTime(result.routes[0].legs[0].duration.text);

                const bounds = new window.google.maps.LatLngBounds();
                result.routes[0].overview_path.forEach((point) =>
                  bounds.extend(point)
                );
                map.fitBounds(bounds);
              } else {
                console.error("Directions request failed:", status);
                alert("Could not calculate walking route.");
              }
            }
          );
        },
        (error) => {
          console.error("Error fetching user location:", error);
          alert(
            "Unable to access your location. Please ensure location services are enabled."
          );
        }
      );
    }
  };

  useEffect(() => {
    // Center map dynamically based on stations and user location
    if (map && stations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      stations.forEach((station) => bounds.extend(station.position));
      if (userLocation) bounds.extend(userLocation);
      map.fitBounds(bounds);
    }
  }, [map, stations, userLocation]);

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours"
      libraries={["places"]}
    >
      {isLoading && <div className="loading-indicator">Loading Map...</div>}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          styles: darkGrayMapStyle,
          streetViewControl: false,
          mapTypeControl: false,
        }}
        onLoad={onMapLoad}
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
          onPlaceChanged={onPlaceChanged}
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

        {/* Markers for Stations */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={station.position}
            onClick={() => handleMarkerClick(station)}
          />
        ))}

        {/* Marker for User Location */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            }}
          />
        )}

        {/* Info Window for Selected Station */}
        {selectedStation && (
          <InfoWindow
            position={selectedStation.position}
            onCloseClick={() => setSelectedStation(null)}
          >
            <div>
              <h3>{selectedStation?.Place || "Unnamed Station"}</h3>
              <p>{selectedStation?.Address || "No address available"}</p>
              {walkingTime && (
                <p>
                  <strong>Walking Time:</strong> {walkingTime}
                </p>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Display Directions */}
        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapContainer;
