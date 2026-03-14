import * as THREE from "three";
import {
  createRenderer as setupRenderer,
  createScene as setupScene,
  createCamera as setupCamera,
  addLights as setupLights,
  addGround as setupGround,
  createWeaponModel as makeWeaponModel,
  createMuzzleFlash as makeMuzzleFlash,
} from "./sceneSetup.js";
import { addForest as addForestToScene } from "./forest.js";
import { createZombie as createZombieModel } from "./zombies.js";
import { initWebcam } from "./webcam.js";
import { initHandTracking } from "./handTracking.js";

// Basic first-person forest scene (player fixed in place for now).

function mustGetEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el;
}

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

function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.setClearColor(0x050b07, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050b07, 18, 170);
  return scene;
}

function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 220);
  camera.position.set(0, 1.7, 4);
  camera.lookAt(0, 1.7, -12);
  return camera;
}

function addLights(scene) {
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

function addGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x0b2216, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
}

function createZombie() {
  // Simple placeholder zombie made of basic meshes with a clear silhouette.
  const zombie = new THREE.Group();

  const skinColor = 0x6bff8b;
  const darkCloth = 0x071013;

  // Torso
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.4, 0.4),
    new THREE.MeshStandardMaterial({
      color: darkCloth,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  torso.position.set(0, 1.35, 0);
  zombie.add(torso);

  // Head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.6),
    new THREE.MeshStandardMaterial({
      color: skinColor,
      emissive: 0x306b3f,
      emissiveIntensity: 0.3,
      roughness: 0.8,
    }),
  );
  head.position.set(0, 2.2, 0);
  zombie.add(head);

  // Eyes (small glowing quads)
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfafcff });
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.15, 2.27, 0.32);
  rightEye.position.set(0.15, 2.25, 0.32);
  zombie.add(leftEye, rightEye);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.9, 6);
  const armMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.7,
    metalness: 0.0,
  });

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.55, 1.45, 0.05);
  leftArm.rotation.z = 0.9;

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.55, 1.45, 0.05);
  rightArm.rotation.z = -0.9;

  zombie.add(leftArm, rightArm);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.25, 0.9, 0.35);
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x10161a,
    roughness: 0.9,
    metalness: 0.0,
  });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.22, 0.45, 0.02);
  rightLeg.position.set(0.22, 0.45, 0.02);
  zombie.add(leftLeg, rightLeg);

  // Slight hunch for creepiness.
  zombie.rotation.x = -0.08;

  return zombie;
}

function createWeaponModel() {
  // Simple arcade-style weapon built from basic geometry,
  // positioned in camera space (bottom-right of the screen).
  const weapon = new THREE.Group();

  // Main body
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

  // Barrel
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

  // Grip
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

  // Small accent on top
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

  // Position weapon in camera-local space (bottom-right corner).
  weapon.position.set(0.55, -0.4, -1.15);
  weapon.rotation.set(-0.15, 0.4, 0.0);

  return weapon;
}

function createMuzzleFlash() {
  const flashGeo = new THREE.SphereGeometry(0.08, 8, 6);
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff6d0,
    transparent: true,
    opacity: 0.0,
  });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  // Position roughly at the end of the barrel in weapon-local space.
  flash.position.set(0.38, 0.02, -1.7);
  flash.visible = false;
  return flash;
}

function createTreeMeshes() {
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 2.6, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 1, metalness: 0 });

  const leavesGeoCone = new THREE.ConeGeometry(0.95, 2.2, 10);
  const leavesGeoBall = new THREE.SphereGeometry(0.9, 10, 8);
  const leavesMat = new THREE.MeshStandardMaterial({ color: 0x173d25, roughness: 1, metalness: 0 });

  return { trunkGeo, trunkMat, leavesGeoCone, leavesGeoBall, leavesMat };
}

