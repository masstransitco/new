import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

const GLBViewer = ({ modelPath }) => {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} />;
};

const EV7 = () => {
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
      <div style={{ flex: "1", height: "25vh" }}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <OrbitControls autoRotate autoRotateSpeed={1.5} />
          <GLBViewer modelPath="/EV7.glb" />
        </Canvas>
      </div>
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

export default EV7;
