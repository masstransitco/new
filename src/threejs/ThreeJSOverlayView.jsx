// src/threejs/ThreeJSOverlayView.jsx

/* global google */ // Declare 'google' as a global variable for ESLint

import {
  Vector2,
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  MeshBasicMaterial,
  Mesh,
  Vector3,
} from "three";

import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

// Constants for model URLs
// Removed CAR_MODEL_URL and ME_MODEL_URL as they are unused

// Removed CAR_FRONT as it is unused

export default class ThreeJSOverlayView {
  constructor(map, THREE) {
    this.map = map;
    this.THREE = THREE;
    this.overlay = new google.maps.WebGLOverlayView();
    this.scene = new Scene();
    this.camera = new PerspectiveCamera();
    this.renderer = null;
    this.models = {}; // Store models by identifier
    this.labels = {};
    this.animationRequest = null;
    this.carAnimationActive = false; // Flag to ensure animation runs only once

    this.overlay.onAdd = this.onAdd.bind(this);
    this.overlay.onContextRestored = this.onContextRestored.bind(this);
    this.overlay.onDraw = this.onDraw.bind(this);
    this.overlay.onContextLost = this.onContextLost.bind(this);
  }

  setMap(map) {
    this.overlay.setMap(map);
  }

  onAdd() {
    // Called when the overlay is added to the map
    // Initialize any objects or settings here if needed
  }

