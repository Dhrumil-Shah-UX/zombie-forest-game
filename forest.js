import * as THREE from "three";

function makeSeededRng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randBetween(rng, a, b) {
  return a + (b - a) * rng();
}

function createTreeMeshes() {
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 2.6, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 1, metalness: 0 });

  const leavesGeoCone = new THREE.ConeGeometry(0.95, 2.2, 10);
  const leavesGeoBall = new THREE.SphereGeometry(0.9, 10, 8);
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x173d25, roughness: 1, metalness: 0 });

  return { trunkGeo, trunkMat, leavesGeoCone, leavesGeoBall, leavesMat };
}

export function addForest(scene, options = {}) {
  const { seed = 0x1337cafe, treeCount = 520, areaRadius = 230, keepClearRadius = 12 } = options;
  const rng = makeSeededRng(seed);
  const mats = createTreeMeshes();

  const forest = new THREE.Group();
  forest.name = "forest";

  for (let i = 0; i < treeCount; i++) {
    const tree = new THREE.Group();
    const angle = randBetween(rng, 0, Math.PI * 2);
    const radius = Math.sqrt(randBetween(rng, 0, 1)) * areaRadius;
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;

    if (Math.hypot(x, z) < keepClearRadius) {
      const push = keepClearRadius + randBetween(rng, 2, 10);
      x = Math.cos(angle) * push;
      z = Math.sin(angle) * push;
    }

    tree.position.set(x, 0, z);
    tree.rotation.y = randBetween(rng, -Math.PI, Math.PI);

    const heightScale = randBetween(rng, 0.75, 1.5);
    const trunk = new THREE.Mesh(mats.trunkGeo, mats.trunkMat);
    trunk.scale.set(randBetween(rng, 0.8, 1.25), heightScale, randBetween(rng, 0.8, 1.25));
    trunk.position.y = (2.6 * trunk.scale.y) / 2;
    tree.add(trunk);

    const useCone = rng() < 0.65;
    const leaves = new THREE.Mesh(useCone ? mats.leavesGeoCone : mats.leavesGeoBall, mats.leavesMat);
    leaves.position.y = trunk.position.y + 1.1 * heightScale;
    leaves.scale.setScalar(randBetween(rng, 0.75, 1.35));
    tree.add(leaves);

    forest.add(tree);
  }

  scene.add(forest);
  return forest;
}

