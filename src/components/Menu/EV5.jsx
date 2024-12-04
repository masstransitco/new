import React from "react";
import { Canvas } from "@react-three/fiber"; // Ensure these are installed
import { OrbitControls, useGLTF } from "@react-three/drei"; // npm install @react-three/fiber @react-three/drei

const GLBViewer = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath); // Load the .glb file
  return <primitive object={scene} />;
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
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <OrbitControls autoRotate autoRotateSpeed={1.5} />
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
