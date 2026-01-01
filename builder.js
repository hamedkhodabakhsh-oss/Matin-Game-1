// On-screen error reporting (so you can debug on iPad without a console)
function showErrorBox(msg, color = "#ef4444") {
  const box = document.createElement("div");
  box.style.cssText =
    `position:fixed;left:10px;bottom:10px;right:10px;` +
    `padding:10px 12px;border-radius:12px;` +
    `background:${color};color:#0b1220;font-weight:900;z-index:99999;` +
    `box-shadow:0 8px 20px rgba(0,0,0,.35);`;
  box.textContent = msg;
  document.body.appendChild(box);
}

window.addEventListener("error", (e) => {
  showErrorBox("JS ERROR: " + (e.message || "unknown"));
});

window.addEventListener("unhandledrejection", (e) => {
  const m = e.reason?.message || String(e.reason);
  showErrorBox("PROMISE ERROR: " + m, "#f59e0b");
});

// Three.js imports (loaded from the internet via CDN)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/STLExporter.js";

const ui = (id) => document.getElementById(id);
const els = {
  brand: ui("brand"),
  model: ui("model"),
  bodyType: ui("bodyType"),
  paint: ui("paint"),
  len: ui("len"), wid: ui("wid"), hei: ui("hei"),
  wr: ui("wr"), ww: ui("ww"), rh: ui("rh"),
  lenV: ui("lenV"), widV: ui("widV"), heiV: ui("heiV"),
  wrV: ui("wrV"), wwV: ui("wwV"), rhV: ui("rhV"),
  exportBody: ui("exportBody"),
  exportWheels: ui("exportWheels"),
};

function clampNum(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function loadIncomingCar() {
  try {
    const raw = sessionStorage.getItem("builder_load");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Apply incoming preset/car if present
const incoming = loadIncomingCar();
if (incoming) {
  els.brand.value = incoming.brand ?? "";
  els.model.value = incoming.model ?? "";
  els.bodyType.value = incoming.bodyType ?? "coupe";
  els.paint.value = incoming.paint ?? "#2563eb";
  if (incoming.length)  els.len.value = String(incoming.length);
  if (incoming.width)   els.wid.value = String(incoming.width);
  if (incoming.height)  els.hei.value = String(incoming.height);
  if (incoming.wheelR)  els.wr.value  = String(incoming.wheelR);
  if (incoming.wheelW)  els.ww.value  = String(incoming.wheelW);
  if (incoming.rideH)   els.rh.value  = String(incoming.rideH);
} else {
  if (!els.brand.value) els.brand.value = "Custom";
  if (!els.model.value) els.model.value = "One-off";
}

const mount = document.getElementById("view");
if (!mount) showErrorBox("Could not find #view element (builder.html issue).");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

// Camera
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(260, 160, 260);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
mount.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(300, 400, 200);
scene.add(dir);

// Grid
scene.add(new THREE.GridHelper(800, 40, 0x334155, 0x1f2937));

// Materials
const bodyMat = new THREE.MeshStandardMaterial({
  color: new THREE.Color(els.paint.value),
  roughness: 0.35,
  metalness: 0.2
});
const wheelMat = new THREE.MeshStandardMaterial({
  color: 0x111827,
  roughness: 0.85,
  metalness: 0.05
});

// Mesh refs
let bodyMesh = null;
let wheelMeshes = [];

function safeName() {
  const b = (els.brand.value || "Custom").trim();
  const m = (els.model.value || "One-off").trim();
  return `${b}-${m}`.replace(/[^a-z0-9-_]+/gi, "_");
}

function clearMeshes() {
  if (bodyMesh) {
    bodyMesh.geometry.dispose();
    scene.remove(bodyMesh);
    bodyMesh = null;
  }
  for (const w of wheelMeshes) {
    w.geometry.dispose();
    scene.remove(w);
  }
  wheelMeshes = [];
}

function buildCar() {
  clearMeshes();

  const length = clampNum(els.len.value, 120, 240);
  const width  = clampNum(els.wid.value, 55, 100);
  const height = clampNum(els.hei.value, 35, 90);
  const wheelR = clampNum(els.wr.value, 8, 18);
  const wheelW = clampNum(els.ww.value, 5, 14);
  const rideH  = clampNum(els.rh.value, 2, 16);

  els.lenV.textContent = String(length);
  els.widV.textContent = String(width);
  els.heiV.textContent = String(height);
  els.wrV.textContent  = String(wheelR);
  els.wwV.textContent  = String(wheelW);
  els.rhV.textContent  = String(rideH);

  bodyMat.color = new THREE.Color(els.paint.value);

  // Body height based on type
  let bodyFactor = 0.55;
  if (els.bodyType.value === "suv") bodyFactor = 0.70;
  if (els.bodyType.value === "saloon") bodyFactor = 0.58;

  const bodyH = height * bodyFactor;
  const bodyY = wheelR + rideH + bodyH / 2;

  // Body mesh
  const bodyGeo = new THREE.BoxGeometry(length, bodyH, width);
  bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, bodyY, 0);
  scene.add(bodyMesh);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 36, 1);
  wheelGeo.rotateZ(Math.PI / 2);

  const axleX = length * 0.33;
  const axleZ = width * 0.50;

  const positions = [
    ["FL",  axleX, wheelR,  axleZ],
    ["FR",  axleX, wheelR, -axleZ],
    ["RL", -axleX, wheelR,  axleZ],
    ["RR", -axleX, wheelR, -axleZ],
  ];

  for (const [name, x, y, z] of positions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    w.userData.partName = `wheel_${name}`;
    scene.add(w);
    wheelMeshes.push(w);
  }

  controls.target.set(0, bodyY, 0);
}

// iPad-safe resize
function resize() {
  const w = mount.clientWidth || window.innerWidth;
  const h = mount.clientHeight || 520; // critical fallback
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 200));

const ro = new ResizeObserver(() => resize());
ro.observe(mount);

// STL export
function exportMeshSTL(mesh, filename) {
  const exporter = new STLExporter();
  const stl = exporter.parse(mesh, { binary: false });
  const blob = new Blob([stl], { type: "model/stl" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

els.exportBody.addEventListener("click", () => {
  if (!bodyMesh) return;
  exportMeshSTL(bodyMesh, `${safeName()}_body.stl`);
});

els.exportWheels.addEventListener("click", () => {
  const names = ["FL", "FR", "RL", "RR"];
  wheelMeshes.forEach((m, i) => exportMeshSTL(m, `${safeName()}_wheel_${names[i]}.stl`));
});

// Rebuild on changes
[
  els.paint, els.bodyType,
  els.len, els.wid, els.hei,
  els.wr, els.ww, els.rh
].forEach(el => {
  el.addEventListener("input", buildCar);
  el.addEventListener("change", buildCar);
});

// Initial
resize();
buildCar();
setTimeout(resize, 0);
setTimeout(resize, 250);

// Animation loop
function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();