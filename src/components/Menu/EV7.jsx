import React, { Suspense, useMemo, memo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Preload,
  Html,
  Environment,
} from "@react-three/drei";
import PropTypes from "prop-types";

// Extract static lighting since it does not depend on props
const Lighting = () => (
  <>
    <ambientLight intensity={0.5} />
    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
  </>
);

const GLBViewerComponent = memo(({ modelPath }) => {
  const { scene } = useGLTF(modelPath, true);
  return <primitive object={scene} scale={[1, 1, 1]} position={[0, 1.5, 0]} />;
});

GLBViewerComponent.propTypes = {
  modelPath: PropTypes.string.isRequired,
};

const GroundPlaneComponent = memo(({ isSelected }) => (
  <mesh rotation-x={-Math.PI / 2} receiveShadow>
    <circleGeometry args={[10, 64]} />
    <meshStandardMaterial color={isSelected ? "#2171EC" : "#adadad"} />
    <shadowMaterial opacity={0.5} />
  </mesh>
));

GroundPlaneComponent.propTypes = {
  isSelected: PropTypes.bool.isRequired,
};

const EV7 = memo(({ isSelected }) => {
  const cameraSettings = useMemo(
    () => ({
      position: [20, 10, 25],
      fov: isSelected ? 30 : 45,
      near: 0.5,
      far: 100,
    }),
    [isSelected]
  );

  const orbitControlsSettings = useMemo(
    () => ({
      autoRotate: isSelected,
      autoRotateSpeed: isSelected ? 1.5 : 0,
      enableZoom: false,
      minDistance: 5,
      maxDistance: 50,
      enablePan: false,
      maxPolarAngle: Math.PI / 2,
    }),
    [isSelected]
  );

  return (
    <div
      style={{
        width: "80px",
        height: "10vh",
        overflow: "hidden",
        borderRadius: "8px",
        boxShadow: "none", // Remove shadow
      }}
    >
      <Canvas
        shadows
        camera={cameraSettings}
        style={{ width: "100%", height: "100%" }}
      >
        <Suspense fallback={<Html center>Loading...</Html>}>
          <Lighting />
          <OrbitControls {...orbitControlsSettings} />
          <GroundPlaneComponent isSelected={isSelected} />
          <Environment preset="studio" />
          <Preload all />
          <GLBViewerComponent modelPath={process.env.PUBLIC_URL + "/EV7.glb"} />
        </Suspense>
      </Canvas>
    </div>
  );
});

EV7.propTypes = {
  isSelected: PropTypes.bool.isRequired,
};

export default EV7;
