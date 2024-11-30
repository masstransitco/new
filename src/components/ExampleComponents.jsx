// src/components/ExampleComponent.jsx
import React from "react";

function ExampleComponent({ isVisible }) {
  if (!isVisible) {
    return null;
  }
  return <div>Content is visible</div>;
}

export default ExampleComponent;
