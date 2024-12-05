/* eslint-disable react/no-unknown-property */

import React from "react";
import { Canvas } from "@react-three/fiber"; // React Three Fiber renderer
import { OrbitControls, useGLTF } from "@react-three/drei"; // Helper utilities

const GLBViewer = ({ modelPath }) => {
  const gltf = useGLTF(modelPath); // Load the GLB model
  return <primitive object={gltf.scene} />;
};

const GroundPlane = () => {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <circleGeometry args={[10, 32]} /> {/* Radius of 10 and 32 segments */}
      <meshStandardMaterial color={"#A0522D"} />
    </mesh>
  );
};

const EV5 = () => {
  return (
    <div
      style={{
        width: "90vw",
        height: "28vh",
        display: "flex",
        border: "1px solid #ddd",
        padding: "10px",
      }}
    >
      {/* GLB Viewer */}
      <div style={{ flex: "1", height: "25vh" }}>
        <Canvas>
          {/* Add lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <hemisphereLight
            skyColor={"white"}
            groundColor={"#444444"}
            intensity={0.5}
          />
          <pointLight position={[5, 5, 5]} intensity={1} />

          {/* Set initial camera position for zoom effect */}
          <perspectiveCamera makeDefault position={[0, 0, 10]} fov={75} />

          {/* OrbitControls for animation */}
          <OrbitControls
            autoRotate
            autoRotateSpeed={1.5}
            enableZoom={true}
            minDistance={5} // Minimum zoom distance (closer)
            maxDistance={20} // Maximum zoom distance (further)
          />

          {/* Ground Plane */}
          <GroundPlane />

          {/* GLB Model */}
          <GLBViewer modelPath="/EV5.glb" />
        </Canvas>
      </div>

      {/* Fare Placeholder */}
      <div
        style={{
          flex: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>Fare Placeholder</h2>
      </div>
    </div>
  );
};

export default EV5;
