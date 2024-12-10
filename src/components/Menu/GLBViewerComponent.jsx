/* eslint-disable react/no-unknown-property */
import React, { memo } from "react";
import { useGLTF } from "@react-three/drei";
import PropTypes from "prop-types";

const GLBViewerComponent = memo(({ modelPath }) => {
  const { scene } = useGLTF(modelPath, true);

  // Default scale
  let scale = [1, 1, 1];

  // Check model name and set scale to [3, 3, 3] for EV5, EV7, Taxi, and Van
  const lowerPath = modelPath.toLowerCase();
  if (
    lowerPath.includes("ev5") ||
    lowerPath.includes("ev7") ||
    lowerPath.includes("taxi") ||
    lowerPath.includes("van")
  ) {
    scale = [3, 3, 3];
  }

  return <primitive object={scene} scale={scale} position={[0, 1.5, 0]} />;
});

GLBViewerComponent.displayName = "GLBViewerComponent";
GLBViewerComponent.propTypes = {
  modelPath: PropTypes.string.isRequired,
};

export default GLBViewerComponent;
