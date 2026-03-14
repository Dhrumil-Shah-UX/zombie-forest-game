import * as THREE from "three";

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.setClearColor(0x050b07, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050b07, 18, 170);
  return scene;
}

export function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 220);
  camera.position.set(0, 1.7, 4);
  camera.lookAt(0, 1.7, -12);
  return camera;
}

export function addLights(scene) {
  const hemi = new THREE.HemisphereLight(0xa9c7ff, 0x020503, 0.55);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xcfe3ff, 1.25);
  dir.position.set(-18, 26, 10);
  dir.target.position.set(0, 0, -30);
  scene.add(dir.target);
  scene.add(dir);

  const ambient = new THREE.AmbientLight(0x0e1410, 0.9);
  scene.add(ambient);
}

export function addGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x0b2216, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
}

export function createWeaponModel() {
  const weapon = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.25, 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x141821,
      metalness: 0.3,
      roughness: 0.4,
    }),
  );
  body.position.set(0, -0.05, -0.7);
  weapon.add(body);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10),
    new THREE.MeshStandardMaterial({
      color: 0x3b4a5c,
      metalness: 0.6,
      roughness: 0.35,
    }),
  );
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.12, 0.02, -1.3);
  weapon.add(barrel);

  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.4, 0.25),
    new THREE.MeshStandardMaterial({
      color: 0x18110b,
      metalness: 0.1,
      roughness: 0.8,
    }),
  );
  grip.position.set(-0.18, -0.3, -0.55);
  grip.rotation.x = -0.4;
  weapon.add(grip);

  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.06, 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x222a35,
      metalness: 0.3,
      roughness: 0.5,
    }),
  );
  rail.position.set(0.05, 0.12, -0.6);
  weapon.add(rail);

  weapon.position.set(0.55, -0.4, -1.15);
  weapon.rotation.set(-0.15, 0.4, 0.0);

  return weapon;
}

export function createMuzzleFlash() {
  const flashGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff6d0,
    transparent: true,
    opacity: 0.0,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.set(0.38, 0.02, -1.7);
  flash.visible = false;
  return flash;
}

