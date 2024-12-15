// src/threejs/ThreeJSOverlayView.jsx

import {
  Vector2,
  PerspectiveCamera,
  WebGLRenderer,
  Scene,
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
    this.transformer = null; // Store transformer

    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
    this.INTERSECTED = null; // Currently hovered object

    // Bind event handlers
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onClick = this.onClick.bind(this);

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
    // Add event listeners
    const canvas = this.overlay.getCanvas();
    if (canvas) {
      canvas.addEventListener("mousemove", this.onMouseMove, false);
      canvas.addEventListener("click", this.onClick, false);
    }
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
    this.renderer.setSize(width, height);

    this.scene.add(new this.THREE.AmbientLight(0xffffff, 0.5));
    const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 0);
    this.scene.add(directionalLight);
  }

  onDraw(drawOptions) {
    const { gl, transformer } = drawOptions;

    // Store the transformer for use in other methods
    this.transformer = transformer;

    // Debug: Log the transformer object
    console.log("Transformer Object:", transformer);

    // **Use available transformer methods to set up the camera**
    // Since getProjectionMatrix is not available, use alternative methods

    // Update camera position based on transformer
    this.camera.matrixWorldInverse.fromArray(transformer.getViewMatrix());
    this.camera.matrixWorld.getInverse(this.camera.matrixWorldInverse);
    this.camera.updateMatrixWorld();

    // Update projection matrix if available
    if (transformer.getProjectionMatrixArray) {
      const projectionMatrix = new Float32Array(
        transformer.getProjectionMatrixArray()
      );
      this.camera.projectionMatrix.fromArray(projectionMatrix);
    } else {
      console.warn(
        "getProjectionMatrixArray is not available on the transformer."
      );
      // Handle accordingly, possibly use a default projection
    }

    const { width, height } = gl.canvas;
    this.renderer.setSize(width, height);

    // Render the scene
    this.renderer.state.reset();
    this.renderer.render(this.scene, this.camera);
    this.renderer.resetState();

    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Object.values(this.models)
    );

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
  }

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

  /**
   * Handle mouse move events for hover interactivity.
   * @param {MouseEvent} event
   */
  onMouseMove(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1) for both components.
    const rect = event.target.getBoundingClientRect();
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
      }
    }
  }
}
