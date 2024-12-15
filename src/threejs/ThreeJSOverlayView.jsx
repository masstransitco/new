// src/threejs/ThreeJSOverlayView.jsx

import {
  Matrix4,
  Vector3,
  Vector2,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Intersection,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default class ThreeJSOverlayView {
  constructor(map, THREE) {
    this.map = map;
    this.THREE = THREE;
    this.overlay = new google.maps.WebGLOverlayView();
    this.scene = new THREE.Scene();
    this.camera = new PerspectiveCamera();
    this.renderer = null;
    this.models = {}; // Store models by identifier
    this.labels = {};

    this.overlay.onAdd = this.onAdd.bind(this);
    this.overlay.onContextRestored = this.onContextRestored.bind(this);
    this.overlay.onDraw = this.onDraw.bind(this);
    this.overlay.onContextLost = this.onContextLost.bind(this);

    // Additional properties for animations
    this.animationRequest = null;
  }

  setMap(map) {
    this.overlay.setMap(map);
  }

  onAdd() {
    // Called when the overlay is added to the map
    // You can initialize objects here if needed
  }

  onContextRestored(stateOptions) {
    const { gl } = stateOptions;
    this.renderer = new this.THREE.WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });
    this.renderer.autoClear = false;
    this.renderer.autoClearDepth = false;

    const { width, height } = gl.canvas;
    this.viewportSize = new Vector2(width, height);
  }

  onDraw(drawOptions) {
    const { gl, transformer } = drawOptions;

    if (!this.scene || !this.renderer) return;

    // Update camera projection matrix
    this.camera.projectionMatrix.fromArray(
      transformer.fromLatLngAltitude(this.referencePoint)
    );

    const { width, height } = gl.canvas;
    this.viewportSize.set(width, height);
    this.renderer.setSize(width, height);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();
  }

  onContextLost() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  // Utility to add labels
  addLabel(position, text) {
    const loader = new this.THREE.FontLoader();
    loader.load("/fonts/helvetiker_regular.typeface.json", (font) => {
      const geometry = new this.THREE.TextGeometry(text, {
        font: font,
        size: 1,
        height: 0.1,
      });
      const material = new this.THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new this.THREE.Mesh(geometry, material);
      mesh.position.set(position.lng, position.lat, 10); // Adjust z for height
      this.scene.add(mesh);
      this.labels[text] = mesh;
    });
  }

  // Utility to remove a label
  removeLabel(identifier) {
    const label = this.labels[identifier];
    if (label) {
      this.scene.remove(label);
      delete this.labels[identifier];
    }
  }

  // Utility to clear all labels
  clearLabels() {
    Object.keys(this.labels).forEach((key) => {
      this.scene.remove(this.labels[key]);
      delete this.labels[key];
    });
  }

  // Utility to add a 3D model at a specific position
  addModel(position, model, identifier = null) {
    model.position.set(position.lng, position.lat, 0); // Adjust as needed
    this.scene.add(model);
    if (identifier) {
      this.models[identifier] = model;
    }
  }

  // Utility to remove a model by identifier
  removeModel(identifier) {
    const model = this.models[identifier];
    if (model) {
      this.scene.remove(model);
      delete this.models[identifier];
    }
  }

  // Utility to clear all models
  clearModels() {
    Object.keys(this.models).forEach((key) => {
      this.scene.remove(this.models[key]);
      delete this.models[key];
    });
  }

  // Animate camera to a specific position
  animateCameraTo(position, zoom, tilt, heading, callback) {
    // Implement camera animation logic here
    // For simplicity, we'll set the view directly and call the callback
    this.map.panTo(position);
    this.map.setZoom(zoom);
    this.map.setTilt(tilt);
    this.map.setHeading(heading);

    // Simulate animation duration
    setTimeout(() => {
      if (callback) callback();
    }, 2000); // 2 seconds animation
  }

  // Animate a model along a path
  animateModelAlongPath(identifier, path, duration, onComplete) {
    const model = this.models[identifier];
    if (!model) return;

    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate current position on the path
      const index = Math.floor(progress * (path.length - 1));
      const nextIndex = Math.min(index + 1, path.length - 1);
      const t = progress * (path.length - 1) - index;

      const currentPos = {
        lat: path[index].lat + t * (path[nextIndex].lat - path[index].lat),
        lng: path[index].lng + t * (path[nextIndex].lng - path[index].lng),
      };

      model.position.set(currentPos.lng, currentPos.lat, 0); // Adjust z as needed

      if (progress < 1) {
        this.animationRequest = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    };

    this.animationRequest = requestAnimationFrame(animate);
  }

  // Cleanup animations
  cancelAnimations() {
    if (this.animationRequest) {
      cancelAnimationFrame(this.animationRequest);
      this.animationRequest = null;
    }
  }
}
