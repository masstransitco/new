import React, { useState, useEffect } from "react";
import Header from "./components/Header/Header.jsx";
import MapContainer from "./components/MapContainer/MapContainer.jsx";
import SceneContainer from "./components/SceneContainer/SceneContainer.jsx";
import Footer from "./components/Footer/Footer.jsx";
import { auth } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import "./App.css";

function App() {
  const [user, setUser] = useState(null); // State to track authenticated user

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Set the user state whenever authentication state changes
    });

    return () => unsubscribe(); // Cleanup subscription on component unmount
  }, []);

  return (
    <div className="App">
      <Header user={user} setUser={setUser} />
      <main className="main-content">
        <MapContainer />
        <SceneContainer />
      </main>
      <Footer />
    </div>
  );
}

export default App;
