import "./style.css";
import * as THREE from "three";
import { CSG } from "three-csg-ts";
import { gsap } from "gsap";

window.focus(); // Capture keys right away (by default focus is on editor)

// Stores high score in the browser's localStorage
const storeUserHighScore = (score) => {
  localStorage.setItem("highScore", `${score}`);
};

// Queries localStorage for a stored high score
let storedUserHighScore = localStorage.getItem("highScore");
if (!storedUserHighScore) {
  storeUserHighScore(0);
}
console.log(storedUserHighScore);
// Stores high score in application and adds it to UI
let userHighScore =
  storedUserHighScore === null ? 0 : parseInt(storedUserHighScore);
const highScoreElement = document.getElementById("highScore");
highScoreElement.innerText = `High Score: ${userHighScore}`;

// Pick a random value from an array
function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getDistance(coordinate1, coordinate2) {
  const horizontalDistance = coordinate2.x - coordinate1.x;
  const verticalDistance = coordinate2.y - coordinate1.y;
  return Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2);
}

const vehicleColors = [
  0x3c70fb, 0x332b9b, 0x7831fe, 0xf590a3, 0xfd4058, 0xfe7758, 0xfead00,
];

const lawnGreen = "#005131";
const trackColor = "#546E90";
const edgeColor = "#545c58";
const treeCrownColor = 0x03331a;
const treeTrunkColor = 0x4b3f2f;

const wheelGeometry = new THREE.BoxBufferGeometry(12, 33, 12);
const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const treeTrunkGeometry = new THREE.BoxBufferGeometry(15, 15, 30);
const treeTrunkMaterial = new THREE.MeshPhongMaterial({
  color: treeTrunkColor,
});
const treeCrownMaterial = new THREE.MeshPhongMaterial({
  color: treeCrownColor,
});

const config = {
  showHitZones: false,
  shadows: false, // Use shadow
  trees: true, // Add trees to the map
  curbs: true, // Show texture on the extruded geometry
  grid: false, // Show grid helper
};

let score;
let isNight = false;
let headlightIntensity = 0;
const speed = 0.0017;

const playerAngleInitial = Math.PI;
let playerAngleMoved;
let accelerate = false; // Is the player accelerating
let decelerate = false; // Is the player decelerating

let otherVehicles = [];
let ready;
let lastTimestamp;

const trackRadius = 225;
const trackWidth = 45;
const innerTrackRadius = trackRadius - trackWidth;
const outerTrackRadius = trackRadius + trackWidth;

const arcAngle1 = (1 / 3) * Math.PI; // 60 degrees

const deltaY = Math.sin(arcAngle1) * innerTrackRadius;
const arcAngle2 = Math.asin(deltaY / outerTrackRadius);

const arcCenterX =
  (Math.cos(arcAngle1) * innerTrackRadius +
    Math.cos(arcAngle2) * outerTrackRadius) /
  2;

const arcAngle3 = Math.acos(arcCenterX / innerTrackRadius);

const arcAngle4 = Math.acos(arcCenterX / outerTrackRadius);

const scoreElement = document.getElementById("score");
const buttonsElement = document.getElementById("buttons");
const instructionsElement = document.getElementById("instructions");
const resultsElement = document.getElementById("results");
const accelerateButton = document.getElementById("accelerate");
const decelerateButton = document.getElementById("decelerate");

// Initialize ThreeJs
// Set up camera
const aspectRatio = window.innerWidth / window.innerHeight;
const cameraWidth = 960;
const cameraHeight = cameraWidth / aspectRatio;

const camera = new THREE.OrthographicCamera(
  cameraWidth / -2, // left
  cameraWidth / 2, // right
  cameraHeight / 2, // top
  cameraHeight / -2, // bottom
  50, // near plane
  700 // far plane
);

camera.position.set(0, -210, 300);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x333333, 1000, 1000);

const playerCar = Convertible();
scene.add(playerCar);

renderMap(cameraWidth, cameraHeight * 2); // The map height is higher because we look at the map from an angle

// Set up lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff8a1, 0.005);
dirLight.position.set(100, -300, 300);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.left = -400;
dirLight.shadow.camera.right = 350;
dirLight.shadow.camera.top = 400;
dirLight.shadow.camera.bottom = -300;
dirLight.shadow.camera.near = 100;
dirLight.shadow.camera.far = 800;
scene.add(dirLight);

