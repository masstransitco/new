import React, { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Header from "./components/Header/Header.jsx";
import MapContainer from "./components/Map/MapContainer.jsx";
import MotionMenu from "./components/Menu/MotionMenu.jsx";
import PulseStrip from "./components/PulseStrip/PulseStrip.jsx";
import Footer from "./components/Footer/Footer.jsx";
import "./App.css";

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="loading">Initializing...</div>;
  }

  return (
    <div className="App">
      <Header user={user} />
      <main className="main-content" style={{ paddingBottom: "80px" }}>
        {/* Ensure content doesn’t overlap with the MotionMenu */}
        <MapContainer />
        <PulseStrip />
      </main>
      <MotionMenu />
      <Footer />
    </div>
  );
}

export default App;
