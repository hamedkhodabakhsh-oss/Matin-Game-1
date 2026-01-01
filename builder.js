import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "https://unpkg.com/three@0.160.0/examples/jsm/exporters/STLExporter.js";

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
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

const incoming = loadIncomingCar();
if (incoming) {
  els.brand.value = incoming.brand ?? "";
  els.model.value = incoming.model ?? "";
  els.bodyType.value = incoming.bodyType ?? "coupe";
  els.paint.value = incoming.paint ?? "#2563eb";
  if (incoming.length) els.len.value = String(incoming.length);
  if (incoming.width) els.wid.value = String(incoming.width);
  if (incoming.height) els.hei.value = String(incoming.height);
  if (incoming.wheelR) els.wr.value = String(incoming.wheelR);
  if (incoming.wheelW) els.ww.value = String(incoming.wheelW);
  if (incoming.rideH) els.rh.value = String(incoming.rideH);
}

// ----- Three.js scene -----
const mount = document.getElementById("view");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
camera.position.set(260, 160, 260);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(300, 400, 200);
scene.add(dir);

scene.add(new THREE.GridHelper(800, 40, 0x334155, 0x1f2937));

const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.35, metalness: 0.2 });
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85, metalness: 0.05 });

let bodyMesh = null;
let wheelMeshes = [];

function safeName() {
  const b = (els.brand.value || "Custom").trim();
  const m = (els.model.value || "One-off").trim();
  return `${b}-${m}`.replace(/[^a-z0-9-_]+/gi, "_");
}

function buildCar() {
  // remove old
  if (bodyMesh) { bodyMesh.geometry.dispose(); scene.remove(bodyMesh); }
  for (const w of wheelMeshes) { w.geometry.dispose(); scene.remove(w); }
  wheelMeshes = [];

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

  // body sits above wheels
  const bodyH = height * 0.55;
  const bodyY = wheelR + rideH + bodyH / 2;

  const bodyGeo = new THREE.BoxGeometry(length, bodyH, width);
  bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, bodyY, 0);
  scene.add(bodyMesh);

  // wheels
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 36, 1);
  wheelGeo.rotateZ(Math.PI / 2);

  const axleX = length * 0.33;
  const axleZ = width * 0.50;

  const pos = [
    ["FL",  axleX, wheelR,  axleZ],
    ["FR",  axleX, wheelR, -axleZ],
    ["RL", -axleX, wheelR,  axleZ],
    ["RR", -axleX, wheelR, -axleZ],
  ];

  for (const [name, x, y, z] of pos) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z);
    w.userData.partName = `wheel_${name}`;
    scene.add(w);
    wheelMeshes.push(w);
  }

  controls.target.set(0, bodyY, 0);
}

function resize() {
  const w = mount.clientWidth;
  const h = mount.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener("resize", resize);

// Export
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

// Wire changes
[
  els.paint, els.bodyType,
  els.len, els.wid, els.hei,
  els.wr, els.ww, els.rh
].forEach(el => {
  el.addEventListener("input", buildCar);
  el.addEventListener("change", buildCar);
});

buildCar();
resize();

function tick() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();