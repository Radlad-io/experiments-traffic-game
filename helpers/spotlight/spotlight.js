import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module";
import { GUI } from "dat.gui";

const scene = new THREE.Scene();
scene.add(new THREE.AxesHelper(5));
const gui = new GUI();

const lightFolder = gui.addFolder("Light");

const distance = 200;
const angel = 0.25;
const penumbra = 0;
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
  new THREE.BoxBufferGeometry(10, 500, 500),
  new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide })
);

Wall.position.set(0, 0, 0);
Wall.rotation.set(0, Math.PI / 2, 0);
scene.add(Wall);

const wallFolder = gui.addFolder("Wall");
wallFolder.add(Wall.position, "z", -400, 400, 0.1, 10);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.02);
scene.add(ambientLight);

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

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x005131, 0.5);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true;
renderer.render(scene, camera);

document.body.appendChild(renderer.domElement);

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

const stats = Stats();
document.body.appendChild(stats.dom);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(200, -200, 300);
controls.update();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  render();
  stats.update();
}

function render() {
  renderer.render(scene, camera);
}

animate();
