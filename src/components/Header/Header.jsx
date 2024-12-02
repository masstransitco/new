/* src/components/Header/Header.jsx */

import React, { useContext, useState, useEffect, useRef } from "react";
import "./Header.css";
import { AuthContext } from "../../context/AuthContext";
import GoogleSignIn from "../GoogleSignIn";
import classNames from "classnames";

const Header = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev);
  };

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownVisible(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setDropdownVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const avatarSrc =
    typeof user?.photoURL === "string" ? user.photoURL : "/default-avatar.png";
  const displayName =
    typeof user?.displayName === "string" ? user.displayName : "User";

  return (
    <header className="header">
      <div className="header-content">
        {/* Logo Section */}
        <div className="logo">
          <img src="logo.png" alt="ReactMTC Logo" className="logo-image" />
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
                aria-expanded={dropdownVisible}
                aria-controls="user-dropdown"
              >
                <img src={avatarSrc} alt="User Avatar" />
                <span className="user-name">{displayName}</span>
              </div>
              <div
                id="user-dropdown"
                className={classNames("dropdown-menu", {
                  show: dropdownVisible,
                })}
              >
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
                    <a
                      href="#logout"
                      onClick={(e) => {
                        e.preventDefault();
                        logout();
                      }}
                      className="logout-button"
                      aria-label="Logout"
                    >
                      Logout
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="google-signin-wrapper">
              <GoogleSignIn />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
