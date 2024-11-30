/* src/components/Header/Header.jsx */


import React, { useContext, useState, useEffect, useRef } from "react";
import "./Header.css";
import { AuthContext } from "../../context/AuthContext";
import GoogleSignIn from "../GoogleSignIn";

const Header = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev);
  };

  // Close the dropdown when clicking outside
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo Section */}
        <div className="logo">
          <h1>ReactMTC</h1>
        </div>

        {/* User Section */}
        <div className="user-section">
          {user ? (
            <div className="user-info" ref={dropdownRef}>
              <div
                className="user-avatar"
                onClick={toggleDropdown}
                role="button"
                tabIndex={0}
              >
                <img
                  src={user.photoURL || "/default-avatar.png"} // Fallback for missing avatar
                  alt="User Avatar"
                />
                <span className="user-name">{user.displayName || "User"}</span>
              </div>
              {dropdownVisible && (
                <div className="dropdown-menu show">
                  <ul>
                    <li>
                      <a href="/account">Account</a>
                    </li>
                    <li>
                      <a href="/activity">Activity</a>
                    </li>
                    <li>
                      <a href="/payment">Payment</a>
                    </li>
                    <li>
                      <button
                        onClick={logout}
                        className="logout-button"
                        aria-label="Logout"
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <GoogleSignIn />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