const StreetLamp = () => {
  const streetLamp = new THREE.Group();
  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(5, 5, 150),
    new THREE.MeshPhongMaterial({ color: 0x777777 })
  );
  streetLamp.position.set(0, 0, 75);
  streetLamp.add(main);

  const tee = new THREE.Mesh(
    new THREE.BoxBufferGeometry(100, 5, 5),
    new THREE.MeshPhongMaterial({ color: 0x777777 })
  );
  tee.position.set(0, 0, 75);
  streetLamp.add(tee);

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  base.position.set(0, 0, -65);
  streetLamp.add(base);

  const joint = new THREE.Mesh(
    new THREE.BoxBufferGeometry(10, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  joint.position.set(0, 0, 75);
  streetLamp.add(joint);

  const rightLight = new THREE.Mesh(
    new THREE.BoxBufferGeometry(20, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  rightLight.position.set(50, 0, 75);
  streetLamp.add(rightLight);

  const leftLight = new THREE.Mesh(
    new THREE.BoxBufferGeometry(20, 10, 10),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  leftLight.position.set(-50, 0, 75);
  streetLamp.add(leftLight);

  const distance = 250;
  const angel = 20;
  const penumbra = 0.00025;
  const decay = 0.9;
  const rightlight = new THREE.SpotLight(
    0xffffff,
    0,
    distance,
    penumbra,
    angel,
    decay
  );
  rightlight.castShadow = true;
  rightlight.position.set(60, 0, 50);
  rightlight.target.position.set(75, 0, -250);
  streetLamp.add(rightlight.target);
  streetLamp.add(rightlight);

  const leftlight = new THREE.SpotLight(
    0xffffff,
    0,
    distance,
    penumbra,
    angel,
    decay
  );
  leftlight.castShadow = true;
  leftlight.position.set(-60, 0, 50);
  leftlight.target.position.set(-75, 0, -250);
  streetLamp.add(leftlight.target);
  streetLamp.add(leftlight);

  streetLamp.castShadow = true;
  streetLamp.receiveShadow = true;

  return streetLamp;
};
const lamp = StreetLamp();
scene.add(lamp);

if (config.grid) {
  const gridHelper = new THREE.GridHelper(80, 8);
  gridHelper.rotation.x = Math.PI / 2;
  scene.add(gridHelper);
}

// Set up renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
// renderer.setClearColor(0x005131, 1);
renderer.setSize(window.innerWidth, window.innerHeight);
if (config.shadows) renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

reset();

function reset() {
  // Reset position and score
  playerAngleMoved = 0;
  ambientLight.intensity = 0.75;
  playerCar.children[6].children[1].intensity = 0;
  playerCar.children[7].children[1].intensity = 0;
  lamp.children[7].intensity = 0;
  lamp.children[9].intensity = 0;
  scene.fog.near = 1000;
  isNight = false;
  score = 0;
  scoreElement.innerText = "Press UP";

  // Remove other vehicles
  otherVehicles.forEach((vehicle) => {
    // Remove the vehicle from the scene
    scene.remove(vehicle.mesh);

    // If it has hit-zone helpers then remove them as well
    if (vehicle.mesh.userData.hitZone1)
      scene.remove(vehicle.mesh.userData.hitZone1);
    if (vehicle.mesh.userData.hitZone2)
      scene.remove(vehicle.mesh.userData.hitZone2);
    if (vehicle.mesh.userData.hitZone3)
      scene.remove(vehicle.mesh.userData.hitZone3);
  });
  otherVehicles = [];

  resultsElement.style.display = "none";

  lastTimestamp = undefined;

  // Place the player's car to the starting position
  movePlayerCar(0);

  // Render the scene
  renderer.render(scene, camera);

  ready = true;
}

function startGame() {
  if (ready) {
    ready = false;
    if (!carSound.isPlaying) {
      carSound.play();
    }
    if (!musicSound.isPlaying) {
      musicSound.play();
    }
    scoreElement.innerText = `Laps: ${score}`;
    buttonsElement.style.opacity = 1;
    instructionsElement.style.opacity = 0;
    renderer.setAnimationLoop(animation);
  }
}

function positionScoreElement() {
  const arcCenterXinPixels = (arcCenterX / cameraWidth) * window.innerWidth;
  scoreElement.style.cssText = `
    left: ${window.innerWidth / 2 - arcCenterXinPixels * 1.3}px;
    top: ${window.innerHeight / 2}px
  `;
}

function getLineMarkings(mapWidth, mapHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = trackColor;
  context.fillRect(0, 0, mapWidth, mapHeight);

  context.lineWidth = 2;
  context.strokeStyle = "#E0FFFF";
  context.setLineDash([10, 14]);

  // Left circle
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    trackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  // Right circle
  context.beginPath();
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    trackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function getCurbsTexture(mapWidth, mapHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const context = canvas.getContext("2d");

  context.fillStyle = lawnGreen;
  context.fillRect(0, 0, mapWidth, mapHeight);

  // Extra big
  context.lineWidth = 65;
  context.strokeStyle = "#A2FF75";
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    arcAngle1,
    -arcAngle1
  );
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    Math.PI + arcAngle2,
    Math.PI - arcAngle2,
    true
  );
  context.stroke();

  context.beginPath();
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    Math.PI + arcAngle1,
    Math.PI - arcAngle1
  );
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    arcAngle2,
    -arcAngle2,
    true
  );
  context.stroke();

  // Extra small
  context.lineWidth = 60;
  context.strokeStyle = lawnGreen;
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    arcAngle1,
    -arcAngle1
  );
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    Math.PI + arcAngle2,
    Math.PI - arcAngle2,
    true
  );
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    Math.PI + arcAngle1,
    Math.PI - arcAngle1
  );
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    arcAngle2,
    -arcAngle2,
    true
  );
  context.stroke();

  // Base
  context.lineWidth = 6;
  context.strokeStyle = edgeColor;

  // Outer circle left
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  // Outer circle right
  context.beginPath();
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    outerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  // Inner circle left
  context.beginPath();
  context.arc(
    mapWidth / 2 - arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  // Inner circle right
  context.beginPath();
  context.arc(
    mapWidth / 2 + arcCenterX,
    mapHeight / 2,
    innerTrackRadius,
    0,
    Math.PI * 2
  );
  context.stroke();

  return new THREE.CanvasTexture(canvas);
}

