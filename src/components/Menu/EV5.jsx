/* eslint-disable react/no-unknown-property */

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber"; // React Three Fiber renderer
import { OrbitControls, useGLTF, Preload } from "@react-three/drei"; // Helper utilities
import PropTypes from "prop-types";

// Error Boundary to catch rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(/* error */) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Error loading 3D model:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ color: "red" }}>Failed to load the 3D model.</div>;
    }

    return this.props.children;
  }
}

const GLBViewer = React.memo(({ modelPath }) => {
  const gltf = useGLTF(modelPath, true); // Load the GLB model with DRACO compression if available

  return (
    <primitive object={gltf.scene} scale={[2, 2, 2]} position={[0, 1, 0]} />
  );
});

GLBViewer.propTypes = {
  modelPath: PropTypes.string.isRequired,
};

const GroundPlane = React.memo(() => {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[10, 64]} />{" "}
      {/* Increased segments for smoother appearance */}
      <meshStandardMaterial color="#e7e8ec" />
    </mesh>
  );
});

const EV5 = () => {
  // Memoize camera settings to prevent unnecessary recalculations
  const cameraSettings = useMemo(
    () => ({
      position: [15, 5, 25],
      fov: 50,
      near: 0.1,
      far: 1000,
    }),
    []
  );

  // Memoize lighting settings
  const lighting = useMemo(
    () => (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      </>
    ),
    []
  );

  // Memoize OrbitControls settings
  const orbitControlsSettings = useMemo(
    () => ({
      autoRotate: true,
      autoRotateSpeed: 1.5,
      enableZoom: true,
      minDistance: 5, // Increased for better initial view
      maxDistance: 50, // Adjusted for wider zoom range
      enablePan: false, // Disable panning for controlled interaction
    }),
    []
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100vh", // Full viewport height for better visibility
        display: "flex",
        flexDirection: "column",
        border: "1px solid #ddd",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* GLB Viewer */}
      <div style={{ flex: 3, height: "80vh", marginBottom: "10px" }}>
        <Canvas
          shadows
          camera={cameraSettings}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense fallback={<div>Loading 3D Model...</div>}>
            <ErrorBoundary>
              {lighting}
              <OrbitControls {...orbitControlsSettings} />
              <GroundPlane />
              <GLBViewer modelPath={process.env.PUBLIC_URL + "/EV5.glb"} />
              <Preload all />
            </ErrorBoundary>
          </Suspense>
        </Canvas>
      </div>

      {/* Fare Placeholder */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>
          Fare Placeholder
        </h2>
      </div>
    </div>
  );
};

export default EV5;
