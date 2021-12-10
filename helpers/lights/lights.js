import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "dat.gui";

const scene = new THREE.Scene();
const gui = new GUI();

const lightFolder = gui.addFolder("Light");

const distance = 300;
const angel = 0.25;
const penumbra = 1;
const decay = 1;

const spotlight = new THREE.SpotLight(
  0xffffff,
  1,
  distance,
  angel,
  penumbra,
  decay
);

spotlight.position.set(0, 0, 100);
spotlight.rotation.set(0, 0, 0);
spotlight.target.position.set(0, 0, 0);
scene.add(spotlight.target);
scene.add(spotlight);

const helper = new THREE.SpotLightHelper(spotlight, 0xff0000);
scene.add(helper);
lightFolder.add(spotlight.position, "x", -200, 200, 1, 0).name("Position-X");
lightFolder.add(spotlight.position, "y", -200, 200, 1, 0).name("Position-Y");
lightFolder.add(spotlight.position, "z", -200, 200, 1, 100).name("Position-Z");

const Wall = new THREE.Mesh(
  new THREE.BoxBufferGeometry(10, 350, 350),
  new THREE.MeshPhongMaterial({ color: 0xffffff })
);
Wall.position.set(0, 0, 0);
Wall.rotation.set(0, Math.PI / 2, 0);
scene.add(Wall);

const aspectRatio = window.innerWidth / window.innerHeight;
const cameraWidth = 150;
const cameraHeight = cameraWidth / aspectRatio;
const camera = new THREE.OrthographicCamera(
  cameraWidth * -2,
  cameraWidth * 2,
  cameraHeight * 2,
  cameraHeight * -2,
  0,
  1000
);

camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);

scene.background = new THREE.Color(0x0f0f0f);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(200, -200, 300);
controls.update();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
}

function render() {
  renderer.render(scene, camera);
}

animate();