function getLeftIsland() {
  const islandLeft = new THREE.Shape();

  islandLeft.absarc(
    -arcCenterX,
    0,
    innerTrackRadius,
    arcAngle1,
    -arcAngle1,
    false
  );

  islandLeft.absarc(
    arcCenterX,
    0,
    outerTrackRadius,
    Math.PI + arcAngle2,
    Math.PI - arcAngle2,
    true
  );

  return islandLeft;
}

function getMiddleIsland() {
  const islandMiddle = new THREE.Shape();

  islandMiddle.absarc(
    -arcCenterX,
    0,
    innerTrackRadius,
    arcAngle3,
    -arcAngle3,
    true
  );

  islandMiddle.absarc(
    arcCenterX,
    0,
    innerTrackRadius,
    Math.PI + arcAngle3,
    Math.PI - arcAngle3,
    true
  );

  return islandMiddle;
}

function getRightIsland() {
  const islandRight = new THREE.Shape();

  islandRight.absarc(
    arcCenterX,
    0,
    innerTrackRadius,
    Math.PI - arcAngle1,
    Math.PI + arcAngle1,
    true
  );

  islandRight.absarc(
    -arcCenterX,
    0,
    outerTrackRadius,
    -arcAngle2,
    arcAngle2,
    false
  );

  return islandRight;
}

function getOuterField(mapWidth, mapHeight) {
  const field = new THREE.Shape();

  field.moveTo(-mapWidth / 2, -mapHeight / 2);
  field.lineTo(0, -mapHeight / 2);

  field.absarc(-arcCenterX, 0, outerTrackRadius, -arcAngle4, arcAngle4, true);

  field.absarc(
    arcCenterX,
    0,
    outerTrackRadius,
    Math.PI - arcAngle4,
    Math.PI + arcAngle4,
    true
  );

  field.lineTo(0, -mapHeight / 2);
  field.lineTo(mapWidth / 2, -mapHeight / 2);
  field.lineTo(mapWidth / 2, mapHeight / 2);
  field.lineTo(-mapWidth / 2, mapHeight / 2);

  return field;
}

