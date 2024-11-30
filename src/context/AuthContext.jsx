// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { auth } from "../services/firebase"; // Correct path
import { onAuthStateChanged, signOut } from "firebase/auth";

// Create the Context
export const AuthContext = createContext();

// Create the Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const logout = () => {
    signOut(auth)
      .then(() => {
        console.log("User signed out.");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        auth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
