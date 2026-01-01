import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "https://unpkg.com/three@0.160.0/examples/jsm/exporters/STLExporter.js";

const mount = document.getElementById("view");

// ----- Load car config from Garage (if any) -----
function loadCar() {
  try {
    const raw = sessionStorage.getItem("builder_load");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const car = loadCar() || {
  brand: "Custom",
  model: "One-off",
  paint: "#2563eb",
  length: 180,
  width: 80,
  height: 40
};

// Populate UI
const brandEl = document.getElementById("brand");
const modelEl = document.getElementById("model");
const paintEl = document.getElementById("paint");

brandEl.value = car.brand || "Custom";
modelEl.value = car.model || "One-off";
paintEl.value = car.paint || "#2563eb";

// ----- Three.js Setup -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(240, 160, 240);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(300, 400, 200);
scene.add(dir);

const grid = new THREE.GridHelper(800, 40, 0x334155, 0x1f2937);
scene.add(grid);

// ----- Car mesh (simple but parametric) -----
const mat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(paintEl.value),
  roughness: 0.35,
  metalness: 0.2
});

let body = null;

function buildBody() {
  if (body) {
    body.geometry.dispose();
    scene.remove(body);
  }

  const length = Number(car.length) || 180;
  const width  = Number(car.width)  || 80;
  const height = Number(car.height) || 40;

  const geo = new THREE.BoxGeometry(length, height, width);
  body = new THREE.Mesh(geo, mat);
  body.position.y = height / 2 + 20;
  scene.add(body);

  controls.target.set(0, body.position.y, 0);
}

buildBody();

// ----- Resize fix (important for iPad) -----
function resize() {
  const w = mount.clientWidth || window.innerWidth;
  const h = mount.clientHeight || Math.floor(window.innerHeight * 0.7);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);
resize();

// ----- Live updates -----
paintEl.addEventListener("input", () => {
  mat.color = new THREE.Color(paintEl.value);
  // keep stored
  car.paint = paintEl.value;
});

brandEl.addEventListener("input", () => car.brand = brandEl.value);
modelEl.addEventListener("input", () => car.model = modelEl.value);

// ----- Export STL -----
function safeName() {
  return `${car.brand}-${car.model}`.replace(/[^a-z0-9-_]+/gi, "_") || "car";
}

document.getElementById("export").onclick = () => {
  const exporter = new STLExporter();
  const stl = exporter.parse(body, { binary: false });

  const blob = new Blob([stl], { type: "model/stl" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName()}_body.stl`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
};

// ----- Render loop -----
function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();