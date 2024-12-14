// src/App.jsx
import React, { useContext, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthContext } from "./context/AuthContext";
import Header from "./components/Header/Header.jsx";
import MapContainer from "./components/Map/MapContainer.jsx";
import SceneContainer from "./components/Scene/SceneContainer.jsx";
import MotionMenu from "./components/Menu/MotionMenu.jsx";
import PulseStrip from "./components/PulseStrip/PulseStrip.jsx";
import Footer from "./components/Footer/Footer.jsx";
import "./Index.css";
import "./App.css";
import "./LoadingSpinner.css";

const LoadingSpinner = () => {
  return (
    <div className="loading-container">
      <svg className="spinner" viewBox="0 0 100 100">
        <circle className="circle" cx="50" cy="50" r="45" />
      </svg>
      <p>Initializing...</p>
    </div>
  );
};

function App() {
  const { user, loading } = useContext(AuthContext);
  
  // State to manage SceneContainer visibility and selected station
  const [isStationView, setIsStationView] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  // Handler when a station is selected in MapContainer
  const handleStationSelect = (station) => {
    setSelectedStation(station);
    setIsStationView(true);
  };

  // Handler when station view is deselected, e.g., navigating away
  const handleStationDeselect = () => {
    setSelectedStation(null);
    setIsStationView(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Header user={user} />
      <Analytics />
      <main className="main-content">
        <MapContainer 
          onStationSelect={handleStationSelect} 
          onStationDeselect={handleStationDeselect}
        />
        {isStationView && <SceneContainer selectedStation={selectedStation} />}
        <PulseStrip className="pulse-strip" />
      </main>
      <MotionMenu className="motion-menu" />
      <Footer />
    </div>
  );
}

export default App;