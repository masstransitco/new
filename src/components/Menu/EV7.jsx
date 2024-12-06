/* eslint-disable react/no-unknown-property */
import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Preload,
  Html,
  Environment,
} from "@react-three/drei";
import PropTypes from "prop-types";

// Error Boundary to catch rendering errors related to the 3D component tree
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
      return (
        <div style={{ color: "red", fontWeight: "bold", padding: "10px" }}>
          Failed to load the 3D model.
        </div>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

// GLBViewer Component: Loads and displays the GLB model
const GLBViewerComponent = ({ modelPath }) => {
  const gltf = useGLTF(modelPath, true);

  return (
    <primitive object={gltf.scene} scale={[2, 2, 2]} position={[0, 1, 0]} />
  );
};

GLBViewerComponent.propTypes = {
  modelPath: PropTypes.string.isRequired,
};

const GLBViewer = React.memo(GLBViewerComponent);
GLBViewer.displayName = "GLBViewer";

// GroundPlane: A simple ground plane for reference
const GroundPlaneComponent = () => {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <circleGeometry args={[10, 64]} />
      <meshStandardMaterial color="#e7e8ec" />
    </mesh>
  );
};

const GroundPlane = React.memo(GroundPlaneComponent);
GroundPlane.displayName = "GroundPlane";

// Main Component
const EV7 = () => {
  const cameraSettings = useMemo(
    () => ({
      position: [15, 5, 25],
      fov: 50,
      near: 0.1,
      far: 1000,
    }),
    []
  );

  const lighting = useMemo(
    () => (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      </>
    ),
    []
  );

  const orbitControlsSettings = useMemo(
    () => ({
      autoRotate: true,
      autoRotateSpeed: 1.5,
      enableZoom: true,
      minDistance: 5,
      maxDistance: 50,
      enablePan: false,
    }),
    []
  );

  return (
    <div
      style={{
        width: "100%",
        height: "15vh",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        borderBottom: "1px solid #ddd",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* Left Panel: 3D Viewer */}
      <div
        style={{
          flex: "0 0 20%",
          height: "100%",
          position: "relative",
        }}
      >
        <Canvas
          shadows
          camera={cameraSettings}
          style={{ width: "100%", height: "100%" }}
        >
          <Suspense
            fallback={
              <Html center>
                <div
                  style={{
                    background: "#fff",
                    padding: "10px 20px",
                    borderRadius: "5px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                  }}
                >
                  Loading 3D Model...
                </div>
              </Html>
            }
          >
            <ErrorBoundary>
              {lighting}
              <OrbitControls {...orbitControlsSettings} />
              <GroundPlane />
              {/* Adding Environment */}
              <Environment preset="studio" />
              <GLBViewer modelPath={process.env.PUBLIC_URL + "/EV7.glb"} />
              <Preload all />
            </ErrorBoundary>
          </Suspense>
        </Canvas>
      </div>

      {/* Right Panel: Placeholder for Fare or other UI content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          height: "100%",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#333" }}>
          Fare Placeholder
        </h2>
      </div>
    </div>
  );
};

export default EV7;
