import React from "react";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext"; // Use AuthContext for user state
import Header from "./components/Header/Header.jsx";
import MapContainer from "./components/Map/MapContainer.jsx";
import SceneContainer from "./components/Scene/SceneContainer.jsx";
import Footer from "./components/Footer/Footer.jsx";
import "./App.css";

function App() {
  const { user, loading } = useContext(AuthContext); // Access AuthContext for user and loading states

  if (loading) {
    // Display loading state until auth is initialized
    return <div className="loading">Initializing...</div>;
  }

  return (
    <div className="App">
      <Header user={user} />
      <main className="main-content">
        <MapContainer />
        <SceneContainer />
      </main>
      <Footer />
    </div>
  );
}

export default App;
