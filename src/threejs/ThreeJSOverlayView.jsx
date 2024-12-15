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
  CatmullRomCurve3,
  Quaternion,
} from "three";

import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js"; // Correct import
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"; // Correct import

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

import CAR_MODEL_URL from "../models/car.glb"; // Adjust the path as necessary
import ME_MODEL_URL from "../models/ME.glb"; // Adjust the path as necessary

const CAR_FRONT = new Vector3(0, 1, 0); // Direction the car model is facing

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
    const projectionMatrix = transformer.fromLatLngAltitude(
      this.referencePoint || this.map.getCenter()
    );
    this.camera.projectionMatrix.fromArray(projectionMatrix);

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

  /**
   * Utility to add labels above a position.
   * @param {Object} position - { lat, lng }
   * @param {String} text - Label text
   */
  addLabel(position, text) {
    const loader = new FontLoader();
    loader.load(
      "/fonts/helvetiker_regular.typeface.json", // Ensure this path is correct
      (font) => {
        const geometry = new TextGeometry(text, {
          font: font,
          size: 1,
          height: 0.1,
        });
        const material = new MeshBasicMaterial({ color: 0xffffff });
        const mesh = new Mesh(geometry, material);
        mesh.position.set(position.lng, position.lat, 10); // Adjust z for height
        this.scene.add(mesh);
        this.labels[text] = mesh;
      },
      undefined,
      (error) => {
        console.error("Error loading font for label:", error);
      }
    );
  }

  /**
   * Utility to remove a label by identifier.
   * @param {String} identifier - Label identifier (e.g., station name)
   */
  removeLabel(identifier) {
    const label = this.labels[identifier];
    if (label) {
      this.scene.remove(label);
      delete this.labels[identifier];
    }
  }

  /**
   * Utility to clear all labels.
   */
  clearLabels() {
    Object.keys(this.labels).forEach((key) => {
      this.scene.remove(this.labels[key]);
      delete this.labels[key];
    });
  }

  /**
   * Utility to add a 3D model at a specific position.
   * @param {Object} position - { lat, lng }
   * @param {THREE.Object3D} model - The 3D model to add
   * @param {String} identifier - Optional identifier for the model
   */
  addModel(position, model, identifier = null) {
    model.position.set(position.lng, position.lat, 0); // Adjust as needed
    this.scene.add(model);
    if (identifier) {
      this.models[identifier] = model;
    }
    this.requestRedraw();
  }

  /**
   * Utility to remove a model by identifier.
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
   * Utility to clear all models.
   */
  clearModels() {
    Object.keys(this.models).forEach((key) => {
      this.scene.remove(this.models[key]);
      delete this.models[key];
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
    if (!model) return;

    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate current position on the path
      const totalPoints = path.length;
      const index = Math.floor(progress * (totalPoints - 1));
      const nextIndex = Math.min(index + 1, totalPoints - 1);
      const t = progress * (totalPoints - 1) - index;

      const currentPos = {
        lat: path[index].lat + t * (path[nextIndex].lat - path[index].lat),
        lng: path[index].lng + t * (path[nextIndex].lng - path[index].lng),
      };

      model.position.set(currentPos.lng, currentPos.lat, 0); // Adjust z as needed

      // Optionally, update model orientation based on path direction
      const direction = this.latLngToVector3(currentPos).sub(
        this.latLngToVector3(path[index])
      );
      if (direction.length() > 0) {
        direction.normalize();
        const quaternion = new Quaternion().setFromUnitVectors(
          CAR_FRONT,
          direction
        );
        model.quaternion.copy(quaternion);
      }

      if (progress < 1) {
        this.animationRequest = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
        this.animationRequest = null;
      }

      this.requestRedraw();
    };

    if (!this.carAnimationActive) {
      this.carAnimationActive = true;
      this.animationRequest = requestAnimationFrame(animate);
    }
  }

  /**
   * Convert LatLng to Vector3 for Three.js positioning.
   * @param {Object} latLng - { lat, lng }
   * @returns {THREE.Vector3}
   */
  latLngToVector3(latLng) {
    // Implement conversion from LatLng to Vector3
    // Placeholder: x = lng, y = lat, z = 0
    return new Vector3(latLng.lng, latLng.lat, 0);
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
   * Load and animate the car model along a predefined path.
   * @param {Array} animationPoints - Array of { lat, lng } points defining the path
   */
  loadAndAnimateCar(animationPoints) {
    if (this.carAnimationActive) return; // Prevent multiple animations

    const loader = new GLTFLoader();

    loader.load(
      CAR_MODEL_URL,
      (gltf) => {
        const carModel = gltf.scene;
        carModel.scale.setScalar(1); // Adjust scale as needed
        carModel.rotation.set(0, 0, 0); // Adjust rotation as needed
        carModel.name = "car";

        // Add car model to the scene at the starting point
        const startPosition = animationPoints[0];
        this.addModel(startPosition, carModel, "car");

        // Create a Catmull-Rom spline from the points to smooth out the corners
        const points = animationPoints.map((p) => this.latLngToVector3(p));
        const curve = new CatmullRomCurve3(points, true, "catmullrom", 0.2);
        curve.updateArcLengths();

        // Create and add the track line
        const trackLine = this.createTrackLine(curve);
        this.scene.add(trackLine);

        // Animate the car along the spline
        this.animateModelAlongPath(
          "car",
          animationPoints,
          12000, // 12 seconds animation
          () => {
            // Animation complete callback
            this.carAnimationActive = false;
            // Optionally remove the car or perform other actions
          }
        );
      },
      undefined,
      (error) => {
        console.error("Error loading car model:", error);
      }
    );
  }

  /**
   * Load and replace the default marker with the ME.glb 3D model in MeView.
   * @param {Object} position - { lat, lng }
   */
  loadAndReplaceWithME(position) {
    const loader = new GLTFLoader();

    loader.load(
      ME_MODEL_URL,
      (gltf) => {
        const meModel = gltf.scene;
        meModel.scale.setScalar(2); // Adjust scale as needed
        meModel.rotation.set(0, Math.PI, 0); // Adjust rotation as needed
        meModel.name = "ME";

        // Remove existing marker if any
        this.removeModel("ME");

        // Add ME model to the scene at the specified position
        this.addModel(position, meModel, "ME");
      },
      undefined,
      (error) => {
        console.error("Error loading ME model:", error);
      }
    );
  }

  /**
   * Animate the camera to a selected station, disable navigation during animation, and re-enable afterward.
   * @param {Object} position - { lat, lng }
   * @param {Number} zoom - Zoom level
   * @param {Number} tilt - Tilt angle
   * @param {Number} heading - Heading angle
   */
  animateToStation(position, zoom, tilt, heading) {
    // Disable user navigation
    this.disableUserNavigation();

    // Animate the camera
    this.animateCameraTo(position, zoom, tilt, heading, () => {
      // Re-enable user navigation after animation completes
      this.enableUserNavigation();
    });
  }

  /**
   * Add district labels to the scene.
   * @param {Array} districts - Array of district objects with { lat, lng, name }
   */
  addDistrictLabels(districts) {
    districts.forEach((district) => {
      this.addLabel(district.position, district.name);
    });
  }

  /**
   * Utility to disable user navigation on the map.
   */
  disableUserNavigation() {
    if (this.map) {
      this.map.setOptions({ gestureHandling: "none" });
    }
  }

  /**
   * Utility to enable user navigation on the map.
   */
  enableUserNavigation() {
    if (this.map) {
      this.map.setOptions({ gestureHandling: "auto" });
    }
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