function renderMap(mapWidth, mapHeight) {
  const lineMarkingsTexture = getLineMarkings(mapWidth, mapHeight);

  const planeGeometry = new THREE.PlaneBufferGeometry(mapWidth, mapHeight);
  const planeMaterial = new THREE.MeshPhongMaterial({
    map: lineMarkingsTexture,
  });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.receiveShadow = true;
  plane.matrixAutoUpdate = false;
  scene.add(plane);

  // Extruded geometry with curbs
  const islandLeft = getLeftIsland();
  const islandMiddle = getMiddleIsland();
  const islandRight = getRightIsland();
  const outerField = getOuterField(mapWidth, mapHeight);

  // Mapping a texture on an extruded geometry works differently than mapping it to a box
  // By default it is mapped to a 1x1 unit square, and we have to stretch it out by setting repeat
  // We also need to shift it by setting the offset to have it centered
  const curbsTexture = getCurbsTexture(mapWidth, mapHeight);
  curbsTexture.offset = new THREE.Vector2(0.5, 0.5);
  curbsTexture.repeat.set(1 / mapWidth, 1 / mapHeight);

  // An extruded geometry turns a 2D shape into 3D by giving it a depth
  const fieldGeometry = new THREE.ExtrudeBufferGeometry(
    [islandLeft, islandRight, islandMiddle, outerField],
    { depth: 6, bevelEnabled: false }
  );

  const fieldMesh = new THREE.Mesh(fieldGeometry, [
    new THREE.MeshPhongMaterial({
      // Either set a plain color or a texture depending on config
      color: !config.curbs && lawnGreen,
      map: config.curbs && curbsTexture,
    }),
    new THREE.MeshPhongMaterial({ color: 0x23311c }),
  ]);
  fieldMesh.receiveShadow = true;
  fieldMesh.matrixAutoUpdate = false;
  scene.add(fieldMesh);

  positionScoreElement();

  if (config.trees) {
    const tree1 = Tree();
    tree1.position.x = -arcCenterX * 1.5;
    tree1.position.y = -arcCenterX * 1.8;
    scene.add(tree1);

    const tree2 = Tree();
    tree2.position.y = arcCenterX * 1.9;
    tree2.position.x = arcCenterX * 1.3;
    scene.add(tree2);

    const tree3 = Tree();
    tree3.position.x = arcCenterX * 0.8;
    tree3.position.y = arcCenterX * 2;
    scene.add(tree3);

    const tree4 = Tree();
    tree4.position.x = arcCenterX * 1.8;
    tree4.position.y = arcCenterX * 2;
    scene.add(tree4);

    const tree5 = Tree();
    tree5.position.x = -arcCenterX * 1;
    tree5.position.y = arcCenterX * 2;
    scene.add(tree5);

    const tree6 = Tree();
    tree6.position.x = -arcCenterX * 2;
    tree6.position.y = arcCenterX * 1.8;
    scene.add(tree6);

    const tree7 = Tree();
    tree7.position.x = arcCenterX * 0.8;
    tree7.position.y = -arcCenterX * 2;
    scene.add(tree7);

    const tree8 = Tree();
    tree8.position.x = arcCenterX * 1.8;
    tree8.position.y = -arcCenterX * 2;
    scene.add(tree8);

    const tree9 = Tree();
    tree9.position.x = -arcCenterX * 1;
    tree9.position.y = -arcCenterX * 2;
    scene.add(tree9);

    const tree10 = Tree();
    tree10.position.x = -arcCenterX * 2;
    tree10.position.y = -arcCenterX * 1.8;
    scene.add(tree10);

    const tree11 = Tree();
    tree11.position.x = arcCenterX * 0.6;
    tree11.position.y = -arcCenterX * 2.3;
    scene.add(tree11);

    const tree12 = Tree();
    tree12.position.x = arcCenterX * 1.5;
    tree12.position.y = -arcCenterX * 2.4;
    scene.add(tree12);

    const tree13 = Tree();
    tree13.position.x = -arcCenterX * 0.7;
    tree13.position.y = -arcCenterX * 2.4;
    scene.add(tree13);
  }
}

function getCarFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 64, 32);

  context.fillStyle = "#666666";
  context.fillRect(8, 8, 48, 24);

  return new THREE.CanvasTexture(canvas);
}

function getCarSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 128, 32);

  context.fillStyle = "#666666";
  context.fillRect(10, 8, 38, 24);
  context.fillRect(58, 8, 60, 24);

  return new THREE.CanvasTexture(canvas);
}

