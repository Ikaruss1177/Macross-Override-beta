const bullets = new Array();
const enemyBullets = new Array();
const enemyMissiles = new Array();
const missiles = new Array();
const explosions = new Array();
const sparks = new Array();
const enemies = new Array();

const MAX_MULTI_LOCK = 4;
const lockedEnemies = new Array();
let score = 0;

let playerArmor = 100;
const playerMaxArmor = 100;
let armorDamageFlash = 0;
let armorRegenDelay = 0;

let isPlayerDying = false;
let isGameOver = false;
let deathExplosionTimer = 0;

let gunCooldown = 0;
let missileCooldown = 0;
const missileProfiles = new Array(
  { id: 'LIGERO', count: 4, speed: 42, life: 3.6, damage: 1, cooldown: 0.45 },
  { id: 'PESADO', count: 1, speed: 30, life: 5.0, damage: 3, cooldown: 0.9 },
  { id: 'ESPECIAL', count: 4, speed: 38, life: 4.4, damage: 2, cooldown: 0.65 }
);
let missileProfileIndex = 0;

function cycleMissileType() {
  missileProfileIndex = (missileProfileIndex + 1) % missileProfiles.length;
  return missileProfiles.at(missileProfileIndex).id;
}

function getCurrentMissileType() {
  return missileProfiles.at(missileProfileIndex).id;
}

function getCurrentMissileCooldown() {
  return missileProfiles.at(missileProfileIndex).cooldown;
}
let muzzleFlashTimer = 0;
const chaffFlares = new Array();
let chaffCooldown = 0;
const CHAFF_COOLDOWN_MAX = 6.5;
const chaffGeo = new THREE.PlaneGeometry(0.28, 0.28);

function deployChaff(scene, playerContainer) {
  if (isPlayerDying || isGameOver || chaffCooldown > 0) return false;

  chaffCooldown = CHAFF_COOLDOWN_MAX;

  const backward = new THREE.Vector3(0, 0, 1).applyQuaternion(playerContainer.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerContainer.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(playerContainer.quaternion);

  for (let i = 0; i < 12; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: sparkBloomTex,
      color: (i % 2 === 0) ? 0xfffbeb : 0xfde047,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(chaffGeo, mat);
    const sideSign = (i % 2 === 0) ? 1 : -1;
    const spreadSide = (0.35 + Math.random() * 1.4) * sideSign;
    const spreadUp = (Math.random() - 0.35) * 0.9;

    const spawnPos = playerContainer.position.clone()
      .addScaledVector(backward, 0.85 + Math.random() * 0.4)
      .addScaledVector(right, spreadSide * 0.35)
      .addScaledVector(up, spreadUp * 0.3);

    mesh.position.copy(spawnPos);
    scene.add(mesh);

    const ejectVel = backward.clone().multiplyScalar(8 + Math.random() * 6)
      .addScaledVector(right, spreadSide * (7.5 + Math.random() * 5))
      .addScaledVector(up, spreadUp * 6.0);

    chaffFlares.push({ mesh: mesh, mat: mat, vel: ejectVel, life: 2.6, maxLife: 2.6 });
  }

  for (let k = 0; k < enemyMissiles.length; k++) {
    const em = enemyMissiles.at(k);
    const dist = em.mesh.position.distanceTo(playerContainer.position);
    if (dist < 65 && chaffFlares.length > 0) {
      em.isLockedOn = false;
      em.homingTimer = 0;
      em.decoyTarget = chaffFlares.at(Math.floor(Math.random() * chaffFlares.length));
    }
  }

  if (typeof playChaffSFX === 'function') playChaffSFX();
  return true;
}
let muzzleGroup = null;
let smokeInstMesh = null;
const MAX_SMOKE = 480;
const smokePool = new Array(MAX_SMOKE);
const dummyObj = new THREE.Object3D();
let smokeCursor = 0;

function createBeamTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 256);

  const lengthGrad = ctx.createLinearGradient(0, 12, 0, 248);
  lengthGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  lengthGrad.addColorStop(0.12, 'rgba(255, 255, 255, 1.0)');
  lengthGrad.addColorStop(0.45, 'rgba(255, 240, 90, 0.85)');
  lengthGrad.addColorStop(0.82, 'rgba(255, 200, 0, 0.25)');
  lengthGrad.addColorStop(1.0, 'rgba(255, 180, 0, 0.0)');

  ctx.save();
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = lengthGrad;
  ctx.beginPath();
  ctx.moveTo(32, 14);
  ctx.quadraticCurveTo(54, 75, 38, 242);
  ctx.lineTo(26, 242);
  ctx.quadraticCurveTo(10, 75, 32, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = lengthGrad;
  ctx.beginPath();
  ctx.moveTo(32, 20);
  ctx.quadraticCurveTo(41, 70, 34, 215);
  ctx.lineTo(30, 215);
  ctx.quadraticCurveTo(23, 70, 32, 20);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}
function createVioletLaserTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 64, 256);

  const outerGrad = ctx.createLinearGradient(0, 8, 0, 248);
  outerGrad.addColorStop(0.0, 'rgba(139, 92, 246, 0.0)');
  outerGrad.addColorStop(0.15, 'rgba(99, 102, 241, 0.95)');
  outerGrad.addColorStop(0.55, 'rgba(168, 85, 247, 0.85)');
  outerGrad.addColorStop(0.88, 'rgba(79, 70, 229, 0.35)');
  outerGrad.addColorStop(1.0, 'rgba(67, 56, 202, 0.0)');

  ctx.save();
  ctx.filter = 'blur(4px)';
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.quadraticCurveTo(56, 75, 40, 244);
  ctx.lineTo(24, 244);
  ctx.quadraticCurveTo(8, 75, 32, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const coreGrad = ctx.createLinearGradient(0, 16, 0, 225);
  coreGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
  coreGrad.addColorStop(0.18, 'rgba(245, 243, 255, 1.0)');
  coreGrad.addColorStop(0.65, 'rgba(196, 181, 253, 0.9)');
  coreGrad.addColorStop(1.0, 'rgba(139, 92, 246, 0.0)');

  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.moveTo(32, 18);
  ctx.quadraticCurveTo(42, 70, 35, 220);
  ctx.lineTo(29, 220);
  ctx.quadraticCurveTo(22, 70, 32, 18);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}
