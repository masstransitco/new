// src/components/Map/DistrictMarkers.jsx

import React from "react";
import PropTypes from "prop-types";

const DistrictMarkers = ({ districts, onDistrictClick }) => {
  const rectHeight = 30; // Set a fixed height for the rectangles
  const padding = 10; // Padding around the text

  return (
    <>
      {districts.map((district) => {
        // Calculate the width of the rectangle based on district name
        const textWidth = district.name.length * 8; // Approximate width per character
        const rectWidth = textWidth + padding * 2; // Add padding to width

        return (
          <svg
            key={district.id}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)", // Centering the SVG
              cursor: "pointer",
              left: `${district.position.lng}px`, // Set horizontal position based on longitude
              top: `${district.position.lat}px`, // Set vertical position based on latitude
            }}
            onClick={() => onDistrictClick(district)}
            width={rectWidth}
            height={rectHeight}
            viewBox={`0 0 ${rectWidth} ${rectHeight}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
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
              filter="url(#shadow)" // Apply shadow filter
              rx="5" // Rounded corners
            />
            <text
              x={padding}
              y={rectHeight / 2}
              alignmentBaseline="middle"
              fill="#000000" // Text color
              fontSize="14"
              fontFamily="Arial"
            >
              {district.name} {/* Displaying district name */}
            </text>
          </svg>
        );
      })}
    </>
  );
};

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
