// src/components/Map/MapSceneToggle.jsx

import React, {
  useContext,
  useRef,
  useEffect,
  useState,
  Suspense,
  lazy,
} from "react";
import MapContainer from "./MapContainer";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./MapSceneToggle.css";
import { AppContext } from "../../context/AppContext";

// Lazy load SceneContainer for performance optimization
const SceneContainer = lazy(() => import("../Scene/SceneContainer"));

const MapSceneToggle = () => {
  const { selectedStation, setSelectedStation } = useContext(AppContext);
  const [isSceneVisible, setIsSceneVisible] = useState(false); // Visibility state
  const mapViewRef = useRef(null);
  const sceneViewRef = useRef(null);

  // Callback to minimize the SceneContainer sidebar
  const handleSidebarMinimize = () => {
    setSelectedStation(null);
    setIsSceneVisible(false); // Hide the SceneContainer when minimized
  };

  // Store MapView instance (if needed for future enhancements)
  const handleMapViewLoad = (view) => {
    mapViewRef.current = view;
  };

  // Store SceneView instance (if needed for future enhancements)
  const handleSceneViewLoad = (view) => {
    sceneViewRef.current = view;
  };

  // Effect to toggle SceneContainer visibility based on selectedStation
  useEffect(() => {
    if (selectedStation) {
      setIsSceneVisible(true);
    } else {
      setIsSceneVisible(false);
    }
  }, [selectedStation]);

  return (
    <div className="map-scene-toggle">
      <Header />
      <MapContainer onMapViewLoad={handleMapViewLoad} />
      <Suspense
        fallback={
          <div className="scene-container hidden">Loading 3D Scene...</div>
        }
      >
        <SceneContainer
          onSceneViewLoad={handleSceneViewLoad}
          onSidebarMinimize={handleSidebarMinimize}
          isVisible={isSceneVisible} // Pass visibility prop
        />
      </Suspense>
      <Footer />
    </div>
  );
};

export default MapSceneToggle;
