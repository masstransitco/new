// src/components/GoogleSignIn.jsx

import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import "./GoogleSignIn.css";

const GoogleSignIn = () => {
  const { auth } = useContext(AuthContext);

  const handleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // Successful sign-in
        console.log("User signed in:", result.user);
      })
      .catch((error) => {
        console.error("Error signing in:", error);
      });
  };

  return (
    <button className="google-signin-button" onClick={handleSignIn}>
      Sign in with Google
    </button>
  );
};

export default GoogleSignIn;
