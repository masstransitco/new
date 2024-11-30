/* src/components/Map/MapContainer.jsx */

import React, { useEffect, useRef } from "react";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import Locate from "@arcgis/core/widgets/Locate";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import "./MapContainer.css";

const MapContainer = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    // Initialize the WebMap
    const webmap = new WebMap({
      portalItem: {
        id: "2e977a0d176b4bb582b9d4d643dfcc4d", // Your WebMap item ID
      },
    });

    // Create a GraphicsLayer for custom graphics (concentric circles)
    const graphicsLayer = new GraphicsLayer();
    webmap.add(graphicsLayer);

    // Create the MapView
    const view = new MapView({
      container: mapRef.current, // Reference to the div element
      map: webmap, // Pass the WebMap instance
      popup: {
        dockEnabled: true,
        dockOptions: {
          position: "bottom-right",
          breakpoint: false,
        },
      },
    });

    // Add the Locate widget
    const locateWidget = new Locate({
      view: view,
      useHeadingEnabled: false,
      goToOverride: (view, options) => {
        options.target.scale = 5000; // Neighborhood scale
        return view.goTo(options.target);
      },
    });
    view.ui.add(locateWidget, "bottom-left");

    // Event: When the Locate widget locates the user
    locateWidget.on("locate", (event) => {
      const { position } = event;
      if (!position) {
        console.error("User location not available.");
        return;
      }

      const userLocation = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude,
      };

      console.log("User Location:", userLocation);

      // Smooth zoom and pan to the neighborhood scale
      view.goTo(
        {
          center: [userLocation.longitude, userLocation.latitude],
          scale: 5000, // Zoom level for neighborhood scale
        },
        {
          duration: 2000, // Smooth animation over 2 seconds
        }
      );

      // Clear existing concentric circles
      graphicsLayer.removeAll();

      // Draw concentric circles around the user location
      drawProximityCircles(userLocation, graphicsLayer);
    });

    const drawProximityCircles = (location, layer) => {
      const radii = [500, 1000, 1500]; // Meters
      const colors = ["rgba(255, 0, 0, 0.2)", "rgba(255, 165, 0, 0.2)", "rgba(0, 0, 255, 0.2)"];

      radii.forEach((radius, index) => {
        const circleGraphic = new Graphic({
          geometry: {
            type: "circle",
            center: [location.longitude, location.latitude],
            radius: radius,
            radiusUnit: "meters",
          },
          symbol: {
            type: "simple-fill",
            color: colors[index],
            outline: {
              color: "rgba(0, 0, 0, 0.5)",
              width: 1,
            },
          },
        });
        layer.add(circleGraphic);
      });

      console.log("Concentric circles added.");
    };

    // Add custom pop-up functionality
    view.on("click", (event) => {
      view.hitTest(event).then((response) => {
        // Filter results to only include features with popupTemplate
        const results = response.results.filter((result) => {
          const popupTemplate = result.graphic.popupTemplate;
          return popupTemplate && popupTemplate.title && popupTemplate.content;
        });

        if (results.length === 0) {
          // If no features are found, prompt the user to toggle a higher proximity
          view.popup.open({
            title: "No Points Found",
            content: "No points available. Try clicking closer to populated areas.",
            location: event.mapPoint,
          });
          return;
        }

        // If points are found, display the three closest points in a pop-up
        const closestPoints = results.slice(0, 3);
        const content = closestPoints
          .map((result, index) => {
            const attributes = result.graphic.attributes;
            return `<strong>${index + 1}. ${attributes.name || "No Name"}</strong><br>${attributes.description || "No Description"}`;
          })
          .join("<br><br>");

        view.popup.open({
          title: "Closest Points",
          content: content,
          location: event.mapPoint,
        });

        console.log("Pop-up opened with closest points.");
      });
    });

    return () => {
      if (view) {
        view.destroy();
      }
    };
  }, []);

  return <div ref={mapRef} className="map-container" />;
};

export default MapContainer;