function Car() {
  const car = new THREE.Group();

  const color = pickRandom(vehicleColors);

  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60, 30, 15),
    new THREE.MeshPhongMaterial({ color })
  );
  main.position.z = 12;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const carFrontTexture = getCarFrontTexture();
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  carFrontTexture.rotation = Math.PI / 2;

  const carBackTexture = getCarFrontTexture();
  carBackTexture.center = new THREE.Vector2(0.5, 0.5);
  carBackTexture.rotation = -Math.PI / 2;

  const carLeftSideTexture = getCarSideTexture();
  carLeftSideTexture.flipY = false;

  const carRightSideTexture = getCarSideTexture();

  const cabin = new THREE.Mesh(new THREE.BoxBufferGeometry(33, 24, 12), [
    new THREE.MeshPhongMaterial({ map: carFrontTexture }),
    new THREE.MeshPhongMaterial({ map: carBackTexture }),
    new THREE.MeshPhongMaterial({ map: carLeftSideTexture }),
    new THREE.MeshPhongMaterial({ map: carRightSideTexture }),
    new THREE.MeshPhongMaterial({ color: 0xffffff }), // top
    new THREE.MeshPhongMaterial({ color: 0xffffff }), // bottom
  ]);
  cabin.position.x = -6;
  cabin.position.z = 25.5;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const backWheel = new Wheel();
  backWheel.position.x = -18;
  car.add(backWheel);

  const frontWheel = new Wheel();
  frontWheel.position.x = 18;
  car.add(frontWheel);

  const rightHeadlight = new Headlight(false);
  rightHeadlight.position.set(30.5, 10, 15);
  car.add(rightHeadlight);

  const leftHeadlight = new Headlight(false);
  leftHeadlight.position.set(30.5, -10, 15);
  car.add(leftHeadlight);

  if (config.showHitZones) {
    car.userData.hitZone1 = HitZone();
    car.userData.hitZone2 = HitZone();
  }

  return car;
}

function Headlight(projecting) {
  // Headlight geometry
  const headlight = new THREE.Mesh(
    new THREE.BoxBufferGeometry(1, 5, 4),
    new THREE.MeshStandardMaterial({ color: 0xdbe5ff, emissive: 0xdbe5ff })
  );
  const distance = 600;
  const angel = Math.PI / 1.65;
  const penumbra = 0.25;

  if (projecting) {
    const light = new THREE.SpotLight(
      0xffffff,
      headlightIntensity,
      distance,
      penumbra,
      angel
    );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.target.position.set(600, 0, 10);
    light.position.set(-35, 0, 0);
    headlight.add(light.target);
    headlight.add(light);
  }
  return headlight;
}

function Convertible() {
  const convertible = new THREE.Group();
  const color = 0xfd4058;
  const main = new THREE.Mesh(
    new THREE.BoxBufferGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color })
  );
  main.position.z = 12;
  main.castShadow = true;
  main.receiveShadow = true;

  const cockpit = new THREE.Mesh(
    new THREE.BoxBufferGeometry(20, 24, 8),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  );
  cockpit.position.set(-3.8, 0, 16.5);

  main.updateMatrix();
  cockpit.updateMatrix();

  const subRes = CSG.subtract(main, cockpit);
  convertible.add(subRes);

  const driverSeat = new THREE.Mesh(
    new THREE.BoxBufferGeometry(3, 9, 9),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  driverSeat.position.set(-11.5, 5, 17.5);
  driverSeat.rotation.set(0, Math.PI / -16, 0);
  convertible.add(driverSeat);

  const passengerSeat = new THREE.Mesh(
    new THREE.BoxBufferGeometry(3, 9, 9),
    new THREE.MeshPhongMaterial({ color: 0x666666 })
  );
  passengerSeat.position.set(-11.5, -5, 17.5);
  passengerSeat.rotation.set(0, Math.PI / -16, 0);
  convertible.add(passengerSeat);

  const carFrontTexture = getCarFrontTexture();
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  carFrontTexture.rotation = Math.PI / 2;

  const carBackTexture = getCarFrontTexture();
  carBackTexture.center = new THREE.Vector2(0.5, 0.5);
  carBackTexture.rotation = -Math.PI / 2;

  const windshield = new THREE.Mesh(new THREE.BoxBufferGeometry(4, 24, 12), [
    new THREE.MeshLambertMaterial({ map: carFrontTexture }),
    new THREE.MeshLambertMaterial({ map: carBackTexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // top
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // bottom
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // top
    new THREE.MeshLambertMaterial({ color: 0xffffff }), // bottom
  ]);

  windshield.position.x = 8;
  windshield.position.y = 0;
  windshield.position.z = 25.5;
  // windshield.position.set(0, 0, 35.5);

  windshield.castShadow = true;
  windshield.receiveShadow = true;
  convertible.add(windshield);

  const backWheel = new Wheel();
  backWheel.position.x = -18;
  convertible.add(backWheel);

  const frontWheel = new Wheel();
  frontWheel.position.x = 18;
  convertible.add(frontWheel);

  const rightHeadlight = new Headlight(true);
  rightHeadlight.position.set(30.5, 10, 15);
  convertible.add(rightHeadlight);

  const leftHeadlight = new Headlight(true);
  leftHeadlight.position.set(30.5, -10, 15);
  convertible.add(leftHeadlight);

  return convertible;
}

function getTruckFrontTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 32, 32);

  context.fillStyle = "#666666";
  context.fillRect(0, 5, 32, 10);

  return new THREE.CanvasTexture(canvas);
}

function getTruckSideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 32, 32);

  context.fillStyle = "#666666";
  context.fillRect(17, 5, 15, 10);

  return new THREE.CanvasTexture(canvas);
}

function Truck() {
  const truck = new THREE.Group();
  const color = pickRandom(vehicleColors);

  const base = new THREE.Mesh(
    new THREE.BoxBufferGeometry(100, 25, 5),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc })
  );
  base.position.z = 10;
  truck.add(base);

  const cargo = new THREE.Mesh(
    new THREE.BoxBufferGeometry(75, 35, 40),
    new THREE.MeshPhongMaterial({ color: 0xffffff }) // 0xb4c6fc
  );
  cargo.position.x = -15;
  cargo.position.z = 30;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const truckFrontTexture = getTruckFrontTexture();
  truckFrontTexture.center = new THREE.Vector2(0.5, 0.5);
  truckFrontTexture.rotation = Math.PI / 2;

  const truckLeftTexture = getTruckSideTexture();
  truckLeftTexture.flipY = false;

  const truckRightTexture = getTruckSideTexture();

  const cabin = new THREE.Mesh(new THREE.BoxBufferGeometry(25, 30, 30), [
    new THREE.MeshPhongMaterial({ color, map: truckFrontTexture }),
    new THREE.MeshPhongMaterial({ color }), // back
    new THREE.MeshPhongMaterial({ color, map: truckLeftTexture }),
    new THREE.MeshPhongMaterial({ color, map: truckRightTexture }),
    new THREE.MeshPhongMaterial({ color }), // top
    new THREE.MeshPhongMaterial({ color }), // bottom
  ]);
  cabin.position.x = 40;
  cabin.position.z = 20;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const backWheel = Wheel();
  backWheel.position.x = -30;
  truck.add(backWheel);

  const middleWheel = Wheel();
  middleWheel.position.x = 10;
  truck.add(middleWheel);

  const frontWheel = Wheel();
  frontWheel.position.x = 38;
  truck.add(frontWheel);

  const rightHeadlight = new Headlight(false);
  rightHeadlight.position.set(52.5, 10, 15);
  truck.add(rightHeadlight);

  const leftHeadlight = new Headlight(false);
  leftHeadlight.position.set(52.5, -10, 15);
  truck.add(leftHeadlight);

  if (config.showHitZones) {
    truck.userData.hitZone1 = HitZone();
    truck.userData.hitZone2 = HitZone();
    truck.userData.hitZone3 = HitZone();
  }

  return truck;
}

function HitZone() {
  const hitZone = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 20, 60, 30),
    new THREE.MeshPhongMaterial({ color: 0xff0000 })
  );
  hitZone.position.z = 25;
  hitZone.rotation.x = Math.PI / 2;

  scene.add(hitZone);
  return hitZone;
}

function Wheel() {
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheel.position.z = 6;
  wheel.castShadow = false;
  wheel.receiveShadow = false;
  return wheel;
}

function Tree() {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(treeTrunkGeometry, treeTrunkMaterial);
  trunk.position.z = 10;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  trunk.matrixAutoUpdate = false;
  tree.add(trunk);

  const treeHeights = [45, 60, 75];
  const height = pickRandom(treeHeights);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(height / 2, 30, 30),
    treeCrownMaterial
  );
  crown.position.z = height / 2 + 30;
  crown.castShadow = true;
  crown.receiveShadow = false;
  tree.add(crown);

  return tree;
}

// TODO: Add touch interaction
accelerateButton.addEventListener("mousedown", function () {
  startGame();
  accelerate = true;
});
accelerateButton.addEventListener("touchstart", function () {
  startGame();
  accelerate = true;
});
decelerateButton.addEventListener("mousedown", function () {
  startGame();
  decelerate = true;
});
decelerateButton.addEventListener("touchstart", function () {
  startGame();
  decelerate = true;
});
accelerateButton.addEventListener("mouseup", function () {
  accelerate = false;
});
accelerateButton.addEventListener("touchend", function () {
  accelerate = false;
});
decelerateButton.addEventListener("mouseup", function () {
  decelerate = false;
});
decelerateButton.addEventListener("touchend", function () {
  decelerate = false;
});

