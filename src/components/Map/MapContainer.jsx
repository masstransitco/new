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
  height: "100vh",
};

const center = {
  lat: 22.3964, // Default center: Hong Kong
  lng: 114.1095,
};

const MapContainer = () => {
  const [map, setMap] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [walkingTime, setWalkingTime] = useState("");

  useEffect(() => {
    // Load GeoJSON data
    fetch("./stations.geojson") // Replace with your hosted GeoJSON file path
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
      .catch((error) => console.error("Error loading GeoJSON:", error));
  }, []);

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  const onPlaceChanged = () => {
    if (searchBox) {
      const place = searchBox.getPlace();
      if (place && place.geometry) {
        map.panTo(place.geometry.location);
        map.setZoom(15);
      }
    }
  };

  const handleMarkerClick = (station) => {
    setSelectedStation(station);

    // Trigger user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(userPos);

          // Calculate and draw pedestrian route
          const directionsService = new window.google.maps.DirectionsService();
          directionsService.route(
            {
              origin: userPos,
              destination: station.position,
              travelMode: "WALKING",
            },
            (result, status) => {
              if (status === "OK") {
                setDirections(result);

                // Calculate estimated walking time
                const duration = result.routes[0].legs[0].duration.text;
                setWalkingTime(duration);

                // Center the map to fit the route
                const bounds = new window.google.maps.LatLngBounds();
                result.routes[0].overview_path.forEach((point) => {
                  bounds.extend(point);
                });
                map.fitBounds(bounds);
              } else {
                console.error("Directions request failed:", status);
              }
            }
          );
        },
        (error) => {
          console.error("Error fetching user location:", error);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours"
      libraries={["places"]}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
      >
        {/* Search Bar */}
        <Autocomplete
          onLoad={(autocomplete) => setSearchBox(autocomplete)}
          onPlaceChanged={onPlaceChanged}
        >
          <input
            type="text"
            placeholder="Search for a location"
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
              <h3>{selectedStation.PLace}</h3>
              <p>{selectedStation.Address}</p>
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