  onContextRestored(stateOptions) {
    const { gl } = stateOptions;
    this.renderer = new WebGLRenderer({
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
    const projectionMatrix = new Float32Array(
      transformer.getProjectionMatrix()
    );
    this.camera.projectionMatrix.fromArray(projectionMatrix);
    this.camera.matrixWorldInverse.fromArray(transformer.getViewMatrix());
    this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse);
    this.camera.updateMatrixWorld();

    const { width, height } = gl.canvas;
    this.renderer.setSize(width, height);

    // Render the scene
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();
  }

  onContextLost() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  /**
   * Convert LatLng to Vector3 using transformer for accurate positioning.
   * @param {Object} latLng - { lat, lng }
   * @returns {THREE.Vector3}
   */
  latLngToVector3(latLng) {
    const transformer = this.overlay.getTransformer();
    const worldPosition = transformer.fromLatLngAltitude({
      lat: latLng.lat,
      lng: latLng.lng,
      altitude: 0, // Adjust altitude if necessary
    });
    return new Vector3(worldPosition.x, worldPosition.y, worldPosition.z);
  }

  /**
   * Add a 3D model with a unique identifier.
   * @param {Object} position - { lat, lng }
   * @param {THREE.Object3D} model - The 3D model to add
   * @param {String} identifier - Unique identifier for the model
   */
  addModel(position, model, identifier = null) {
    if (identifier && this.models[identifier]) {
      // Remove existing model with the same identifier
      this.removeModel(identifier);
    }

    const vector = this.latLngToVector3(position);
    model.position.set(vector.x, vector.y, vector.z); // Accurate positioning
    this.scene.add(model);

    if (identifier) {
      this.models[identifier] = model;
    }

    this.requestRedraw();
  }

  /**
   * Remove a model by its unique identifier.
   * @param {String} identifier - Identifier of the model to remove
   */
  removeModel(identifier) {
    const model = this.models[identifier];
    if (model) {
      this.scene.remove(model);
      delete this.models[identifier];
      this.requestRedraw();
    }
  }

  /**
   * Clear all models from the scene.
   */
  clearModels() {
    Object.keys(this.models).forEach((identifier) => {
      const model = this.models[identifier];
      this.scene.remove(model);
      delete this.models[identifier];
    });
    this.requestRedraw();
  }

  /**
   * Add a label with a unique identifier.
   * @param {Object} position - { lat, lng }
   * @param {String} text - Label text
   * @param {String} identifier - Unique identifier for the label
   */
  addLabel(position, text, identifier = null) {
    if (identifier && this.labels[identifier]) {
      // Remove existing label with the same identifier
      this.removeLabel(identifier);
    }

    const loader = new FontLoader();
    loader.load(
      "/fonts/helvetiker_regular.typeface.json", // Ensure this path is correct
      (font) => {
        const geometry = new TextGeometry(text, {
          font: font,
          size: 10, // Adjust size for visibility
          height: 1, // Adjust height for visibility
        });
        const material = new MeshBasicMaterial({ color: 0xffffff });
        const mesh = new Mesh(geometry, material);
        const vector = this.latLngToVector3(position);
        mesh.position.set(vector.x, vector.y, vector.z + 50); // Adjust z for height above the map
        this.scene.add(mesh);

        if (identifier) {
          this.labels[identifier] = mesh;
        }

        this.requestRedraw();
      },
      undefined,
      (error) => {
        console.error("Error loading font for label:", error);
      }
    );
  }

  /**
   * Remove a label by its unique identifier.
   * @param {String} identifier - Identifier of the label to remove
   */
  removeLabel(identifier) {
    const label = this.labels[identifier];
    if (label) {
      this.scene.remove(label);
      delete this.labels[identifier];
      this.requestRedraw();
    }
  }

  /**
   * Clear all labels from the scene.
   */
  clearLabels() {
    Object.keys(this.labels).forEach((identifier) => {
      const label = this.labels[identifier];
      this.scene.remove(label);
      delete this.labels[identifier];
    });
    this.requestRedraw();
  }

  /**
   * Animate the camera to a specific position.
   * @param {Object} position - { lat, lng }
   * @param {Number} zoom - Zoom level
   * @param {Number} tilt - Tilt angle
   * @param {Number} heading - Heading angle
   * @param {Function} callback - Callback after animation completes
   */
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

  /**
   * Animate a model along a path.
   * @param {String} identifier - Identifier of the model to animate
   * @param {Array} path - Array of { lat, lng } points
   * @param {Number} duration - Animation duration in milliseconds
   * @param {Function} onComplete - Callback after animation completes
   */
  animateModelAlongPath(identifier, path, duration, onComplete) {
    const model = this.models[identifier];
    if (!model || this.carAnimationActive) return; // Prevent multiple animations

    let startTime = null;
    this.carAnimationActive = true;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const totalPoints = path.length;
      const index = Math.floor(progress * (totalPoints - 1));
      const nextIndex = Math.min(index + 1, totalPoints - 1);
      const t = progress * (totalPoints - 1) - index;

      const currentPos = {
        lat: path[index].lat + t * (path[nextIndex].lat - path[index].lat),
        lng: path[index].lng + t * (path[nextIndex].lng - path[index].lng),
      };

      const vector = this.latLngToVector3(currentPos);
      model.position.set(vector.x, vector.y, vector.z);

      // Update model orientation based on movement direction
      if (nextIndex < totalPoints - 1) {
        const direction = new Vector3(
          path[nextIndex + 1].lng - path[nextIndex].lng,
          path[nextIndex + 1].lat - path[nextIndex].lat,
          0
        ).normalize();
        const angle = Math.atan2(direction.y, direction.x);
        model.rotation.z = -angle;
      }

      if (progress < 1) {
        this.animationRequest = requestAnimationFrame(animate);
      } else {
        this.carAnimationActive = false;
        if (onComplete) onComplete();
        this.animationRequest = null;
      }

      this.requestRedraw();
    };

    this.animationRequest = requestAnimationFrame(animate);
  }

  /**
   * Create a mesh-line from the spline to render the track the car is driving.
   * @param {THREE.CatmullRomCurve3} curve
   * @returns {THREE.Line2}
   */
  createTrackLine(curve) {
    const numPoints = 100; // Increase for smoother lines
    const curvePoints = curve.getSpacedPoints(numPoints);
    const positions = new Float32Array(numPoints * 3);

    for (let i = 0; i < numPoints; i++) {
      curvePoints[i].toArray(positions, 3 * i);
    }

    const trackLine = new Line2(
      new LineGeometry(),
      new LineMaterial({
        color: 0x0f9d58,
        linewidth: 5,
        vertexColors: false,
        dashed: false,
      })
    );

    trackLine.geometry.setPositions(positions);
    trackLine.computeLineDistances();

    return trackLine;
  }

  /**
   * Request a redraw of the overlay.
   */
  requestRedraw() {
    if (this.overlay && this.overlay.requestRedraw) {
      this.overlay.requestRedraw();
    }
  }
}
