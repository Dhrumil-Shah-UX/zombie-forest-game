import * as THREE from "three";

export function createZombie() {
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

