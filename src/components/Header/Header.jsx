/* src/components/Header/Header.jsx */

import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import "./Header.css";
import { AuthContext } from "../../context/AuthContext";
import classNames from "classnames";

const Header = () => {
  // Destructure googleSignIn from AuthContext
  const { user, loading, logout, googleSignIn } = useContext(AuthContext);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const firstDropdownItemRef = useRef(null);

  const toggleDropdown = useCallback(() => {
    setDropdownVisible((prev) => !prev);
  }, []);

  const handleClickOutside = useCallback(
    (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    },
    [dropdownRef]
  );

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Escape") {
      setDropdownVisible(false);
    }
  }, []);

  const handleAvatarKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleDropdown();
      }
    },
    [toggleDropdown]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClickOutside, handleKeyDown]);

  useEffect(() => {
    if (dropdownVisible && firstDropdownItemRef.current) {
      firstDropdownItemRef.current.focus();
    }
  }, [dropdownVisible]);

  if (loading && !user) {
    return (
      <div className="loading">
        <div className="spinner" aria-label="Loading"></div>
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
          <img src="/logo.png" alt="ReactMTC Logo" className="logo-image" />
        </div>

        {/* User Section */}
        <div className="user-section">
          {user ? (
            <div className="user-info" ref={dropdownRef}>
              <button
                className="user-avatar-button"
                onClick={toggleDropdown}
                onKeyDown={handleAvatarKeyDown}
                aria-expanded={dropdownVisible}
                aria-controls="user-dropdown"
                aria-haspopup="true"
              >
                <img src={avatarSrc} alt="User Avatar" />
                <span className="user-name">{displayName}</span>
              </button>
              <div
                id="user-dropdown"
                className={classNames("dropdown-menu", {
                  show: dropdownVisible,
                })}
                role="menu"
                aria-labelledby="user-avatar-button"
              >
                <ul>
                  <li role="none">
                    <a
                      href="/account"
                      role="menuitem"
                      ref={firstDropdownItemRef}
                    >
                      Account
                    </a>
                  </li>
                  <li role="none">
                    <a href="/activity" role="menuitem">
                      Activity
                    </a>
                  </li>
                  <li role="none">
                    <a href="/payment" role="menuitem">
                      Payment
                    </a>
                  </li>
                  <li role="none">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        logout();
                      }}
                      className="logout-button"
                      aria-label="Logout"
                      role="menuitem"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="google-signin-wrapper">
              {/* Google Sign-In Button */}
              <button
                className="gsi-material-button"
                onClick={googleSignIn}
                disabled={loading}
                aria-label="Sign in with Google"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    {/* SVG Icon */}
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      xmlnsXlink="http://www.w3.org/1999/xlink"
                      style={{ display: "block" }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 
                        24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 
                        6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 
                        2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 
                        7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 
                        16.46 0 20.12 0 24c0 3.88.92 7.54 
                        2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 
                        2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 
                        6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {loading ? "Signing in..." : "Sign In"}
                  </span>
                  <span style={{ display: "none" }}>Sign in with Google</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