function createSoftCircleTexture(innerColor, midColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0.0, innerColor);
  grad.addColorStop(0.55, midColor);
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function createSparkBloomTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(255, 245, 180, 0.95)');
  grad.addColorStop(0.55, 'rgba(255, 140, 20, 0.45)');
  grad.addColorStop(1.0, 'rgba(255, 80, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const beamTex = createBeamTexture();
const violetLaserTex = createVioletLaserTexture();
const flashTex = createSoftCircleTexture('rgba(255, 230, 190, 1.0)', 'rgba(249, 115, 22, 0.85)');
const uniformSmokeTex = createSoftCircleTexture('rgba(255, 255, 255, 0.92)', 'rgba(230, 240, 255, 0.55)');
const sparkBloomTex = createSparkBloomTexture();

const beamMat = new THREE.MeshBasicMaterial({
  map: beamTex,
  color: 0xffee00,
  transparent: true,
  blending: THREE.NormalBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

const enemyBeamMat = new THREE.MeshBasicMaterial({
  map: violetLaserTex,
  color: 0x9d7bff,
  transparent: true,
  blending: THREE.NormalBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});
const beamPlaneGeo = new THREE.PlaneGeometry(0.22, 2.4);
beamPlaneGeo.rotateX(-Math.PI / 2);

const enemyLaserGeo = new THREE.PlaneGeometry(0.32, 3.2);
enemyLaserGeo.rotateX(-Math.PI / 2);

const sparkGeo = new THREE.PlaneGeometry(0.042, 0.042);
const impactSparkLight = new THREE.PointLight(0xffaa33, 0, 4.5);

const texLoader = new THREE.TextureLoader();
const explosionFrames = new Array();
const explosionPlaneGeo = new THREE.PlaneGeometry(4.2, 4.2);

for (let i = 1; i <= 10; i++) {
  explosionFrames.push(texLoader.load('./textures/exp' + i + '.webp'));
}

const missileBodyGeo = new THREE.CylinderGeometry(0.022, 0.025, 0.34, 6);
missileBodyGeo.rotateX(Math.PI / 2);
const missileBodyMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });

const missileTipGeo = new THREE.ConeGeometry(0.023, 0.09, 6);
missileTipGeo.rotateX(-Math.PI / 2);
missileTipGeo.translate(0, 0, -0.21);
const missileTipMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

const missileFlameGeo = new THREE.PlaneGeometry(0.18, 0.18);
const missileFlameMat = new THREE.MeshBasicMaterial({
  map: flashTex,
  color: 0xff8800,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide
});

const ZIGZAG_ANGLES_DEG = new Array(20, 35, 45, 60);
function cloneSkinnedScene(source) {
  const sourceLookup = new Map();
  const cloneLookup = new Map();

  const clone = source.clone(true);

  const srcNodes = new Array();
  const clnNodes = new Array();
  source.traverse((n) => srcNodes.push(n));
  clone.traverse((n) => clnNodes.push(n));

  for (let i = 0; i < srcNodes.length; i++) {
    sourceLookup.set(clnNodes.at(i), srcNodes.at(i));
    cloneLookup.set(srcNodes.at(i), clnNodes.at(i));
  }

  clone.traverse((node) => {
    if (node.isSkinnedMesh) {
      const srcMesh = sourceLookup.get(node);
      if (srcMesh && srcMesh.skeleton) {
        const clonedBones = srcMesh.skeleton.bones.map((bone) => cloneLookup.get(bone));
        node.bind(new THREE.Skeleton(clonedBones, srcMesh.skeleton.boneInverses), node.bindMatrix.clone());
      }
    }
  });

  return clone;
}
const REGULT_TOTAL_FRAMES = 24;
const CITY_STREETS_X = new Array(-180, -152, -124, -96, -68);
const CITY_STREETS_Z = new Array(-14, 14, 42, 70, 98);

function getValidCityStreetPoint() {
  for (let attempt = 0; attempt < 25; attempt++) {
    const alongX = Math.random() < 0.5;
    let lx = 0;
    let lz = 0;
    if (alongX) {
      lz = CITY_STREETS_Z.at(Math.floor(Math.random() * CITY_STREETS_Z.length));
      lx = -180 + Math.random() * 112;
    } else {
      lx = CITY_STREETS_X.at(Math.floor(Math.random() * CITY_STREETS_X.length));
      lz = -14 + Math.random() * 112;
    }

    if (typeof isInsideReservedSDF1Local === 'function' && isInsideReservedSDF1Local(lx, lz)) continue;

    if (typeof localToWorldXZ === 'function') {
      const wp = localToWorldXZ(lx, lz);
      const h = (typeof getTerrainHeight === 'function') ? getTerrainHeight(wp.x, wp.z) : 3.25;
      if (h >= 2.8) {
        return { lx: lx, lz: lz, wx: wp.x, wz: wp.z, wy: h };
      }
    }
  }
  const fallback = (typeof localToWorldXZ === 'function') ? localToWorldXZ(-152, 14) : { x: -80, z: 40 };
  const fh = (typeof getTerrainHeight === 'function') ? getTerrainHeight(fallback.x, fallback.z) : 3.25;
  return { lx: -152, lz: 14, wx: fallback.x, wz: fallback.z, wy: fh };
}

function setRegultFrame(enemyObj, frame) {
  if (!enemyObj.mixer || !enemyObj.action || !enemyObj.clipDuration) return;
  const clamped = Math.max(0, Math.min(REGULT_TOTAL_FRAMES, frame));
  enemyObj.action.paused = false;
  enemyObj.action.time = (clamped / REGULT_TOTAL_FRAMES) * enemyObj.clipDuration;
  enemyObj.mixer.update(0);
  enemyObj.action.paused = true;
}
function setupRegultInstance(enemyObj, baseScene, animations) {
  const model = cloneSkinnedScene(baseScene);
  const flamerList = new Array();
  const gunMuzzles = new Array();

  model.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = false;
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : new Array(child.material);
        mats.forEach((m) => {
          m.transparent = false;
          m.opacity = 1.0;
          m.depthWrite = true;
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        });
      }
    }

    if (child.name && child.name.includes('Flare') && typeof createPlumeMesh === 'function') {
      const isFootJet = child.name.includes('Flare00') || child.name.includes('Flare01');
      const plume = createPlumeMesh(isFootJet);
      if (isFootJet) {
        plume.group.rotation.x = Math.PI / 2;
      }
      child.add(plume.group);
      flamerList.push({ group: plume.group, outerMat: plume.mat, isFootJet: isFootJet });
    }

    if (child.name === 'Frame6_regult_big_gun_L' || child.name === 'Frame7_regult_big_gun_R') {
      const muzzleNode = new THREE.Object3D();
      muzzleNode.position.set(0, 0, 0.036);
      child.add(muzzleNode);
      gunMuzzles.push(muzzleNode);
    }
  });

  const s = 22.0;
  model.scale.set(s, s, s);
  model.position.set(0, 1.45, 0);
  model.updateMatrixWorld(true);

  enemyObj.mesh.add(model);
  enemyObj.flames = flamerList;
  enemyObj.gunMuzzles = gunMuzzles;

  const clip = (animations && animations.length > 0) ? animations.at(0) : null;
  if (clip) {
    enemyObj.mixer = new THREE.AnimationMixer(model);
    enemyObj.clipDuration = clip.duration;
    enemyObj.action = enemyObj.mixer.clipAction(clip);
    enemyObj.action.play();
    setRegultFrame(enemyObj, enemyObj.isAerial ? 0 : 24);
  }
}
function initWeaponsAndEnemies(scene, playerContainer) {
  playerContainer.add(impactSparkLight);

  muzzleGroup = new THREE.Group();
  const muzzleMat = new THREE.MeshBasicMaterial({
    map: flashTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.32), muzzleMat);
  const mPlane2 = mPlane1.clone();
  mPlane2.rotateY(Math.PI / 2);
  const mPlane3 = mPlane1.clone();
  mPlane3.rotateX(Math.PI / 2);
  muzzleGroup.add(mPlane1, mPlane2, mPlane3);
  muzzleGroup.position.set(0, -0.15, -0.85);
  muzzleGroup.visible = false;
  playerContainer.add(muzzleGroup);

  const smokeInstGeo = new THREE.PlaneGeometry(0.16, 0.16);
  const smokeInstMat = new THREE.MeshBasicMaterial({
    map: uniformSmokeTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  smokeInstMesh = new THREE.InstancedMesh(smokeInstGeo, smokeInstMat, MAX_SMOKE);
  smokeInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smokeInstMesh.frustumCulled = false;
  scene.add(smokeInstMesh);

  for (let i = 0; i < MAX_SMOKE; i++) {
    smokePool[i] = { active: false, pos: new THREE.Vector3(), life: 0, maxLife: 1, baseScale: 1 };
    dummyObj.scale.set(0, 0, 0);
    dummyObj.updateMatrix();
    smokeInstMesh.setMatrixAt(i, dummyObj.matrix);
  }
  smokeInstMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < 6; i++) {
    const isAerial = (i < 3);
    const group = new THREE.Group();
    scene.add(group);

    let spawnPos = new THREE.Vector3();
    let streetInfo = null;

    if (isAerial) {
      const angle = (i / 3) * Math.PI * 2;
      const radius = 55 + i * 16;
      spawnPos.set(Math.cos(angle) * radius, 26 + i * 7, -40 + Math.sin(angle) * radius);
    } else {
      streetInfo = getValidCityStreetPoint();
      spawnPos.set(streetInfo.wx, streetInfo.wy, streetInfo.wz);
    }

    group.position.copy(spawnPos);

    enemies.push({
      id: isAerial ? ('REG-A0' + (i + 1)) : ('REG-G0' + (i - 2)),
      isAerial: isAerial,
      mesh: group,
      hp: 3,
      respawnTimer: 0,
      fireCooldown: 1.5 + Math.random() * 2.0,
      lockProgress: 0,
      seekerX: window.innerWidth / 2,
      seekerY: window.innerHeight / 2,
      orbitAngle: (i / 3) * Math.PI * 2,
      orbitRadius: 55 + i * 16,
      orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.28 + i * 0.05),
      baseY: 26 + i * 7,
      cityLx: streetInfo ? streetInfo.lx : -152,
      cityLz: streetInfo ? streetInfo.lz : 14,
      targetLx: streetInfo ? streetInfo.lx : -124,
      targetLz: streetInfo ? streetInfo.lz : 14,
      walkState: 'WALK',
      stateTimer: 3.0 + Math.random() * 3.5,
      animFrame: 16 + Math.random() * 2,
      animDir: 1,
      mixer: null,
      action: null,
      clipDuration: 0,
      flames: new Array(),
      gunMuzzles: new Array()
    });
  }

  if (typeof THREE.GLTFLoader === 'function') {
    const loader = new THREE.GLTFLoader();
    loader.load('./models/regult.glb', (gltf) => {
      for (let i = 0; i < enemies.length; i++) {
        setupRegultInstance(enemies.at(i), gltf.scene, gltf.animations);
      }
    });
  }
}
function fireGunpod(scene, playerContainer, velocity) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerContainer.quaternion);
  const offset = new THREE.Vector3(0, -0.15, -0.9).applyQuaternion(playerContainer.quaternion);

  const boltGroup = new THREE.Group();
  const p1 = new THREE.Mesh(beamPlaneGeo, beamMat);
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);
  boltGroup.add(p1, p2);

  boltGroup.position.copy(playerContainer.position).add(offset);
  boltGroup.quaternion.copy(playerContainer.quaternion);
  scene.add(boltGroup);

  bullets.push({ mesh: boltGroup, vel: forward.multiplyScalar(125).add(velocity), life: 1.5 });

  muzzleGroup.visible = true;
  muzzleGroup.rotation.z = Math.random() * Math.PI;
  const s = 0.8 + Math.random() * 0.5;
  muzzleGroup.scale.set(s, s, s);
  muzzleFlashTimer = 0.04;
}

