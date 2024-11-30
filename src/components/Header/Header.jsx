import React, { useContext, useState } from "react";
import "./Header.css";
import { AuthContext } from "../../context/AuthContext";
import GoogleSignIn from "../GoogleSignIn";

const Header = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev);
  };

  if (loading) {
    // Show loading state while auth is initializing
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
            <div className="user-info">
              <div
                className="user-avatar"
                onClick={toggleDropdown}
                role="button"
                tabIndex={0}
              >
                <img src={user.photoURL} alt="User Avatar" />
                <span className="user-name">{user.displayName}</span>
              </div>
              {dropdownVisible && (
                <div className="dropdown-menu">
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
                    <li onClick={logout}>Logout</li>
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