window.addEventListener("keydown", function (event) {
  if (event.key == "ArrowUp") {
    startGame();
    accelerate = true;
    carSound.setPlaybackRate(1.2);
    return;
  }
  if (event.key == "ArrowDown") {
    decelerate = true;
    carSound.setPlaybackRate(0.8);
    return;
  }
  if (event.key == "R" || event.key == "r") {
    reset();
    return;
  }
});
window.addEventListener("keyup", function (event) {
  if (event.key == "ArrowUp") {
    accelerate = false;
    carSound.setPlaybackRate(1);
    return;
  }
  if (event.key == "ArrowDown") {
    decelerate = false;
    carSound.setPlaybackRate(1);
    return;
  }
});

function animation(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
    return;
  }

  const timeDelta = timestamp - lastTimestamp;

  movePlayerCar(timeDelta);

  const laps = Math.floor(Math.abs(playerAngleMoved) / (Math.PI * 2));

  if (laps > 9) {
    isNight = true;
  }

  // Update score if it changed
  if (laps != score) {
    score = laps;
    scoreElement.innerText = `Laps: ${score}`;
  }

  // Add a new vehicle at the beginning and with every 5th lap
  if (otherVehicles.length < (laps + 1) / 5) addVehicle();

  moveOtherVehicles(timeDelta);

  hitDetection();

  if (isNight && scene.fog.near > 0) {
    scene.fog.near -= 20;
  } else if (!isNight && scene.fog.near < 1000) {
    scene.fog.near += 20;
  }

  if (isNight && ambientLight.intensity > 0.0025) {
    ambientLight.intensity -= 0.01;
  } else if (!isNight && ambientLight.intensity < 0.75) {
    ambientLight.intensity += 0.01;
  }

  if (isNight && playerCar.children[6].children[1].intensity < 4) {
    playerCar.children[6].children[1].intensity += 0.025;
    playerCar.children[7].children[1].intensity += 0.025;
  }

  if (isNight && lamp.children[9].intensity < 1.5) {
    lamp.children[7].intensity += 0.025;
    lamp.children[9].intensity += 0.025;
  }

  renderer.render(scene, camera);
  lastTimestamp = timestamp;
}

function movePlayerCar(timeDelta) {
  const playerSpeed = getPlayerSpeed();
  playerAngleMoved -= playerSpeed * timeDelta;

  const totalPlayerAngle = playerAngleInitial + playerAngleMoved;

  const playerX = Math.cos(totalPlayerAngle) * trackRadius - arcCenterX;
  const playerY = Math.sin(totalPlayerAngle) * trackRadius;

  playerCar.position.x = playerX;
  playerCar.position.y = playerY;
  playerCar.rotation.z = totalPlayerAngle - Math.PI / 2;
}

function moveOtherVehicles(timeDelta) {
  otherVehicles.forEach((vehicle) => {
    if (vehicle.clockwise) {
      vehicle.angle -= speed * timeDelta * vehicle.speed;
    } else {
      vehicle.angle += speed * timeDelta * vehicle.speed;
    }

    const vehicleX = Math.cos(vehicle.angle) * trackRadius + arcCenterX;
    const vehicleY = Math.sin(vehicle.angle) * trackRadius;
    const rotation =
      vehicle.angle + (vehicle.clockwise ? -Math.PI / 2 : Math.PI / 2);
    vehicle.mesh.position.x = vehicleX;
    vehicle.mesh.position.y = vehicleY;
    vehicle.mesh.rotation.z = rotation;
  });
}

function getPlayerSpeed() {
  if (accelerate) return speed * 2;
  if (decelerate) return speed * 0.5;
  return speed;
}

function addVehicle() {
  const vehicleTypes = ["car", "truck"];

  const type = pickRandom(vehicleTypes);
  const speed = getVehicleSpeed(type);
  const clockwise = Math.random() >= 0.5;

  const angle = clockwise ? Math.PI / 2 : -Math.PI / 2;

  const mesh = type == "car" ? Car() : Truck();
  scene.add(mesh);

  otherVehicles.push({ mesh, type, speed, clockwise, angle });
}

function getVehicleSpeed(type) {
  if (type == "car") {
    const minimumSpeed = 1;
    const maximumSpeed = 2;
    return minimumSpeed + Math.random() * (maximumSpeed - minimumSpeed);
  }
  if (type == "truck") {
    const minimumSpeed = 0.6;
    const maximumSpeed = 1.5;
    return minimumSpeed + Math.random() * (maximumSpeed - minimumSpeed);
  }
}