function fireRegultVioletLaser(scene, enemy, playerContainer) {
  const muzzles = (enemy.gunMuzzles && enemy.gunMuzzles.length > 0) ? enemy.gunMuzzles : new Array(null, null);

  for (let m = 0; m < muzzles.length; m++) {
    const boltGroup = new THREE.Group();
    const p1 = new THREE.Mesh(enemyLaserGeo, enemyBeamMat);
    const p2 = p1.clone();
    p2.rotateZ(Math.PI / 2);
    boltGroup.add(p1, p2);

    const originPos = new THREE.Vector3();
    if (muzzles.at(m)) {
      muzzles.at(m).getWorldPosition(originPos);
    } else {
      const side = (m === 0 ? -0.42 : 0.42);
      const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
      originPos.copy(enemy.mesh.position).add(new THREE.Vector3(0, 1.35, 0)).addScaledVector(rightVec, side);
    }

    boltGroup.position.copy(originPos);
    boltGroup.lookAt(playerContainer.position);
    scene.add(boltGroup);

    const dir = new THREE.Vector3().subVectors(playerContainer.position, originPos).normalize();
    dir.x += (Math.random() - 0.5) * 0.05;
    dir.y += (Math.random() - 0.5) * 0.05;
    dir.z += (Math.random() - 0.5) * 0.05;
    dir.normalize();

    enemyBullets.push({ mesh: boltGroup, vel: dir.multiplyScalar(68), life: 1.8 });
  }

  if (typeof playSFX === 'function') playSFX('lightLaser', 0.5, 0.1);
}
function fireEnemySalvo(scene, enemy, playerContainer) {
  const count = Math.random() < 0.5 ? 1 : 2;

  for (let i = 0; i < count; i++) {
    const mGroup = new THREE.Group();
    const body = new THREE.Mesh(missileBodyGeo, missileBodyMat);
    const tip = new THREE.Mesh(missileTipGeo, missileTipMat);
    const flame = new THREE.Mesh(missileFlameGeo, missileFlameMat);
    flame.position.set(0, 0, 0.2);
    mGroup.add(body, tip, flame);
    mGroup.scale.set(1.45, 1.45, 1.45);

    const sideSpread = count === 1 ? 0 : (i === 0 ? -0.9 : 0.9);
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(enemy.mesh.quaternion);
    const spawnPos = enemy.mesh.position.clone()
      .add(new THREE.Vector3(0, 1.2, 0))
      .addScaledVector(rightVec, sideSpread);

    mGroup.position.copy(spawnPos);
    mGroup.lookAt(playerContainer.position);
    mGroup.rotateY(Math.PI);
    scene.add(mGroup);

    enemyMissiles.push({
      mesh: mGroup,
      lastTailPos: spawnPos.clone(),
      speed: 34,
      life: 4.2,
      homingTimer: 2.6,
      isLockedOn: true
    });
  }
}

