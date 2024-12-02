import React, { useEffect, useRef } from "react";

const MapScene = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyA8rDrxBzMRlgbA7BQ2DoY31gEXzZ4Ours&client=880316754524-m88cmb6dla3pf3i51p3ph26ecnv49ja7.apps.googleusercontent.com&libraries=maps`;
      script.async = true;
      script.onload = initMap;
      document.body.appendChild(script);
    };

    const initMap = () => {
      fetch("/stations.geojson")
        .then((response) => response.json())
        .then((geojsonData) => {
          const hongKongBounds = {
            north: 22.568,
            south: 22.153,
            west: 113.837,
            east: 114.423,
          };

          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 22.3964, lng: 114.1095 }, // Hong Kong center
            zoom: 17,
            tilt: 45,
            heading: 0,
            restriction: {
              latLngBounds: hongKongBounds,
              strictBounds: false, // Allows some movement outside bounds but not zoom out beyond it
            },
            minZoom: 10, // Minimum zoom level to show all of Hong Kong
            maxZoom: 20, // Maximum zoom for details
          });

          // Add the photorealistic 3D Tiles Layer
          const tilesLayer = new google.maps.PhotoRealistic3DTilesLayer({
            map: map,
          });

          const stationLocations = geojsonData.features.map(
            (feature) => feature.geometry.coordinates
          );

          // Mask buildings not matching station locations
          tilesLayer.setOptions({
            featureFilter: (feature) => {
              const { lat, lng } = feature.position || {};
              return stationLocations.some(([stationLng, stationLat]) =>
                isSameLocation(
                  { lat, lng },
                  { lat: stationLat, lng: stationLng }
                )
              );
            },
          });

          // Hide labels for city, district, and streets
          map.setOptions({
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "road",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "administrative",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
              {
                featureType: "transit",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          });
        })
        .catch((err) => console.error("Error loading GeoJSON data:", err));
    };

    const isSameLocation = (pos1, pos2) => {
      const tolerance = 0.0001;
      return (
        Math.abs(pos1.lat - pos2.lat) < tolerance &&
        Math.abs(pos1.lng - pos2.lng) < tolerance
      );
    };

    loadGoogleMaps();
  }, []);

  return <div ref={mapRef} style={{ width: "100%", height: "100vh" }} />;
};

export default MapScene;
