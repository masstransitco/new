// src/threejs/ThreeJSOverlayView.jsx
/* global google */

import {
  Vector2,
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
  AmbientLight,
  DirectionalLight,
  MeshBasicMaterial,
  Mesh,
  Vector3,
  Raycaster,
} from "three";

import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

export default class ThreeJSOverlayView extends google.maps.WebGLOverlayView {
  constructor(THREE) {
    super();
    this.THREE = THREE;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera();
    this.renderer = null;
    this.models = {}; // Store models by identifier
    this.labels = {};
    this.animationRequest = null;
    this.carAnimationActive = false; // Flag to ensure animation runs only once
    this.transformer = null; // Store transformer

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
    this.INTERSECTED = null; // Currently hovered object

    // Flag to prevent recursive redraws
    this.isRedrawRequested = false;
  }

  /**
   * Called when the overlay is added to the map.
   */
  onAdd() {
    // Add event listeners
    const canvas = this.getCanvas();
    if (canvas) {
      canvas.addEventListener("mousemove", this.onMouseMove.bind(this), false);
      canvas.addEventListener("click", this.onClick.bind(this), false);
    }

    // Initialize transformer here if applicable
    // Example:
    // this.transformer = new Transformer(); // Replace with actual transformer initialization
    // Ensure transformer is ready
  }

  /**
   * Called when the WebGL context is restored.
   * Initialize Three.js renderer and scene.
   */
  onContextRestored({ gl }) {
    this.renderer = new WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });
    this.renderer.autoClear = false;
    this.renderer.autoClearDepth = false;

    const { width, height } = gl.canvas;
    this.renderer.setSize(width, height);

    // Add lights to the scene
    this.scene.add(new AmbientLight(0xffffff, 0.5));
    const directionalLight = new DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    this.scene.add(directionalLight);
  }

  /**
   * Called on each frame to render the overlay.
   */
  onDraw({ gl, transformer }) {
    this.transformer = transformer;

    // Update camera position based on transformer
    const viewMatrixArray = transformer.getViewMatrix();
    if (typeof transformer.getViewMatrix !== "function") {
      console.error("transformer.getViewMatrix is not a function.");
      return;
    }

    this.camera.matrixWorldInverse.fromArray(viewMatrixArray);
    this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse);
    this.camera.updateMatrixWorld();

    // Update projection matrix if available
    if (typeof transformer.getProjectionMatrix === "function") {
      const projectionMatrix = new Float32Array(
        transformer.getProjectionMatrix()
      );
      this.camera.projectionMatrix.fromArray(projectionMatrix);
    } else {
      console.warn("getProjectionMatrix is not available on the transformer.");
      // Handle accordingly, possibly use a default projection
    }

    const { width, height } = gl.canvas;
    this.renderer.setSize(width, height);

    // Render the scene
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();

    // Update raycaster for interactivity
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectObjects = Object.values(this.models).concat(
      Object.values(this.labels)
    ); // Include labels for interaction
    const intersects = this.raycaster.intersectObjects(intersectObjects, true);

    if (intersects.length > 0) {
      const firstIntersect = intersects[0].object;
      if (this.INTERSECTED !== firstIntersect) {
        if (this.INTERSECTED) {
          // Reset previous intersected object's material
          this.INTERSECTED.material.emissive.setHex(
            this.INTERSECTED.currentHex
          );
        }
        this.INTERSECTED = firstIntersect;
        this.INTERSECTED.currentHex =
          this.INTERSECTED.material.emissive.getHex();
        this.INTERSECTED.material.emissive.setHex(0xff0000); // Highlight color
      }
    } else {
      if (this.INTERSECTED) {
        // Reset previous intersected object's material
        this.INTERSECTED.material.emissive.setHex(this.INTERSECTED.currentHex);
      }
      this.INTERSECTED = null;
    }

    // Reset the redraw request flag
    this.isRedrawRequested = false;
  }

  /**
   * Called when the WebGL context is lost.
   */
  onContextLost() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  /**
   * Convert LatLng to Vector3 using the stored transformer for accurate positioning.
   * @param {Object} latLng - { lat, lng }
   * @returns {THREE.Vector3}
   */
  latLngToVector3(latLng) {
    if (!this.transformer) {
      console.error("Transformer is not available yet.");
      return new Vector3(0, 0, 0); // Return a default vector or handle as needed
    }
    const worldPosition = this.transformer.fromLatLngAltitude({
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
    this.getMap().panTo(position);
    this.getMap().setZoom(zoom);
    this.getMap().setTilt(tilt);
    this.getMap().setHeading(heading);

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
    if (this.isRedrawRequested) return; // Prevent multiple requests
    this.isRedrawRequested = true;
    this.requestRedraw();
  }

  /**
   * Override the base class's requestRedraw to prevent infinite recursion.
   */
  requestRedraw() {
    if (!this.isRedrawRequested) {
      this.isRedrawRequested = true;
      window.requestAnimationFrame(() => {
        this.draw();
        this.isRedrawRequested = false;
      });
    }
  }

  /**
   * Handle mouse move events for hover interactivity.
   * @param {MouseEvent} event
   */
  onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components.
    const rect = this.getCanvas().getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.requestRedraw();
  }

  /**
   * Handle click events for selecting models.
   * @param {MouseEvent} event
   */
  onClick(event) {
    if (this.INTERSECTED) {
      const identifier = Object.keys(this.models).find(
        (key) => this.models[key] === this.INTERSECTED
      );
      if (identifier) {
        // Emit a custom event or call a callback to notify about the selection
        // For example:
        // this.onModelClick(identifier);
        console.log(`Model with identifier ${identifier} was clicked.`);
        // You can extend this method to interface with your React components
        if (this.onModelClick) {
          this.onModelClick(identifier);
        }
      }
    }
  }

  /**
   * Add a callback for model clicks.
   * @param {Function} callback
   */
  setOnModelClick(callback) {
    this.onModelClick = callback;
  }

  /**
   * Define the getViewMatrix method to calculate and return the view matrix.
   * @returns {Array} - The view matrix as an array.
   */
  getViewMatrix() {
    // Calculate and return the view matrix based on the camera and map's orientation
    // This is a placeholder implementation and should be adjusted based on actual requirements
    // You might need to use the transformer's capabilities to get the accurate view matrix
    const viewMatrix = new Float32Array(16);
    this.camera.updateMatrixWorld();
    this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
    this.camera.matrixWorldInverse.toArray(viewMatrix);
    return viewMatrix;
  }
}