function pickRandomZigAngleRad() {
  const idx = Math.floor(Math.random() * ZIGZAG_ANGLES_DEG.length);
  return THREE.MathUtils.degToRad(ZIGZAG_ANGLES_DEG.at(idx));
}

function planNextZigTarget(missileObj) {
  const yawAngle = pickRandomZigAngleRad() * missileObj.zigSign;
  const pitchAngle = (pickRandomZigAngleRad() * 0.6) * (Math.random() < 0.5 ? 1 : -1);
  const euler = new THREE.Euler(pitchAngle, yawAngle, 0, 'YXZ');
  const offsetQuat = new THREE.Quaternion().setFromEuler(euler);
  missileObj.targetQuat.copy(missileObj.baseQuat).multiply(offsetQuat);
  missileObj.zigSign *= -1;
  missileObj.zigTimer = 0.36 + Math.random() * 0.18;
}
function fireMicroMissiles(scene, playerContainer) {
  const profile = missileProfiles.at(missileProfileIndex);
  const activeTargets = lockedEnemies.filter((e) => e && e.respawnTimer <= 0);
  const offsets = new Array(
    new THREE.Vector3(-0.65, -0.04, -0.15),
    new THREE.Vector3(0.65, -0.04, -0.15),
    new THREE.Vector3(-0.42, -0.04, -0.15),
    new THREE.Vector3(0.42, -0.04, -0.15)
  );
  for (let idx = 0; idx < profile.count; idx++) {
    const localOff = offsets.at(idx % offsets.length);
    const worldOff = localOff.clone().applyQuaternion(playerContainer.quaternion);
    const mGroup = new THREE.Group();

    const body = new THREE.Mesh(missileBodyGeo, missileBodyMat);
    const tip = new THREE.Mesh(missileTipGeo, missileTipMat);
    const flame = new THREE.Mesh(missileFlameGeo, missileFlameMat);
    flame.position.set(0, 0, 0.2);
    mGroup.add(body, tip, flame);

    const spawnPos = playerContainer.position.clone().add(worldOff);
    mGroup.position.copy(spawnPos);
    mGroup.quaternion.copy(playerContainer.quaternion);
    scene.add(mGroup);

    const assignedEnemy = activeTargets.length > 0
      ? activeTargets.at(idx % activeTargets.length)
      : null;

    missiles.push({
      mesh: mGroup,
      lastTailPos: spawnPos.clone(),
      baseQuat: playerContainer.quaternion.clone(),
      targetQuat: playerContainer.quaternion.clone(),
      targetEnemy: assignedEnemy,
      speed: profile.speed,
      life: profile.life,
      damage: profile.damage,
      straightTimer: 0.26,
      zigTimer: 0,
      zigCount: 0,
      zigSign: (idx % 2 === 0 ? 1 : -1)
    });
  }

  if (typeof playSFX === 'function') playSFX('missileLaunch', 0.8, 0.05);
}

function spawnSmokeParticle(pos, scale) {
  const p = smokePool[smokeCursor];
  smokeCursor = (smokeCursor + 1) % MAX_SMOKE;
  p.active = true;
  p.pos.copy(pos);
  p.life = 1.1;
  p.maxLife = 1.1;
  p.baseScale = scale;
}
const tmpLerpPos = new THREE.Vector3();
const tmpForward = new THREE.Vector3();
const tmpTailPos = new THREE.Vector3();
const tmpLookMat = new THREE.Matrix4();
const tmpTargetQuat = new THREE.Quaternion();

function spawnUniformSmokeSegment(startPos, endPos, distFromPlayer) {
  const segmentDist = startPos.distanceTo(endPos);
  const steps = Math.min(8, Math.max(1, Math.ceil(segmentDist / 0.16)));
  const isFar = distFromPlayer > 32;
  const farFactor = isFar ? Math.min(1.0, (distFromPlayer - 32) / 55) : 0.0;
  const baseScale = isFar ? (1.0 + farFactor * 1.1) : 1.0;

  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    tmpLerpPos.lerpVectors(startPos, endPos, t);
    spawnSmokeParticle(tmpLerpPos, baseScale);
  }
}