function getHitZonePosition(center, angle, clockwise, distance) {
  const directionAngle = angle + clockwise ? -Math.PI / 2 : +Math.PI / 2;
  return {
    x: center.x + Math.cos(directionAngle) * distance,
    y: center.y + Math.sin(directionAngle) * distance,
  };
}

function hitDetection() {
  const playerHitZone1 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    15
  );

  const playerHitZone2 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    -15
  );

  if (config.showHitZones) {
    playerCar.userData.hitZone1.position.x = playerHitZone1.x;
    playerCar.userData.hitZone1.position.y = playerHitZone1.y;

    playerCar.userData.hitZone2.position.x = playerHitZone2.x;
    playerCar.userData.hitZone2.position.y = playerHitZone2.y;
  }

  const hit = otherVehicles.some((vehicle) => {
    if (vehicle.type == "car") {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        15
      );

      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -15
      );

      if (config.showHitZones) {
        vehicle.mesh.userData.hitZone1.position.x = vehicleHitZone1.x;
        vehicle.mesh.userData.hitZone1.position.y = vehicleHitZone1.y;

        vehicle.mesh.userData.hitZone2.position.x = vehicleHitZone2.x;
        vehicle.mesh.userData.hitZone2.position.y = vehicleHitZone2.y;
      }

      // The player hits another vehicle
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) return true;

      // Another vehicle hits the player
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) return true;
    }

    if (vehicle.type == "truck") {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        35
      );

      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        0
      );

      const vehicleHitZone3 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -35
      );

      if (config.showHitZones) {
        vehicle.mesh.userData.hitZone1.position.x = vehicleHitZone1.x;
        vehicle.mesh.userData.hitZone1.position.y = vehicleHitZone1.y;

        vehicle.mesh.userData.hitZone2.position.x = vehicleHitZone2.x;
        vehicle.mesh.userData.hitZone2.position.y = vehicleHitZone2.y;

        vehicle.mesh.userData.hitZone3.position.x = vehicleHitZone3.x;
        vehicle.mesh.userData.hitZone3.position.y = vehicleHitZone3.y;
      }

      // The player hits another vehicle
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) return true;
      if (getDistance(playerHitZone1, vehicleHitZone3) < 40) return true;

      // Another vehicle hits the player
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) return true;
    }
  });

  if (hit) {
    if (resultsElement) resultsElement.style.display = "flex";
    carSound.pause();
    crashSound.play();
    if (score > userHighScore) {
      userHighScore = score;
      storeUserHighScore(userHighScore);
      highScoreElement.innerText = `High Score: ${userHighScore}`;
    }
    renderer.setAnimationLoop(null); // Stop animation loop
  }
}

window.addEventListener("resize", () => {
  console.log("resize", window.innerWidth, window.innerHeight);

  // Adjust camera
  const newAspectRatio = window.innerWidth / window.innerHeight;
  const adjustedCameraHeight = cameraWidth / newAspectRatio;

  camera.top = adjustedCameraHeight / 2;
  camera.bottom = adjustedCameraHeight / -2;
  camera.updateProjectionMatrix(); // Must be called after change

  positionScoreElement();

  // Reset renderer
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.render(scene, camera);
});

// create an AudioListener and add it to the camera
const listener = new THREE.AudioListener();
camera.add(listener);

import carSoundFile from "./assets/CartoonCarLoop.mp3";
import musicSoundFile from "./assets/Closing.mp3";
import crashSoundFile from "./assets/CarCrash.mp3";

// create a global audio source
const carSound = new THREE.Audio(listener);
// load a sound and set it as the Audio object's buffer
const audioLoader = new THREE.AudioLoader();
audioLoader.load(carSoundFile, function (buffer) {
  carSound.setBuffer(buffer);
  carSound.setLoop(true);
  carSound.setVolume(0.4);
});

// create a global audio source
const musicSound = new THREE.Audio(listener);
// load a sound and set it as the Audio object's buffer
audioLoader.load(musicSoundFile, function (buffer) {
  musicSound.setBuffer(buffer);
  musicSound.setLoop(true);
  musicSound.setVolume(0.15);
});

// create a global audio source
const crashSound = new THREE.Audio(listener);
// load a sound and set it as the Audio object's buffer
audioLoader.load(crashSoundFile, function (buffer) {
  crashSound.setBuffer(buffer);
  crashSound.setLoop(false);
  crashSound.setVolume(0.1);
});
