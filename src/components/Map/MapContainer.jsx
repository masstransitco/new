import React, { useState, useEffect } from "react";
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
  const [showCircles, setShowCircles] = useState(false);

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

  const handleMapClick = () => {
    setSelectedStation(null);
    setShowCircles(false);
    setDirections(null); // Clear directions
    map.panTo(center);
    map.setZoom(12);
  };

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

  const createClusterer = (mapInstance) => {
    const markers = stations.map((station) => {
      const marker = new window.google.maps.Marker({
        position: station.position,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          strokeWeight: 2,
          strokeColor: "black",
          fillColor: "white",
          fillOpacity: 1,
        },
      });

      marker.addListener("click", () => handleMarkerClick(station)); // Attach handleMarkerClick to marker

      return marker;
    });

    new MarkerClusterer({ markers, map: mapInstance });
  };

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

  useEffect(() => {
    if (map && stations.length > 0) {
      createClusterer(map);
    }
  }, [map, stations]);

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours"
      libraries={["places"]}
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