function addForest(scene, options = {}) {
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

function createApp() {
  const container = mustGetEl("game-container");
  const renderer = setupRenderer(container);
  const scene = setupScene();
  const camera = setupCamera(container);

  setupLights(scene);
  setupGround(scene);
  const forest = addForestToScene(scene);

  const clock = new THREE.Clock();
  let weapon;
  const baseCameraPosition = camera.position.clone();
  let muzzleFlash;
  const zombies = [];
  const spawn = {
    timer: 0,
    minInterval: 4,
    maxInterval: 8,
    maxActive: 18,
    baseMin: 4,
    baseMax: 8,
    baseMaxActive: 18,
  };

  function spawnSingleZombieAhead() {
    if (zombies.length >= spawn.maxActive) return;

    const z = createZombieModel();

    // Base forward direction from camera, flattened to XZ so zombies stay on the ground.
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
    forward.normalize();

    // Right vector to spread spawns horizontally across the view frustum.
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const minDist = 18;
    const maxDist = 42;
    const dist = THREE.MathUtils.lerp(minDist, maxDist, Math.random());
    const side = THREE.MathUtils.lerp(-14, 14, Math.random());

    const spawnPos = new THREE.Vector3()
      .copy(camera.position)
      .addScaledVector(forward, dist)
      .addScaledVector(right, side);

    // Ensure we never spawn too close to the player just in case.
    const toCamXZ = new THREE.Vector3(spawnPos.x - camera.position.x, 0, spawnPos.z - camera.position.z);
    if (toCamXZ.length() < minDist * 0.8) {
      toCamXZ.normalize().multiplyScalar(minDist * 0.8);
      spawnPos.set(camera.position.x + toCamXZ.x, spawnPos.y, camera.position.z + toCamXZ.z);
    }

    z.position.set(spawnPos.x, 0, spawnPos.z);

    // Per-zombie movement and sway parameters.
    const baseSpeed = THREE.MathUtils.lerp(0.7, 1.3, Math.random()); // units per second
    const speedScale = 1 + 0.08 * (wave - 1);
    z.userData.speed = baseSpeed * speedScale;
    z.userData.swayOffset = Math.random() * Math.PI * 2;
    z.userData.reachedLogged = false;

    scene.add(z);
    zombies.push(z);
  }

  function spawnZombies(count) {
    const minCount = 4;
    const maxCount = 6;
    const n =
      typeof count === "number" && count > 0
        ? Math.floor(count)
        : Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    for (let i = 0; i < n; i++) spawnSingleZombieAhead();
  }

  function resetSpawnTimer() {
    spawn.timer = THREE.MathUtils.lerp(spawn.minInterval, spawn.maxInterval, Math.random());
  }

  // Shooting / score state
  const scoreEl = mustGetEl("hud-score");
  const healthEl = mustGetEl("hud-health");
  const gameOverEl = mustGetEl("game-over");
  const restartBtn = mustGetEl("restart-btn");
  const damageFlashEl = mustGetEl("damage-flash");
  const waveEl = mustGetEl("hud-wave");
  const handStatusEl = mustGetEl("hud-hand");
  const handCursorEl = mustGetEl("hand-cursor");
  let score = 0;
  let health = 100;
  let wave = 1;
  let killsThisWave = 0;
  let gameOver = false;
  const raycaster = new THREE.Raycaster();
  const shootCooldownTime = 0.25; // seconds
  let shootCooldown = 0;
  let muzzleTimer = 0;
  const damageFlashDuration = 0.35;
  let damageTimer = 0;

  const hitFlashes = [];

  function updateScore() {
    scoreEl.textContent = String(score);
  }

  function updateHealth() {
    healthEl.textContent = String(health);
  }

  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    spawn.timer = Number.POSITIVE_INFINITY;
    gameOverEl.classList.add("show");
  }

  function updateWave() {
    waveEl.textContent = String(wave);
  }

  function killsNeededForWave(w) {
    return 6 + (w - 1) * 4;
  }

  function recomputeSpawnSettings() {
    const intensity = 1 + 0.18 * (wave - 1);
    spawn.minInterval = spawn.baseMin / intensity;
    spawn.maxInterval = spawn.baseMax / (1 + 0.12 * (wave - 1));
    spawn.maxActive = Math.round(spawn.baseMaxActive + (wave - 1) * 2);
  }

  function removeZombieInstance(z) {
    const idx = zombies.indexOf(z);
    if (idx !== -1) {
      scene.remove(z);
      zombies.splice(idx, 1);
    }
  }

  function onZombieKilled() {
    score += 10;
    updateScore();
    killsThisWave += 1;

    if (killsThisWave >= killsNeededForWave(wave)) {
      wave += 1;
      killsThisWave = 0;
      updateWave();
      recomputeSpawnSettings();
    }
  }

  function restartGame() {
    // Reset core state
    gameOver = false;
    score = 0;
    health = 100;
    wave = 1;
    killsThisWave = 0;
    shootCooldown = 0;
    muzzleTimer = 0;
    updateScore();
    updateHealth();
    updateWave();
    gameOverEl.classList.remove("show");

    // Remove all active zombies from the scene and clear the array.
    for (const z of zombies) {
      scene.remove(z);
    }
    zombies.length = 0;

    // Remove any remaining hit flashes.
    for (const hf of hitFlashes) {
      scene.remove(hf.mesh);
    }
    hitFlashes.length = 0;

    // Reset spawn timers and immediately spawn a fresh wave.
    recomputeSpawnSettings();
    spawn.timer = 0;
    spawnZombies();
    resetSpawnTimer();
  }

  // Subtle first-person aiming using mouse position relative to screen center.
  const aim = {
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  };
  const maxYaw = 0.30; // reduced slightly for steadier hand aim
  const maxPitch = 0.18;

  function handleMouseMove(e) {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1 .. 1
    const ny = (e.clientY / window.innerHeight - 0.5) * 2; // -1 .. 1
    aim.targetYaw = THREE.MathUtils.clamp(nx * maxYaw, -maxYaw, maxYaw);
    aim.targetPitch = THREE.MathUtils.clamp(ny * maxPitch, -maxPitch, maxPitch);
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const MOUSE_SHOOT_ENABLED = false;
  const DEBUG_GESTURE_SHOT = false;
  let handTracker = null;
  let lastPinchState = false;

  function getHandAimNDC() {
    if (!handTracker || !handTracker.getHandStable()) {
      return { x: 0, y: 0 };
    }
    const ptr = handTracker.getPointer();
    if (!ptr) return { x: 0, y: 0 };
    // Convert normalized [0,1] to NDC [-1,1]
    let x = ptr.x * 2 - 1;
    let y = (ptr.y * 2 - 1) * -1;
    // Deadzone to reduce jitter near center
    const deadzone = 0.11;
    if (Math.abs(x) < deadzone) x = 0;
    if (Math.abs(y) < deadzone) y = 0;
    return { x, y };
  }

  function fireShot(source) {
    if (gameOver) return;
    if (shootCooldown > 0) return;

    shootCooldown = shootCooldownTime;

    // Raycast using current aim: hand pointer if stable, otherwise center screen.
    const ndc = getHandAimNDC();
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const intersects = raycaster.intersectObjects(zombies, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      // Find the root zombie group for the hit part.
      let root = hit.object;
      while (root && !zombies.includes(root) && root.parent) {
        root = root.parent;
      }
      if (root && zombies.includes(root)) {
        removeZombieInstance(root);
        onZombieKilled();

        // Simple hit flash at impact point.
        const flashGeo = new THREE.SphereGeometry(0.18, 10, 8);
        const flashMat = new THREE.MeshBasicMaterial({
          color: 0xfff6d0,
          transparent: true,
          opacity: 0.9,
        });
        const hitMesh = new THREE.Mesh(flashGeo, flashMat);
        hitMesh.position.copy(hit.point);
        scene.add(hitMesh);
        hitFlashes.push({ mesh: hitMesh, life: 0.12 });

        // Brief hit feedback on hand cursor (only live aim indicator).
        if (handCursorEl) {
          handCursorEl.classList.add("hit");
          window.setTimeout(() => {
            if (handCursorEl) handCursorEl.classList.remove("hit");
          }, 80);
        }
      }
    }

    // Trigger a brief muzzle flash on each shot.
    if (muzzleFlash) {
      muzzleFlash.visible = true;
      muzzleFlash.material.opacity = 0.9;
      muzzleFlash.scale.setScalar(1);
      muzzleTimer = 0.06;
    }

    if (DEBUG_GESTURE_SHOT && source === "gesture") {
      console.log("[Shoot] gesture shot fired");
    }
  }

  function handleShoot(event) {
    if (!MOUSE_SHOOT_ENABLED) return;
    if (event.button !== 0) return;
    fireShot("mouse");
  }

  function animate() {
    const dt = Math.min(clock.getDelta(), 1 / 30);
    const t = clock.getElapsedTime();
    // Subtle breathing / sway on the camera position so the environment stays stable.
    const breath = Math.sin(t * 0.55) * 0.03;
    const swaySide = Math.sin(t * 0.8 + 1.2) * 0.02;
    camera.position.set(
      baseCameraPosition.x + swaySide,
      baseCameraPosition.y + breath,
      baseCameraPosition.z,
    );

    // Hand-based aim: when a stable hand exists, drive aim targets from pointer.
    const useHandAim = handTracker && handTracker.getHandStable() && handTracker.getPointer();
    if (useHandAim) {
      const ptr = handTracker.getPointer();
      let nx = ptr.x * 2 - 1;
      let ny = (ptr.y * 2 - 1) * -1;
      const aimDeadzone = 0.11;
      if (Math.abs(nx) < aimDeadzone) nx = 0;
      if (Math.abs(ny) < aimDeadzone) ny = 0;
      aim.targetYaw = THREE.MathUtils.clamp(-nx * maxYaw, -maxYaw, maxYaw);
      aim.targetPitch = THREE.MathUtils.clamp(-ny * maxPitch, -maxPitch, maxPitch);
    }

    // Ease current yaw/pitch toward target; stronger damping for hand aim to reduce twitch.
    const lerpFactor = useHandAim
      ? 1 - Math.exp(-dt * 2.8)
      : 1 - Math.exp(-dt * 6);
    aim.yaw += (aim.targetYaw - aim.yaw) * lerpFactor;
    aim.pitch += (aim.targetPitch - aim.pitch) * lerpFactor;

    // Compute a forward direction with the small yaw/pitch offsets.
    const baseDir = new THREE.Vector3(0, 0, -1);
    const euler = new THREE.Euler(aim.pitch, aim.yaw, 0, "YXZ");
    const dir = baseDir.clone().applyEuler(euler);
    const lookTarget = camera.position.clone().add(dir);
    camera.lookAt(lookTarget);

    // Subtle idle sway for the weapon so it feels alive and connected to aim.
    if (weapon) {
      const swayX = Math.sin(t * 1.3) * 0.01;
      const swayY = Math.cos(t * 1.7) * 0.01;
      const aimInfluenceX = aim.yaw / maxYaw * 0.15;
      const aimInfluenceY = aim.pitch / maxPitch * 0.1;
      weapon.position.y = -0.4 + swayY - aimInfluenceY;
      weapon.position.x = 0.55 + swayX * 0.6 + aimInfluenceX;
      weapon.rotation.z = swayX * 0.2 + aimInfluenceX * 0.4;
    }

    // Hand cursor overlay follows smoothed pointer when hand is stable.
    if (handTracker && handTracker.getHandStable()) {
      const ptr = handTracker.getPointer();
      if (ptr) {
        handCursorEl.style.display = "block";
        handCursorEl.style.left = `${ptr.x * 100}%`;
        handCursorEl.style.top = `${ptr.y * 100}%`;
      } else {
        handCursorEl.style.display = "none";
      }
    } else {
      handCursorEl.style.display = "none";
    }

    // Gesture-based shooting: one shot per pinch press, respecting cooldown.
    if (!gameOver && handTracker) {
      const pinching = handTracker.getIsPinching();
      if (pinching && !lastPinchState) {
        fireShot("gesture");
      }
      lastPinchState = pinching;
    }

    if (!gameOver) {
      // Slow, creepy movement for each zombie toward the player camera.
      for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];
        const toCam = new THREE.Vector3().subVectors(camera.position, z.position);
        // Constrain to XZ plane so they stay on the ground.
        const toCamXZ = new THREE.Vector3(toCam.x, 0, toCam.z);
        const dist = toCamXZ.length();
        if (dist > 0.001) {
          toCamXZ.normalize();

          // Face roughly toward the player.
          z.rotation.y = Math.atan2(toCamXZ.x, toCamXZ.z);

          // Only move while not "touching" the player.
          const reachRadius = 1.4;
          if (dist > reachRadius) {
            const speed = z.userData.speed ?? 1.0;
            const step = speed * dt;
            z.position.addScaledVector(toCamXZ, step);
          } else if (!z.userData.reachedLogged) {
            z.userData.reachedLogged = true;

            // Simple damage: remove zombie and reduce health.
            scene.remove(z);
            zombies.splice(i, 1);
            health = Math.max(0, health - 10);
            updateHealth();

            // Trigger a short red damage flash overlay.
            damageTimer = damageFlashDuration;
            damageFlashEl.style.opacity = "1";

            if (health <= 0) {
              triggerGameOver();
            }
          }

          // Subtle body sway so they feel alive.
          const phase = z.userData.swayOffset ?? 0;
          const sway = Math.sin(t * 1.6 + phase) * 0.08;
          z.rotation.z = sway * 0.4;
          z.position.y = Math.max(0, Math.sin(t * 1.2 + phase) * 0.05);
        }
      }

      // Continuous spawning over time using a simple spawn timer.
      spawn.timer -= dt;
      if (spawn.timer <= 0) {
        spawnZombies(1);
        resetSpawnTimer();
      }
    }

    // Shooting cooldown & flash decay.
    if (shootCooldown > 0) shootCooldown = Math.max(0, shootCooldown - dt);
    if (muzzleFlash && muzzleTimer > 0) {
      muzzleTimer -= dt;
      const tNorm = Math.max(0, muzzleTimer / 0.06);
      muzzleFlash.material.opacity = tNorm;
      muzzleFlash.scale.setScalar(0.6 + tNorm * 0.7);
      if (muzzleTimer <= 0) {
        muzzleFlash.visible = false;
      }
    }

    // Damage overlay fade.
    if (damageTimer > 0) {
      damageTimer = Math.max(0, damageTimer - dt);
      const alpha = damageTimer / damageFlashDuration;
      damageFlashEl.style.opacity = String(alpha.toFixed(2));
    } else if (damageFlashEl.style.opacity !== "0") {
      damageFlashEl.style.opacity = "0";
    }

    // Fade and remove hit flashes.
    for (let i = hitFlashes.length - 1; i >= 0; i--) {
      const hf = hitFlashes[i];
      hf.life -= dt;
      if (hf.life <= 0) {
        scene.remove(hf.mesh);
        hitFlashes.splice(i, 1);
      } else {
        const alpha = hf.life / 0.12;
        hf.mesh.material.opacity = alpha;
      }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mousedown", handleShoot);
  restartBtn.addEventListener("click", restartGame);
  resize();

  // Initialize webcam preview (for future gesture controls).
  const webcamVideo = mustGetEl("webcam-preview");
  handStatusEl.textContent = "camera loading";
  (async () => {
    try {
      await initWebcam(webcamVideo);
    } catch (err) {
      console.warn("[Main] Webcam error:", err);
      handStatusEl.textContent = "camera error";
      return;
    }

    try {
      // MediaPipe assets are initialized here.
      handTracker = await initHandTracking(webcamVideo, {
        onStatus(status) {
          // HUD hand label updated here.
          if (status === "pinch detected") {
            handStatusEl.textContent = "pinch detected";
          } else if (status === "hand detected") {
            handStatusEl.textContent = "hand detected";
          } else if (status === "unstable hand") {
            handStatusEl.textContent = "unstable hand";
          } else {
            handStatusEl.textContent = "no hand";
          }
        },
      });
      console.log("[Main] Hand tracking initialized");
    } catch (err) {
      console.warn("[Main] Hand tracking error:", err);
      handStatusEl.textContent = "hand tracking error";
    }
  })();

  // Attach a simple first-person weapon to the camera.
  weapon = makeWeaponModel();
  camera.add(weapon);
  muzzleFlash = makeMuzzleFlash();
  camera.add(muzzleFlash);

  // Spawn a small wave of placeholder zombies in front of the player.
  recomputeSpawnSettings();
  updateWave();
  spawnZombies();
  resetSpawnTimer();

  animate();
}

createApp();
