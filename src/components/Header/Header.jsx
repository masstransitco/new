// src/components/Header/Header.jsx

import React, { useContext } from "react";
import "./Header.css";
import { AuthContext } from "../../context/AuthContext";
import GoogleSignIn from "../GoogleSignIn";

const Header = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <ToggleSwitch
        isOn={currentMarkerType === "Stations"}
        handleToggle={handleToggle}
      />
      {user ? (
        <div className="user-section">
          <div className="user-avatar">
            <img src={user.photoURL} alt="User Avatar" />
          </div>
          {/* Implement Dropdown here as previously */}
          {/* Example Logout Button */}
          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      ) : (
        <GoogleSignIn />
      )}
    </header>
  );
};

export default Header;
