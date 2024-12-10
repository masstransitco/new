/* eslint-disable react/no-unknown-property */

import React, { memo } from "react";
import { useGLTF } from "@react-three/drei";
import PropTypes from "prop-types";

const GLBViewerComponent = memo(({ modelPath, scale }) => {
  const { scene } = useGLTF(modelPath, true);
  return <primitive object={scene} scale={scale} position={[0, 1.5, 0]} />;
});

GLBViewerComponent.displayName = "GLBViewerComponent";
GLBViewerComponent.propTypes = {
  modelPath: PropTypes.string.isRequired,
  scale: PropTypes.arrayOf(PropTypes.number),
};

export default GLBViewerComponent;
