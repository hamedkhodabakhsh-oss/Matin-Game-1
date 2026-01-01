import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { STLExporter } from "https://unpkg.com/three@0.160.0/examples/jsm/exporters/STLExporter.js";

const mount = document.getElementById("view");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(200, 150, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(mount.clientWidth, mount.clientHeight);
mount.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));

const body = new THREE.Mesh(
  new THREE.BoxGeometry(180, 40, 80),
  new THREE.MeshStandardMaterial({ color: 0x2563eb })
);
body.position.y = 40;
scene.add(body);

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

document.getElementById("export").onclick = () => {
  const exporter = new STLExporter();
  const stl = exporter.parse(body);
  const blob = new Blob([stl], { type:"model/stl" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "car_body.stl";
  a.click();
};