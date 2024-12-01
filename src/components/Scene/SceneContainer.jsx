/* src/components/Scene/SceneContainer.jsx */

import React, { useEffect, useRef, useState } from "react";
import WebScene from "@arcgis/core/WebScene";
import SceneView from "@arcgis/core/views/SceneView";
import OrbitLocationCameraController from "@arcgis/core/views/3d/OrbitLocationCameraController"; // Correct import for OrbitLocationCameraController
import Point from "@arcgis/core/geometry/Point";
import Viewpoint from "@arcgis/core/Viewpoint";
import "./SceneContainer.css";

const SceneContainer = () => {
  const sceneRef = useRef(null); // Reference to the DOM container
  const sceneViewRef = useRef(null); // Reference to store SceneView instance
  const [initialViewpoint, setInitialViewpoint] = useState(null); // State to store initial viewpoint

  useEffect(() => {
    // Initialize the WebScene with the provided item ID
    const webScene = new WebScene({
      portalItem: {
        id: "4304b6c3b2084330b4a2153da9fbbcf0", // Replace with your WebScene item ID
      },
    });

    // Create the SceneView
    const sceneView = new SceneView({
      container: sceneRef.current, // Reference to the div element
      map: webScene, // Pass the WebScene instance
      constraints: {
        minZoom: 10,
        maxZoom: 20, // Limit zoom range
      },
    });

    // Store the SceneView instance in ref for later use
    sceneViewRef.current = sceneView;

    // Set the initial viewpoint to Hong Kong
    const hongKongPoint = new Point({
      longitude: 114.1694,
      latitude: 22.3193,
      spatialReference: { wkid: 4326 }, // WGS84
    });

    const initialVP = new Viewpoint({
      targetGeometry: hongKongPoint,
      zoom: 12, // Initial zoom level
    });

    // Apply initial viewpoint and save it for resetting
    sceneView
      .when(() => {
        webScene
          .when(() => {
            const slides = webScene.presentation.slides;
            if (slides.length > 0) {
              const slide1 = slides.getItemAt(0); // Get Slide 1 (index 0)
              slide1
                .applyTo(sceneView)
                .then(() => {
                  setInitialViewpoint(slide1.viewpoint);
                  console.log("Initial viewpoint set to Slide 1.");
                })
                .catch((error) => {
                  console.error("Error applying slide viewpoint:", error);
                });
            } else {
              // If no slides, apply the initial Hong Kong viewpoint
              sceneView
                .goTo(initialVP)
                .then(() => {
                  setInitialViewpoint(initialVP);
                  console.log("Initial viewpoint set to Hong Kong.");
                })
                .catch((error) => {
                  console.error("Error setting initial viewpoint:", error);
                });
            }
          })
          .catch((error) => {
            console.error("Error loading WebScene:", error);
          });
      })
      .catch((error) => {
        console.error("Error initializing SceneView:", error);
      });

    // Restrict pointer movement and zooming
    const restrictInteractions = () => {
      // Prevent panning and rotating
      sceneView.on("pointer-move", (event) => {
        event.stopPropagation(); // Prevent default pointer movement
      });

      // Disable zooming with mouse wheel
      sceneView.on("mouse-wheel", (event) => {
        event.preventDefault(); // Disable zooming
      });

      // Optionally, disable other interactions as needed
    };

    restrictInteractions();

    // Function to update camera position for spherical orbit
    const orbitCamera = (target) => {
      try {
        sceneView
          .goTo(
            {
              target: target,
              heading: sceneView.camera.heading, // Maintain current heading
              tilt: sceneView.camera.tilt, // Maintain current tilt
            },
            { duration: 2000 } // Smooth transition in 2 seconds
          )
          .then(() => {
            console.log("Camera transition complete. Orbit enabled.");

            // Create an OrbitLocationCameraController
            const orbitController = new OrbitLocationCameraController(
              target,
              1000
            ); // 1000 meters orbit distance

            // Set camera properties
            orbitController.headingOffset = 45; // degrees
            orbitController.pitchOffset = 45; // degrees

            // Apply the controller to the scene view
            sceneView.cameraController = orbitController;
          })
          .catch((error) => {
            console.error("Error during camera transition:", error);
          });
      } catch (error) {
        console.error("Error orbiting the camera:", error);
      }
    };

    // Function to enable orbit camera based on clicked feature
    const enableOrbitCamera = (graphic) => {
      const targetPoint = graphic.geometry;
      if (targetPoint) {
        orbitCamera(targetPoint);
      } else {
        console.warn("Clicked graphic does not have geometry.");
      }
    };

    // Click event to detect feature clicks and orbit camera
    const handleClick = (event) => {
      sceneView
        .hitTest(event)
        .then((response) => {
          if (response.results.length > 0 && response.results[0].graphic) {
            const clickedGraphic = response.results[0].graphic;
            console.log("Feature clicked:", clickedGraphic);
            enableOrbitCamera(clickedGraphic);
          } else {
            console.warn("No valid point feature was clicked.");
          }
        })
        .catch((error) => {
          console.error("HitTest failed:", error);
        });
    };

    sceneView.on("click", handleClick);

    // Cleanup function to destroy the SceneView on component unmount
    return () => {
      if (sceneView) {
        sceneView.destroy();
        console.log("SceneView destroyed.");
      }
    };
  }, []);

  // Handler for Reset Button
  const handleResetCamera = () => {
    const sceneView = sceneViewRef.current;
    if (sceneView && initialViewpoint) {
      sceneView
        .goTo(initialViewpoint, {
          duration: 1000, // Animate the transition over 1 second
        })
        .then(() => {
          // Remove any custom camera controller
          sceneView.cameraController = null;
          console.log(
            "Camera reset to initial viewpoint and orbit controller removed."
          );
        })
        .catch((error) => {
          console.error("Error resetting camera viewpoint:", error);
        });
    }
  };

  return (
    <div className="scene-container">
      {/* Reset Button */}
      <div className="ui-controls">
        <button className="reset-button" onClick={handleResetCamera}>
          Clear Selection and Reset View
        </button>
      </div>

      {/* SceneView Container */}
      <div ref={sceneRef} className="scene-view" />
    </div>
  );
};

export default SceneContainer;