function spawnImpactSparks(scene, camera, pos) {
  impactSparkLight.position.set(
    (Math.random() - 0.5) * 0.3,
    0.15,
    (Math.random() - 0.5) * 0.3
  );
  impactSparkLight.intensity = 4.2;

  for (let i = 0; i < 24; i++) {
    const isWhiteHot = (i % 3 !== 0);
    const mat = new THREE.MeshBasicMaterial({
      map: sparkBloomTex,
      color: isWhiteHot ? 0xffffff : 0xff9922,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(sparkGeo, mat);
    mesh.position.copy(pos);
    mesh.position.x += (Math.random() - 0.5) * 0.08;
    mesh.position.y += (Math.random() - 0.5) * 0.08;
    mesh.position.z += (Math.random() - 0.5) * 0.08;
    mesh.quaternion.copy(camera.quaternion);
    scene.add(mesh);

    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const speed = 7.5 + Math.random() * 6.5;

    sparks.push({
      mesh: mesh,
      mat: mat,
      vel: dir.multiplyScalar(speed),
      life: 0.16 + Math.random() * 0.08,
      maxLife: 0.24
    });
  }
}
function spawnExplosion(scene, camera, pos, scaleMult) {
  if (explosionFrames.length === 0) return;
  const s = scaleMult || 1.0;

  const mat = new THREE.MeshBasicMaterial({
    map: explosionFrames.at(0),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(explosionPlaneGeo, mat);
  mesh.position.copy(pos);
  mesh.scale.set(s, s, s);
  mesh.quaternion.copy(camera.quaternion);
  scene.add(mesh);

  explosions.push({ mesh: mesh, mat: mat, life: 0.52, maxLife: 0.52 });
}

function damagePlayerArmor(scene, camera, playerContainer, dmg) {
  if (isPlayerDying || isGameOver) return;

  playerArmor = Math.max(0, playerArmor - dmg);
  armorDamageFlash = 0.35;
  armorRegenDelay = 3.5;

  spawnImpactSparks(scene, camera, playerContainer.position);

  if (playerArmor <= 0) {
    isPlayerDying = true;
    deathExplosionTimer = 0;
    if (typeof isAccelerating !== 'undefined' && isAccelerating) stopAcceleration();
    spawnExplosion(scene, camera, playerContainer.position, 1.2);
  }
}

function damageEnemy(scene, camera, enemy, dmg) {
  if (enemy.respawnTimer > 0) return;
  enemy.hp -= dmg;
  if (enemy.hp <= 0) {
    const boomPos = enemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    spawnExplosion(scene, camera, boomPos, 1.15);
    enemy.mesh.visible = false;
    enemy.respawnTimer = 4.5;
    enemy.lockProgress = 0;
    score += 100;
  }
}
function getInteriorStreetSpawn() {
  const lanesX = new Array(-19.5, -11.0, 11.0, 19.5);
  const wx = lanesX.at(Math.floor(Math.random() * lanesX.length));
  const wz = (Math.random() - 0.5) * 760;
  return { wx: wx, wy: 0.0, wz: wz };
}

function chooseNextInteriorWaypoint(enemy) {
  const lanesX = new Array(-19.5, -11.0, 11.0, 19.5);
  const nextX = lanesX.at(Math.floor(Math.random() * lanesX.length));
  const stepZ = (Math.random() < 0.5 ? 1 : -1) * (55 + Math.random() * 85);
  const nextZ = Math.max(-420, Math.min(420, enemy.mesh.position.z + stepZ));
  enemy.targetWorldX = nextX;
  enemy.targetWorldZ = nextZ;
}

function chooseNextCityWaypoint(enemy) {
  if (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_3') {
    chooseNextInteriorWaypoint(enemy);
    return;
  }

  const snapX = CITY_STREETS_X.reduce((prev, curr) => Math.abs(curr - enemy.cityLx) < Math.abs(prev - enemy.cityLx) ? curr : prev);
  const snapZ = CITY_STREETS_Z.reduce((prev, curr) => Math.abs(curr - enemy.cityLz) < Math.abs(prev - enemy.cityLz) ? curr : prev);

  const options = new Array();
  if (snapX - 28 >= -180) options.push({ lx: snapX - 28, lz: snapZ });
  if (snapX + 28 <= -68)  options.push({ lx: snapX + 28, lz: snapZ });
  if (snapZ - 28 >= -14)  options.push({ lx: snapX, lz: snapZ - 28 });
  if (snapZ + 28 <= 98)   options.push({ lx: snapX, lz: snapZ + 28 });

  const validOptions = options.filter((opt) => {
    if (typeof isInsideReservedSDF1Local === 'function' && isInsideReservedSDF1Local(opt.lx, opt.lz)) return false;
    if (typeof localToWorldXZ === 'function' && typeof getTerrainHeight === 'function') {
      const wp = localToWorldXZ(opt.lx, opt.lz);
      if (getTerrainHeight(wp.x, wp.z) < 2.8) return false;
    }
    return true;
  });

  if (validOptions.length > 0) {
    let chosen = validOptions.at(Math.floor(Math.random() * validOptions.length));
    if (Math.random() < 0.65 && typeof playerContainer !== 'undefined') {
      let bestDist = Infinity;
      for (let i = 0; i < validOptions.length; i++) {
        const wp = localToWorldXZ(validOptions.at(i).lx, validOptions.at(i).lz);
        const d = Math.hypot(wp.x - playerContainer.position.x, wp.z - playerContainer.position.z);
        if (d < bestDist) {
          bestDist = d;
          chosen = validOptions.at(i);
        }
      }
    }
    enemy.targetLx = chosen.lx;
    enemy.targetLz = chosen.lz;
  }
}

function updateRegultFlames(enemy) {
  if (!enemy.flames || enemy.flames.length === 0) return;
  const isSpaceBattle = (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_2');
  const flicker = 0.85 + Math.random() * 0.35;
  for (let i = 0; i < enemy.flames.length; i++) {
    const f = enemy.flames.at(i);
    if (enemy.isAerial || isSpaceBattle) {
      f.group.visible = true;
      const len = (f.isFootJet ? 1.55 : 0.95) * flicker;
      f.group.scale.set(1.1, len, 1.1);
      f.outerMat.color.setHex(0x8b5cf6);
    } else {
      f.group.visible = false;
    }
  }
}
function updateEnemies(delta, playerContainer) {
  const isSpaceBattle = (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_2');
  const isInteriorBattle = (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_3');

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies.at(i);

    if (e.respawnTimer > 0) {
      e.respawnTimer -= delta;
      if (e.respawnTimer <= 0) {
        e.hp = 3;
        e.mesh.visible = true;
        if (!e.isAerial && !isSpaceBattle) {
          if (isInteriorBattle) {
            const sp = getInteriorStreetSpawn();
            e.mesh.position.set(sp.wx, sp.wy, sp.wz);
            e.walkState = 'WALK';
            e.stateTimer = 3.5;
            chooseNextInteriorWaypoint(e);
          } else {
            const pt = getValidCityStreetPoint();
            e.cityLx = pt.lx;
            e.cityLz = pt.lz;
            e.mesh.position.set(pt.wx, pt.wy, pt.wz);
            e.walkState = 'WALK';
            e.stateTimer = 3.5;
            chooseNextCityWaypoint(e);
          }
        }
      }
      continue;
    }

    updateRegultFlames(e);

    if (e.isAerial || isSpaceBattle) {
      setRegultFrame(e, 0);

      e.orbitAngle += e.orbitSpeed * delta;
      let goalX = playerContainer.position.x * 0.55 + Math.cos(e.orbitAngle) * e.orbitRadius;
      let goalZ = playerContainer.position.z * 0.55 + Math.sin(e.orbitAngle) * e.orbitRadius;
      const rawFloor = (typeof getTerrainHeight === 'function') ? getTerrainHeight(goalX, goalZ) + 12 : 16;
      const minFloor = isSpaceBattle ? -450 : (isInteriorBattle ? 26 : rawFloor);
      const maxCeil = isSpaceBattle ? 450 : (isInteriorBattle ? 130 : 85);
      let goalY = Math.max(minFloor, Math.min(maxCeil, playerContainer.position.y * 0.65 + e.baseY * 0.45 + Math.sin(e.orbitAngle * 2.0) * 6.0));

      if (isInteriorBattle) {
        goalX = Math.max(-245, Math.min(245, goalX));
        goalZ = Math.max(-425, Math.min(425, goalZ));
      }

      e.mesh.position.x += (goalX - e.mesh.position.x) * Math.min(1, 0.85 * delta);
      e.mesh.position.y += (goalY - e.mesh.position.y) * Math.min(1, 1.1 * delta);
      e.mesh.position.z += (goalZ - e.mesh.position.z) * Math.min(1, 0.85 * delta);
      e.mesh.lookAt(playerContainer.position);

      if (!isPlayerDying && !isGameOver) {
        const dist = e.mesh.position.distanceTo(playerContainer.position);
        e.fireCooldown -= delta;
        if (e.fireCooldown <= 0) {
          if (dist < 145) {
            fireEnemySalvo(scene, e, playerContainer);
            e.fireCooldown = 3.8 + Math.random() * 2.6;
          } else {
            e.fireCooldown = 1.0;
          }
        }
      }
    } else {
      e.stateTimer -= delta;

      if (e.walkState === 'WALK') {
        const trotSpeed = 14.0;
        e.animFrame += e.animDir * trotSpeed * delta;
        if (e.animFrame >= 19) {
          e.animFrame = 19;
          e.animDir = -1;
        } else if (e.animFrame <= 16) {
          e.animFrame = 16;
          e.animDir = 1;
        }
        setRegultFrame(e, e.animFrame);

        if (isInteriorBattle) {
          if (typeof e.targetWorldX !== 'number') chooseNextInteriorWaypoint(e);
          const dx = e.targetWorldX - e.mesh.position.x;
          const dz = e.targetWorldZ - e.mesh.position.z;
          const distWp = Math.hypot(dx, dz);

          if (distWp < 1.5) {
            chooseNextInteriorWaypoint(e);
          } else {
            const walkSpeed = 6.5;
            e.mesh.position.x += (dx / distWp) * walkSpeed * delta;
            e.mesh.position.z += (dz / distWp) * walkSpeed * delta;
            e.mesh.position.y = 0.0;
            e.mesh.lookAt(e.targetWorldX, 0.0, e.targetWorldZ);
          }
        } else {
          const dx = e.targetLx - e.cityLx;
          const dz = e.targetLz - e.cityLz;
          const distWp = Math.hypot(dx, dz);

          if (distWp < 1.2) {
            chooseNextCityWaypoint(e);
          } else {
            const walkSpeed = 5.8;
            e.cityLx += (dx / distWp) * walkSpeed * delta;
            e.cityLz += (dz / distWp) * walkSpeed * delta;
          }

          if (typeof localToWorldXZ === 'function') {
            const wp = localToWorldXZ(e.cityLx, e.cityLz);
            const groundY = (typeof getTerrainHeight === 'function') ? getTerrainHeight(wp.x, wp.z) : 3.25;
            e.mesh.position.set(wp.x, groundY, wp.z);

            const nextWp = localToWorldXZ(e.targetLx, e.targetLz);
            e.mesh.lookAt(nextWp.x, groundY, nextWp.z);
          }
        }

        if (e.stateTimer <= 0) {
          e.walkState = 'IDLE';
          e.stateTimer = 1.8 + Math.random() * 2.2;
          setRegultFrame(e, 24);
        }
      } else {
        setRegultFrame(e, 24);
        const flatTarget = new THREE.Vector3(playerContainer.position.x, e.mesh.position.y, playerContainer.position.z);
        e.mesh.lookAt(flatTarget);

        if (e.stateTimer <= 0) {
          e.walkState = 'WALK';
          e.stateTimer = 3.2 + Math.random() * 4.0;
          e.animFrame = 16;
          e.animDir = 1;
          chooseNextCityWaypoint(e);
        }
      }

      if (!isPlayerDying && !isGameOver) {
        const dist = e.mesh.position.distanceTo(playerContainer.position);
        e.fireCooldown -= delta;
        if (e.fireCooldown <= 0) {
          if (dist < 110) {
            fireRegultVioletLaser(scene, e, playerContainer);
            e.fireCooldown = 1.9 + Math.random() * 1.6;
          } else {
            e.fireCooldown = 0.8;
          }
        }
      }
    }
  }
}
function updateWeapons(delta, scene, camera, playerContainer, velocity, keys) {
  if (gunCooldown > 0) gunCooldown -= delta;
  if (missileCooldown > 0) missileCooldown -= delta;
  if (chaffCooldown > 0) chaffCooldown = Math.max(0, chaffCooldown - delta);

  for (let i = chaffFlares.length - 1; i >= 0; i--) {
    const cf = chaffFlares.at(i);
    cf.life -= delta;
    cf.vel.multiplyScalar(1.0 - 1.4 * delta);
    cf.vel.y -= 4.2 * delta;
    cf.mesh.position.addScaledVector(cf.vel, delta);
    cf.mesh.quaternion.copy(camera.quaternion);
    cf.mat.opacity = Math.max(0, cf.life / cf.maxLife);

    if (Math.random() < 0.35) {
      spawnSmokeParticle(cf.mesh.position, 0.45);
    }

    if (cf.life <= 0) {
      scene.remove(cf.mesh);
      cf.mat.dispose();
      chaffFlares.splice(i, 1);
    }
  }

  if (armorDamageFlash > 0) armorDamageFlash = Math.max(0, armorDamageFlash - delta);
  if (impactSparkLight.intensity > 0) {
    impactSparkLight.intensity = Math.max(0, impactSparkLight.intensity - 16.0 * delta);
  }

  if (!isPlayerDying && !isGameOver && playerArmor > 0) {
    if (armorRegenDelay > 0) {
      armorRegenDelay -= delta;
    } else if (playerArmor < playerMaxArmor) {
      playerArmor = Math.min(playerMaxArmor, playerArmor + 8.0 * delta);
    }
  }

  if (muzzleFlashTimer > 0) {
    muzzleFlashTimer -= delta;
    if (muzzleFlashTimer <= 0) muzzleGroup.visible = false;
  }

  if (!isPlayerDying && !isGameOver) {
    if (keys['ShiftLeft'] && gunCooldown <= 0) {
      fireGunpod(scene, playerContainer, velocity);
      gunCooldown = 0.085;
    }
    if (keys['Space'] && missileCooldown <= 0) {
      fireMicroMissiles(scene, playerContainer);
      missileCooldown = getCurrentMissileCooldown();
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets.at(i);
    b.mesh.position.addScaledVector(b.vel, delta);
    b.life -= delta;

    let hit = false;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies.at(j);
      const hitCenter = e.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      if (e.respawnTimer <= 0 && b.mesh.position.distanceTo(hitCenter) < 1.9) {
        damageEnemy(scene, camera, e, 1);
        hit = true;
        break;
      }
    }

    if (!hit) {
      for (let k = enemyMissiles.length - 1; k >= 0; k--) {
        const em = enemyMissiles.at(k);
        if (b.mesh.position.distanceTo(em.mesh.position) < 1.35) {
          spawnExplosion(scene, camera, em.mesh.position, 0.55);
          spawnImpactSparks(scene, camera, em.mesh.position);
          scene.remove(em.mesh);
          enemyMissiles.splice(k, 1);
          score += 25;
          hit = true;
          break;
        }
      }
    }

    if (hit || b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets.at(i);
    eb.mesh.position.addScaledVector(eb.vel, delta);
    eb.life -= delta;

    let hitPlayer = false;
    if (!isPlayerDying && !isGameOver && eb.mesh.position.distanceTo(playerContainer.position) < 1.15) {
      damagePlayerArmor(scene, camera, playerContainer, 15);
      hitPlayer = true;
    }

    if (hitPlayer || eb.life <= 0) {
      scene.remove(eb.mesh);
      enemyBullets.splice(i, 1);
    }
  }

  for (let i = enemyMissiles.length - 1; i >= 0; i--) {
    const em = enemyMissiles.at(i);

    if (em.decoyTarget && em.decoyTarget.life > 0) {
      em.isLockedOn = false;
      tmpLookMat.lookAt(em.mesh.position, em.decoyTarget.mesh.position, new THREE.Vector3(0, 1, 0));
      tmpTargetQuat.setFromRotationMatrix(tmpLookMat);
      em.mesh.quaternion.slerp(tmpTargetQuat, 6.5 * delta);
      if (em.mesh.position.distanceTo(em.decoyTarget.mesh.position) < 1.8) {
        spawnExplosion(scene, camera, em.mesh.position, 0.55);
        scene.remove(em.mesh);
        enemyMissiles.splice(i, 1);
        continue;
      }
    } else if (em.homingTimer > 0 && !isPlayerDying && !isGameOver) {
      em.homingTimer -= delta;
      em.isLockedOn = true;
      tmpLookMat.lookAt(em.mesh.position, playerContainer.position, new THREE.Vector3(0, 1, 0));
      tmpTargetQuat.setFromRotationMatrix(tmpLookMat);
      em.mesh.quaternion.slerp(tmpTargetQuat, 3.6 * delta);
    } else {
      em.isLockedOn = false;
    }

    tmpForward.set(0, 0, -1).applyQuaternion(em.mesh.quaternion);
    em.speed = Math.min(54, em.speed + 10 * delta);
    em.mesh.position.addScaledVector(tmpForward, em.speed * delta);

    tmpTailPos.copy(em.mesh.position).addScaledVector(tmpForward, -0.24);
    const distFromPlayer = em.mesh.position.distanceTo(playerContainer.position);
    spawnUniformSmokeSegment(em.lastTailPos, tmpTailPos, distFromPlayer);
    em.lastTailPos.copy(tmpTailPos);

    let hitPlayer = false;
    if (!isPlayerDying && !isGameOver && distFromPlayer < 1.35) {
      damagePlayerArmor(scene, camera, playerContainer, 25);
      spawnExplosion(scene, camera, em.mesh.position, 0.75);
      hitPlayer = true;
    }

    em.life -= delta;
    if (hitPlayer || em.life <= 0) {
      scene.remove(em.mesh);
      enemyMissiles.splice(i, 1);
    }
  }
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles.at(i);

    if (m.straightTimer > 0) {
      m.straightTimer -= delta;
      if (m.straightTimer <= 0) planNextZigTarget(m);
    } else if (m.targetEnemy && m.targetEnemy.respawnTimer <= 0 && m.zigCount >= 2) {
      const targetAim = m.targetEnemy.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      tmpLookMat.lookAt(m.mesh.position, targetAim, new THREE.Vector3(0, 1, 0));
      tmpTargetQuat.setFromRotationMatrix(tmpLookMat);
      m.mesh.quaternion.slerp(tmpTargetQuat, 8.5 * delta);
    } else {
      m.zigTimer -= delta;
      if (m.zigTimer <= 0) {
        planNextZigTarget(m);
        m.zigCount++;
      }
      m.mesh.quaternion.slerp(m.targetQuat, 11.0 * delta);
    }

    tmpForward.set(0, 0, -1).applyQuaternion(m.mesh.quaternion);
    m.speed += 28 * delta;
    m.mesh.position.addScaledVector(tmpForward, m.speed * delta);

    tmpTailPos.copy(m.mesh.position).addScaledVector(tmpForward, -0.18);
    const distFromPlayer = m.mesh.position.distanceTo(playerContainer.position);
    spawnUniformSmokeSegment(m.lastTailPos, tmpTailPos, distFromPlayer);
    m.lastTailPos.copy(tmpTailPos);

    let hit = false;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies.at(j);
      const hitCenter = e.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      if (e.respawnTimer <= 0 && m.mesh.position.distanceTo(hitCenter) < 2.2) {
        damageEnemy(scene, camera, e, m.damage || 3);
        hit = true;
        break;
      }
    }

    m.life -= delta;
    if (hit || m.life <= 0) {
      scene.remove(m.mesh);
      missiles.splice(i, 1);
    }
  }

  let anyUpdated = false;
  for (let i = 0; i < MAX_SMOKE; i++) {
    const p = smokePool[i];
    if (!p.active) continue;
    anyUpdated = true;
    p.life -= delta;
    if (p.life <= 0) {
      p.active = false;
      dummyObj.scale.set(0, 0, 0);
      dummyObj.updateMatrix();
      smokeInstMesh.setMatrixAt(i, dummyObj.matrix);
    } else {
      const lifeRatio = p.life / p.maxLife;
      const scale = p.baseScale * (lifeRatio > 0.45 ? 1.0 : (lifeRatio / 0.45));
      dummyObj.position.copy(p.pos);
      dummyObj.quaternion.copy(camera.quaternion);
      dummyObj.scale.set(scale, scale, scale);
      dummyObj.updateMatrix();
      smokeInstMesh.setMatrixAt(i, dummyObj.matrix);
    }
  }
  if (anyUpdated) smokeInstMesh.instanceMatrix.needsUpdate = true;

  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks.at(i);
    sp.life -= delta;
    sp.vel.multiplyScalar(1.0 - 2.5 * delta);
    sp.mesh.position.addScaledVector(sp.vel, delta);
    sp.mesh.quaternion.copy(camera.quaternion);
    sp.mat.opacity = Math.max(0, sp.life / sp.maxLife);
    if (sp.life <= 0) {
      scene.remove(sp.mesh);
      sp.mat.dispose();
      sparks.splice(i, 1);
    }
  }

  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions.at(i);
    ex.life -= delta;
    ex.mesh.quaternion.copy(camera.quaternion);

    const total = explosionFrames.length;
    if (total > 0) {
      const progress = 1.0 - Math.max(0, ex.life / ex.maxLife);
      const frameIndex = Math.min(total - 1, Math.floor(progress * total));
      ex.mat.map = explosionFrames.at(frameIndex);
    }

    if (ex.life <= 0) {
      scene.remove(ex.mesh);
      ex.mat.dispose();
      explosions.splice(i, 1);
    }
  }
}

function clearAllProjectiles(scene) {
  for (let i = bullets.length - 1; i >= 0; i--) { scene.remove(bullets.at(i).mesh); }
  bullets.length = 0;

  for (let i = enemyBullets.length - 1; i >= 0; i--) { scene.remove(enemyBullets.at
(i).mesh); }
enemyBullets.length = 0;
for (let i = enemyMissiles.length - 1; i >= 0; i--) { scene.remove(enemyMissiles.at(i).mesh); }
enemyMissiles.length = 0;
for (let i = missiles.length - 1; i >= 0; i--) { scene.remove(missiles.at(i).mesh); }
missiles.length = 0;
for (let i = explosions.length - 1; i >= 0; i--) {
scene.remove(explosions.at(i).mesh);
explosions.at(i).mat.dispose();
}
explosions.length = 0;
for (let i = sparks.length - 1; i >= 0; i--) {
scene.remove(sparks.at(i).mesh);
sparks.at(i).mat.dispose();
}
sparks.length = 0;
for (let i = chaffFlares.length - 1; i >= 0; i--) {
scene.remove(chaffFlares.at(i).mesh);
chaffFlares.at(i).mat.dispose();
}
chaffFlares.length = 0;
chaffCooldown = 0;
lockedEnemies.length = 0;
}
function onEnvironmentMapChanged(mapId) {
  if (typeof clearAllProjectiles === 'function' && typeof scene !== 'undefined') {
    clearAllProjectiles(scene);
  }

  try {
    if (playerContainer) {
      if (mapId === 'MAPA_3') {
        playerContainer.position.set(0, 34, 180);
      } else {
        playerContainer.position.set(0, 38, 120);
      }
      playerContainer.quaternion.identity();
      if (typeof velocity !== 'undefined') velocity.set(0, 0, 0);
    }
  } catch (e) {}

for (let i = 0; i < enemies.length; i++) {
const e = enemies.at(i);
e.hp = 3;
e.respawnTimer = 0;
e.mesh.visible = true;
e.lockProgress = 0;
if (mapId === 'MAPA_3') {
if (e.isAerial) {
const angle = (i / 3) * Math.PI * 2;
e.mesh.position.set(Math.cos(angle) * 70, 52 + i * 14, Math.sin(angle) * 140);
} else {
const sp = getInteriorStreetSpawn();
e.mesh.position.set(sp.wx, sp.wy, sp.wz);
e.walkState = 'WALK';
e.stateTimer = 3.0 + Math.random() * 2.5;
chooseNextInteriorWaypoint(e);
}
} else if (mapId === 'MAPA_1') {
if (e.isAerial) {
const angle = (i / 3) * Math.PI * 2;
const radius = 55 + i * 16;
e.mesh.position.set(Math.cos(angle) * radius, 26 + i * 7, -40 + Math.sin(angle) * radius);
} else {
const pt = getValidCityStreetPoint();
e.cityLx = pt.lx;
e.cityLz = pt.lz;
e.mesh.position.set(pt.wx, pt.wy, pt.wz);
e.walkState = 'WALK';
e.stateTimer = 3.0 + Math.random() * 2.5;
chooseNextCityWaypoint(e);
}
}
}
}
