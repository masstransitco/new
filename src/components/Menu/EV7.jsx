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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
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

const GLBViewerComponent = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath, true);
  return (
    <primitive object={scene} scale={[10, 10, 10]} position={[0, 2.1, 0]} />
  );
};

GLBViewerComponent.propTypes = {
  modelPath: PropTypes.string.isRequired,
};

const GLBViewer = React.memo(GLBViewerComponent);
GLBViewer.displayName = "GLBViewer";

const GroundPlaneComponent = () => (
  <mesh rotation-x={-Math.PI / 2} receiveShadow>
    <circleGeometry args={[10, 64]} />
    <meshStandardMaterial color="#e7e8ec" />
  </mesh>
);

const GroundPlane = React.memo(GroundPlaneComponent);
GroundPlane.displayName = "GroundPlane";

const EV7 = () => {
  const cameraSettings = useMemo(
    () => ({
      position: [20, 10, 25],
      fov: 30,
      near: 0.5,
      far: 100,
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
      enableZoom: false,
      minDistance: 5,
      maxDistance: 50,
      enablePan: false,
      maxPolarAngle: Math.PI / 2,
    }),
    []
  );

  return (
    <div
      style={{
        width: "80px",
        height: "10vh", // smaller height for bottom bar
        overflow: "hidden",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
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
                Loading...
              </div>
            </Html>
          }
        >
          <ErrorBoundary>
            {lighting}
            <OrbitControls {...orbitControlsSettings} />
            <GroundPlane />
            <Environment preset="studio" />
            <Preload all />
            <GLBViewer modelPath={process.env.PUBLIC_URL + "/EV7.glb"} />
          </ErrorBoundary>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default EV7;
