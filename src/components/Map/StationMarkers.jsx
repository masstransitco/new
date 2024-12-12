// src/components/Map/StationMarkers.jsx
import React from "react";
import { Marker } from "@react-google-maps/api";

const StationMarkers = ({ stations, onStationClick, selectedStations }) => {
  return (
    <>
      {stations.map((station) => {
        const isSelected =
          selectedStations.departure?.id === station.id ||
          selectedStations.destination?.id === station.id;
        return (
          <Marker
            key={station.id}
            position={station.position}
            onClick={() => onStationClick(station)}
            icon={{
              url: isSelected
                ? "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              scaledSize: { width: 24, height: 24 },
            }}
          />
        );
      })}
    </>
  );
};

export default React.memo(StationMarkers);
