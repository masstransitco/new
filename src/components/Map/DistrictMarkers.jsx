// src/components/Map/DistrictMarkers.jsx

import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { OverlayView } from "@react-google-maps/api";

/**
 * DistrictMarkerSVG Component
 *
 * Renders the SVG for a single district marker.
 *
 * Props:
 * - rectWidth: Width of the rectangle.
 * - rectHeight: Height of the rectangle.
 * - padding: Padding around the text.
 * - name: Name of the district.
 * - filterId: Unique ID for the SVG filter.
 */
const DistrictMarkerSVG = React.memo(
  ({ rectWidth, rectHeight, padding, name, filterId }) => (
    <svg
      width={rectWidth}
      height={rectHeight}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter
          id={`shadow-${filterId}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
          <feOffset dx="2" dy="2" result="offsetblur" />
          <feFlood floodColor="rgba(0, 0, 0, 0.5)" />
          <feComposite in2="offsetblur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="0"
        y="0"
        width={rectWidth}
        height={rectHeight}
        fill="#D3D3D3" // Light gray color
        filter={`url(#shadow-${filterId})`} // Apply shadow filter with unique ID
        rx="5" // Rounded corners
      />
      <text
        x={padding}
        y={rectHeight / 2}
        alignmentBaseline="middle"
        fill="#000000" // Text color
        fontSize="12"
        fontFamily="Helvetica, Arial, sans-serif"
      >
        {name} {/* Displaying district name */}
      </text>
    </svg>
  )
);

DistrictMarkerSVG.displayName = "DistrictMarkerSVG";

DistrictMarkerSVG.propTypes = {
  rectWidth: PropTypes.number.isRequired,
  rectHeight: PropTypes.number.isRequired,
  padding: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  filterId: PropTypes.string.isRequired,
};

/**
 * DistrictMarkers Component
 *
 * Renders district markers on the Google Map using OverlayView.
 * Each marker is a custom SVG rectangle displaying the district's name.
 *
 * Props:
 * - districts: Array of district objects containing id, name, position, and description.
 * - onDistrictClick: Function to handle click events on a district marker.
 */
const DistrictMarkers = React.memo(({ districts, onDistrictClick }) => {
  const rectHeight = 30; // Fixed height for the rectangles
  const padding = 5; // Padding around the text

  // Define predefined position offsets to prevent overlaps
  const positionOffsets = useMemo(() => {
    return {
      "district-1": { latOffset: 0.0002, lngOffset: -0.0002 },
      "district-2": { latOffset: -0.0001, lngOffset: 0.0001 },
      "district-3": { latOffset: 0.0001, lngOffset: 0.0002 },
      "district-4": { latOffset: -0.0002, lngOffset: -0.0001 },
      "district-5": { latOffset: 0.00015, lngOffset: -0.00015 },
      "district-6": { latOffset: -0.00015, lngOffset: 0.00015 },
      "district-7": { latOffset: 0.00005, lngOffset: -0.00005 },
      "district-8": { latOffset: -0.00005, lngOffset: 0.00005 },
      "district-9": { latOffset: 0.00025, lngOffset: -0.00025 },
      "district-10": { latOffset: -0.00025, lngOffset: 0.00025 },
      "district-11": { latOffset: 0.0003, lngOffset: -0.0003 },
      "district-12": { latOffset: -0.0003, lngOffset: 0.0003 },
      "district-13": { latOffset: 0.00035, lngOffset: -0.00035 },
      "district-14": { latOffset: -0.00035, lngOffset: 0.00035 },
      "district-15": { latOffset: 0.0004, lngOffset: -0.0004 },
      "district-16": { latOffset: -0.0004, lngOffset: 0.0004 },
      "district-17": { latOffset: 0.00045, lngOffset: -0.00045 },
      "district-18": { latOffset: -0.00045, lngOffset: 0.00045 },
    };
  }, []);

  /**
   * Adjust the position of a district marker based on predefined offsets.
   *
   * @param {Object} district - The district object.
   * @returns {Object} - The adjusted position with lat and lng.
   */
  const getAdjustedPosition = useCallback(
    (district) => {
      const offsets = positionOffsets[district.id] || {
        latOffset: 0,
        lngOffset: 0,
      };
      return {
        lat: district.position.lat + offsets.latOffset,
        lng: district.position.lng + offsets.lngOffset,
      };
    },
    [positionOffsets]
  );

  /**
   * Memoize processed districts with adjusted positions to prevent unnecessary recalculations.
   */
  const processedDistricts = useMemo(() => {
    return districts.map((district) => ({
      ...district,
      adjustedPosition: getAdjustedPosition(district),
    }));
  }, [districts, getAdjustedPosition]);

  /**
   * Calculate marker widths based on district names.
   */
  const markers = useMemo(() => {
    return processedDistricts.map((district) => {
      // Calculate the width of the rectangle based on district name
      const textWidth = district.name.length * 8; // Approximate width per character
      const rectWidth = textWidth + padding * 2; // Add padding to width

      return (
        <OverlayView
          key={district.id}
          position={district.adjustedPosition}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET} // Ensures the overlay receives mouse and touch events
        >
          <div
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)", // Center the overlay
              cursor: "pointer",
              pointerEvents: "auto", // Ensure the div can receive pointer events
            }}
            onClick={() => onDistrictClick(district)}
            role="button"
            aria-label={`District: ${district.name}`}
            tabIndex={0} // Make the div focusable for accessibility
            onKeyPress={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onDistrictClick(district);
              }
            }}
          >
            <DistrictMarkerSVG
              rectWidth={rectWidth}
              rectHeight={rectHeight}
              padding={padding}
              name={district.name}
              filterId={district.id}
            />
          </div>
        </OverlayView>
      );
    });
  }, [processedDistricts, onDistrictClick, padding, rectHeight]);

  return <>{markers}</>;
});

DistrictMarkers.displayName = "DistrictMarkers";

DistrictMarkers.propTypes = {
  districts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      position: PropTypes.shape({
        lat: PropTypes.number.isRequired,
        lng: PropTypes.number.isRequired,
      }).isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  onDistrictClick: PropTypes.func.isRequired,
};

export default DistrictMarkers;
