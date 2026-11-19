const velocity = new THREE.Vector3(0, 0, 0);
let throttle = 0.35;
let turboHeat = 0.0;
let isOverheated = false;
const thrusterFlames = new Array();

let mixer = null, action = null, clipDuration = 0;
const TOTAL_FRAMES = 91;
let currentMode = 'FIGHTER', currentFrame = 0, targetFrame = 0;
let animSpeed = 48, isAttacking = false, isAccelerating = false, isReverseGerwalk = false;

let battroidTrackMode = 'NONE';
let battroidTrackedTarget = null;
let gamepadCameraSide = 0;
let gamepadCameraFocus = 'pilot';

function setGamepadCameraView(action) {
  if (action === 'cameraLeft') { gamepadCameraSide = -1; gamepadCameraFocus = 'pilot'; }
  else if (action === 'cameraRight') { gamepadCameraSide = 1; gamepadCameraFocus = 'pilot'; }
  else if (action === 'cameraEnemy') { gamepadCameraSide = 0; gamepadCameraFocus = gamepadCameraFocus === 'enemy' ? 'pilot' : 'enemy'; }
  else if (action === 'cameraMissiles') { gamepadCameraSide = 0; gamepadCameraFocus = gamepadCameraFocus === 'missile' ? 'pilot' : 'missile'; }
}

function cycleBattroidTracking() {
  if (currentMode !== 'BATTROID') return;
  if (battroidTrackMode === 'NONE') battroidTrackMode = 'ENEMY';
  else if (battroidTrackMode === 'ENEMY') battroidTrackMode = 'MISSILE';
  else battroidTrackMode = 'NONE';
  battroidTrackedTarget = null;
}

function getClosestBattroidTarget(playerPos, trackMode = battroidTrackMode) {
  let closest = null;
  let minDist = 99999;
  if (trackMode === 'ENEMY' && typeof enemies !== 'undefined') {
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].respawnTimer > 0) continue;
      const d = playerPos.distanceTo(enemies[i].mesh.position);
      if (d < minDist) { minDist = d; closest = enemies[i]; }
    }
  } else if (trackMode === 'MISSILE' && typeof enemyMissiles !== 'undefined') {
    for (let i = 0; i < enemyMissiles.length; i++) {
      const d = playerPos.distanceTo(enemyMissiles[i].mesh.position);
      if (d < minDist) { minDist = d; closest = enemyMissiles[i]; }
    }
  }
  return closest;
}

function setModelFrame(frame) {
  if (!mixer || !action) return;
  const clamped = Math.max(0, Math.min(TOTAL_FRAMES, frame));
  action.paused = false;
  action.time = (clamped / TOTAL_FRAMES) * clipDuration;
  mixer.update(0);
  action.paused = true;
}

function updateButtonsUI() {
  const bF = document.getElementById('btnFighter');
  const bG = document.getElementById('btnGerwalk');
  const bB = document.getElementById('btnBattroid');
  const bS = document.getElementById('btnSweep');
  const bM = document.getElementById('btnMelee');
  if (bF) bF.classList.toggle('active', currentMode === 'FIGHTER');
  if (bG) bG.classList.toggle('active', currentMode === 'GERWALK');
  if (bB) bB.classList.toggle('active', currentMode === 'BATTROID');
  if (bS) bS.classList.toggle('active', isAccelerating);
  if (bM) bM.classList.toggle('active', isAttacking);
}


function transformTo(newMode) {
  if (!mixer || isAttacking || isAccelerating || currentMode === newMode) return;
  if (newMode !== 'BATTROID') { battroidTrackMode = 'NONE'; battroidTrackedTarget = null; }
  if (newMode === 'FIGHTER') {
    if (currentMode === 'BATTROID') { currentFrame = 29; targetFrame = 44; }
    else if (currentMode === 'GERWALK') { currentFrame = 14; targetFrame = 0; }
  } else if (newMode === 'GERWALK') {
    if (currentMode === 'FIGHTER') { if (currentFrame >= 44) currentFrame = 0; targetFrame = 14; }
    else if (currentMode === 'BATTROID') { currentFrame = 29; targetFrame = 14; }
  } else if (newMode === 'BATTROID') {
    if (currentMode === 'FIGHTER') { if (currentFrame >= 44) currentFrame = 0; targetFrame = 29; }
    else if (currentMode === 'GERWALK') { targetFrame = 29; }
  }
  currentMode = newMode;
  if (typeof playSFX === 'function') playSFX('transform', 0.8, 0);
  updateButtonsUI();
}
function startReverseGerwalk() {
  if (!mixer || isReverseGerwalk) return;
  if (isAccelerating) isAccelerating = false;
  isAttacking = false;
  isReverseGerwalk = true;
  if (currentMode !== 'GERWALK') transformTo('GERWALK');
}

function stopReverseGerwalk() {
  if (!isReverseGerwalk) return;
  isReverseGerwalk = false;
  if (currentMode !== 'FIGHTER') transformTo('FIGHTER');
}

function startAcceleration() {
  if (!mixer || isAccelerating || isOverheated) return;
  isAttacking = false;
  isReverseGerwalk = false;
  isAccelerating = true;
  battroidTrackMode = 'NONE';
  battroidTrackedTarget = null;
  if (typeof playSFX === 'function') playSFX('boost', 0.85, 0);
  if (currentMode === 'BATTROID') {
    currentMode = 'FIGHTER';
    if (currentFrame > 29) currentFrame = 29;
    targetFrame = 59;
  } else if (currentMode === 'GERWALK') {
    currentMode = 'FIGHTER';
    if (currentFrame > 14) currentFrame = 14;
    targetFrame = 0;
  } else {
    if (currentFrame < 44) currentFrame = 44;
    targetFrame = 59;
  }
  updateButtonsUI();
}

function triggerBattroidImpulse(keys) {
  if (currentMode !== 'BATTROID' || isOverheated) return;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerContainer.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerContainer.quaternion);
  const impulse = new THREE.Vector3();
  if (keys.KeyW) impulse.add(forward);
  if (keys.KeyS) impulse.sub(forward);
  if (keys.KeyD || keys.GamepadRB) impulse.add(right);
  if (keys.KeyA || keys.GamepadLB) impulse.sub(right);
  if (keys.ArrowUp) impulse.y += 0.8;
  if (keys.ArrowDown || keys.GamepadDescend) impulse.y -= 0.8;
  if (impulse.lengthSq() === 0) impulse.y = 1;
  impulse.normalize().multiplyScalar(13);
  velocity.add(impulse);
  turboHeat = Math.min(1, turboHeat + 0.28);
  if (turboHeat >= 1) isOverheated = true;
  if (typeof playSFX === 'function') playSFX('boost', 0.75, 0);
}
function stopAcceleration() {
  if (!isAccelerating) return;
  isAccelerating = false;
  currentMode = 'FIGHTER';
  targetFrame = (currentFrame >= 44) ? 44 : 0;
  updateButtonsUI();
}

function triggerFullStop() {
  if (isAccelerating) stopAcceleration();
  throttle = 0;
  velocity.set(0, 0, 0);
}

function triggerGunpodMelee() {
  if (currentMode !== 'BATTROID' || isAttacking || isAccelerating) return;
  isAttacking = true;
  currentFrame = 77;
  targetFrame = 91;
  updateButtonsUI();
}

function createPlumeTexture(isMainJet) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 118, 2, 32, 70, 58);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.25, 'rgba(200, 240, 255, 0.85)');
  grad.addColorStop(0.65, 'rgba(100, 180, 255, 0.35)');
  grad.addColorStop(1.0, 'rgba(0, 80, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(32, 0);
  ctx.quadraticCurveTo(60, 85, 48, 128);
  ctx.lineTo(16, 128);
  ctx.quadraticCurveTo(4, 85, 32, 0);
  ctx.fill();
  if (isMainJet) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath(); ctx.ellipse(32, 85, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(32, 55, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

const mainPlumeTex = createPlumeTexture(true);
const vernierPlumeTex = createPlumeTexture(false);

function createPlumeMesh(isMain) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: isMain ? mainPlumeTex : vernierPlumeTex,
    color: 0x38bdf8,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const width = isMain ? 0.0065 : 0.0038;
  const length = isMain ? 0.026 : 0.015;
  const geo1 = new THREE.PlaneGeometry(width, length);
  geo1.translate(0, length / 2, 0);
  if (isMain) geo1.rotateX(-Math.PI / 2);
  const p1 = new THREE.Mesh(geo1, mat);
  const p2 = p1.clone();
  if (isMain) p2.rotateZ(Math.PI / 2); else p2.rotateY(Math.PI / 2);
  const p3 = p1.clone();
  if (isMain) p3.rotateZ(Math.PI / 4); else p3.rotateY(Math.PI / 4);

  p1.renderOrder = 10;
  p2.renderOrder = 10;
  p3.renderOrder = 10;

  group.add(p1, p2, p3);
  return { group: group, mat: mat };
}

function loadPlayerModel(visualTiltGroup) {
  const loader = new THREE.GLTFLoader();
  loader.load('./models/vf1a.glb', (gltf) => {
    const model = gltf.scene;
    model.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : new Array(child.material);
        mats.forEach((m) => {
          m.transparent = false; m.opacity = 1.0; m.alphaTest = 0;
          m.depthWrite = true; m.side = THREE.DoubleSide; m.needsUpdate = true;
        });
      }
      if (child.name && child.name.includes('Flare')) {
        const isMain = child.name.startsWith('Frame07_') || child.name.startsWith('Frame11_');
        const isBackpack = child.name.startsWith('Frame27_') || child.name.startsWith('Frame28_') || child.name.startsWith('Frame29_');
        const plume = createPlumeMesh(isMain);
        if (isBackpack) plume.group.rotation.x = -Math.PI / 2;
        child.add(plume.group);
        thrusterFlames.push({
          group: plume.group,
          outerMat: plume.mat,
          name: child.name,
          isMain: isMain,
          isBackpack: isBackpack
        });
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    if (size > 0) {
      const s = 1.6 / size;
      model.scale.set(s, s, s);
    }
    model.rotation.y = Math.PI;
    visualTiltGroup.add(model);

    const clip = gltf.animations.find(() => true);
    if (clip) {
      mixer = new THREE.AnimationMixer(model);
      clipDuration = clip.duration;
      action = mixer.clipAction(clip);
      action.play();
      setModelFrame(0);
    }
  });
}
function updateThrusters(isFullStop, keys) {
  if (thrusterFlames.length === 0) return;

  const isFighter = (currentMode === 'FIGHTER');
  const yawLeft = isFighter ? keys['KeyA'] : keys['ArrowLeft'];
  const yawRight = isFighter ? keys['KeyD'] : keys['ArrowRight'];
  const rollLeft = isFighter && keys['ArrowLeft'];
  const rollRight = isFighter && keys['ArrowRight'];
  const strafeLeft = !isFighter && (keys['KeyA'] || keys['GamepadLB']);
  const strafeRight = !isFighter && (keys['KeyD'] || keys['GamepadRB']);
  const pushUp = isFighter ? keys['ArrowDown'] : keys['ArrowUp'];
  const pushDown = isFighter ? keys['ArrowUp'] : keys['ArrowDown'];
  const pushForward = !isFighter && keys['KeyW'];

  let mainPower = 0.4;
  if (isFullStop) mainPower = 0.0;
  else if (isAccelerating) mainPower = 2.6;
  else if (isReverseGerwalk) mainPower = 1.8;
  else if (isFighter) mainPower = throttle === 0 ? 0.3 : (0.65 + throttle * 1.2);
  else if (currentMode === 'GERWALK') {
    const moving = yawLeft || yawRight || strafeLeft || strafeRight || pushUp || pushDown || keys['KeyW'] || keys['KeyS'];
    mainPower = moving ? 1.25 : 0.7;
  } else if (currentMode === 'BATTROID') {
    const boosting = keys['ArrowUp'] || keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD'];
    mainPower = keys['ArrowUp'] ? 1.85 : (boosting ? 1.05 : 0.4);
  }

  const flicker = 0.88 + Math.random() * 0.28;

  thrusterFlames.forEach((f) => {
    if (isFullStop) { f.group.visible = false; return; }
    if (f.isMain) {
      f.group.visible = true;
      const len = mainPower * 1.3 * flicker;
      const wid = Math.min(1.5, 0.9 + mainPower * 0.25);
      f.group.scale.set(wid, wid, len);
      f.outerMat.color.setHex(isAccelerating ? 0xea580c : 0x0284c7);
      return;
    }
    if (f.isBackpack) {
      if (!pushForward) { f.group.visible = false; }
      else {
        f.group.visible = true;
        const packPulse = 1.7 + Math.random() * 0.6;
        f.group.scale.set(1.6, packPulse, 1.6);
        f.outerMat.color.setHex(0x0284c7);
      }
      return;
    }
    const n = f.name;
    const isRightSide = n.startsWith('Frame05_') || n.startsWith('Frame06_') || n.startsWith('Frame12_');
    const isLeftSide  = n.startsWith('Frame08_') || n.startsWith('Frame10_') || n.startsWith('Frame13_');
    const isBottom    = n.startsWith('Frame04_') || n.startsWith('Frame09_') || n.startsWith('Frame14_') || n.startsWith('Frame15_');
    const isTop       = n.startsWith('Frame00_') || n.startsWith('Frame02_');

    let fireVernier = false;
    if ((yawLeft || strafeLeft) && isRightSide) fireVernier = true;
    if ((yawRight || strafeRight) && isLeftSide) fireVernier = true;
    if (rollLeft && (n.startsWith('Frame02_') || n.startsWith('Frame01_'))) fireVernier = true;
    if (rollRight && (n.startsWith('Frame00_') || n.startsWith('Frame03_'))) fireVernier = true;
    if (pushUp && isBottom) fireVernier = true;
    if (pushDown && isTop) fireVernier = true;

    if (!fireVernier) { f.group.visible = false; }
    else {
      f.group.visible = true;
      const vernierPulse = 0.95 + Math.random() * 0.45;
      f.group.scale.set(1.05, vernierPulse, 1.05);
      f.outerMat.color.setHex(0x0ea5e9);
    }
  });
}

function updatePlayerAnimation(delta) {
  if (mixer && Math.abs(targetFrame - currentFrame) > 0.05) {
    const direction = Math.sign(targetFrame - currentFrame);
    currentFrame += direction * animSpeed * delta;
    if ((direction > 0 && currentFrame >= targetFrame) || (direction < 0 && currentFrame <= targetFrame)) {
      currentFrame = targetFrame;
      if (isAccelerating && currentFrame === 0) { currentFrame = 44; targetFrame = 59; }
      if (isAttacking) { isAttacking = false; currentFrame = 29; targetFrame = 29; updateButtonsUI(); }
      if (currentMode === 'FIGHTER' && currentFrame === 44 && !isAccelerating) { currentFrame = 0; targetFrame = 0; }
    }
    setModelFrame(currentFrame);
  }
}

function resetPlayerMission(playerContainer, visualTiltGroup) {
  playerArmor = playerMaxArmor;
  armorDamageFlash = 0;
  armorRegenDelay = 0;
  isPlayerDying = false;
  isGameOver = false;
  deathExplosionTimer = 0;
  score = 0;
  throttle = 0.35;
  turboHeat = 0.0;
  isOverheated = false;
  isAccelerating = false;
  isReverseGerwalk = false;
  isAttacking = false;
  battroidTrackMode = 'NONE';
  battroidTrackedTarget = null;
  velocity.set(0, 0, 0);
  playerContainer.position.set(0, 38, 120);
  playerContainer.quaternion.identity();
  visualTiltGroup.rotation.set(0, 0, 0);
  visualTiltGroup.position.set(0, 0, 0);
  currentMode = 'FIGHTER';
  currentFrame = 0;
  targetFrame = 0;
  setModelFrame(0);
  updateButtonsUI();
}

function getDynamicGroundY(x, z) {
  let modeOffset = 0.55;
  if (currentMode === 'GERWALK') modeOffset = 0.95;
  else if (currentMode === 'BATTROID') modeOffset = 1.25;
  if (typeof getTerrainHeight === 'function') {
    return Math.max(modeOffset, getTerrainHeight(x, z) + modeOffset);
  }
  return modeOffset;
}

function handlePlayerDeathSequence(delta, playerContainer, visualTiltGroup, camera, keys, hudEl, groundY) {
  updateThrusters(true, keys);
  if (isPlayerDying) {
    deathExplosionTimer -= delta;
    if (deathExplosionTimer <= 0) {
      const boomPos = playerContainer.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.1, (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 1.1));
      spawnExplosion(scene, camera, boomPos, 0.85);
      spawnImpactSparks(scene, camera, boomPos);
      deathExplosionTimer = 0.22;
    }
    velocity.x *= (1.0 - 0.6 * delta);
    velocity.z *= (1.0 - 0.6 * delta);
    velocity.y -= 14.5 * delta;
    visualTiltGroup.rotation.z += 2.2 * delta;
    visualTiltGroup.rotation.x = THREE.MathUtils.lerp(visualTiltGroup.rotation.x, 0.55, 2.0 * delta);
    playerContainer.position.addScaledVector(velocity, delta);
    if (playerContainer.position.y <= groundY) {
      playerContainer.position.y = groundY;
      velocity.set(0, 0, 0);
      isPlayerDying = false;
      isGameOver = true;
      spawnExplosion(scene, camera, playerContainer.position, 2.2);
      spawnImpactSparks(scene, camera, playerContainer.position);
    }
  } else if (isGameOver) {
    visualTiltGroup.rotation.x = THREE.MathUtils.lerp(visualTiltGroup.rotation.x, 0.12, 4.0 * delta);
    visualTiltGroup.rotation.z = THREE.MathUtils.lerp(visualTiltGroup.rotation.z, 0.45, 4.0 * delta);
  }
  const camOffset = new THREE.Vector3(0, 0.65, 2.4).applyQuaternion(playerContainer.quaternion);
  camera.position.lerp(playerContainer.position.clone().add(camOffset), 10.0 * delta);
  camera.up.lerp(new THREE.Vector3(0, 1, 0), 8.0 * delta);
  camera.lookAt(playerContainer.position);
  hudEl.textContent = 'MODO: DOWN | EMPUJE: OFFLINE | SCORE FINAL: ' + score;
}
function updatePlayerPhysics(delta, playerContainer, visualTiltGroup, camera, keys, hudEl) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerContainer.quaternion);
  const isFullStop = Boolean(keys['KeyX']);
  const groundY = getDynamicGroundY(playerContainer.position.x, playerContainer.position.z);

  if (isPlayerDying || isGameOver) {
    handlePlayerDeathSequence(delta, playerContainer, visualTiltGroup, camera, keys, hudEl, groundY);
    return;
  }

  if (isAccelerating && !isOverheated) {
    turboHeat = Math.min(1.0, turboHeat + 0.22 * delta);
    if (turboHeat >= 1.0) { isOverheated = true; stopAcceleration(); }
  } else {
    const coolRate = isFullStop ? 0.35 : 0.18;
    turboHeat = Math.max(0.0, turboHeat - coolRate * delta);
    if (isOverheated && turboHeat <= 0.35) isOverheated = false;
  }

  if (currentMode !== 'BATTROID') {
    battroidTrackMode = 'NONE';
    battroidTrackedTarget = null;
  }

  if (isFullStop) {
    triggerFullStop();
    visualTiltGroup.rotation.set(0, 0, 0);
    visualTiltGroup.position.y = THREE.MathUtils.lerp(visualTiltGroup.position.y, 0, 8.0 * delta);
  } else if (currentMode === 'FIGHTER') {
    visualTiltGroup.rotation.x = THREE.MathUtils.lerp(visualTiltGroup.rotation.x, 0, 8.0 * delta);
    visualTiltGroup.rotation.z = THREE.MathUtils.lerp(visualTiltGroup.rotation.z, 0, 8.0 * delta);
    visualTiltGroup.position.y = THREE.MathUtils.lerp(visualTiltGroup.position.y, 0, 8.0 * delta);
    const tightTurn = (keys['GamepadLB'] || keys['GamepadRB']) ? 1.75 : 1;
    const yawRate = 1.6 * delta * tightTurn, rollRate = 2.4 * delta * tightTurn, pitchRate = 1.7 * delta * tightTurn;
    if (keys['KeyA']) playerContainer.rotateY(yawRate);
    if (keys['KeyD']) playerContainer.rotateY(-yawRate);
    if (keys['ArrowLeft'] || keys['GamepadRollLeft']) playerContainer.rotateZ(rollRate);
    if (keys['ArrowRight'] || keys['GamepadRollRight']) playerContainer.rotateZ(-rollRate);
    if (keys['ArrowUp'] || keys['GamepadPitchDown']) playerContainer.rotateX(-pitchRate);
    if (keys['ArrowDown'] || keys['GamepadPitchUp']) playerContainer.rotateX(pitchRate);
    if (keys['KeyW'] || keys['GamepadMoveForward']) throttle = Math.min(1.0, throttle + 0.55 * delta);
    if (keys['KeyS'] || keys['GamepadMoveBack'] || keys['GamepadSlowdown']) throttle = Math.max(0.0, throttle - 0.55 * delta);
    const cruiseSpeed = throttle === 0 ? 0 : (5 + throttle * 17);
    const targetSpeed = isAccelerating ? 38 : cruiseSpeed;
    velocity.lerp(forward.clone().multiplyScalar(targetSpeed), 3.0 * delta);
    const targetFov = isAccelerating ? 74 : (58 + throttle * 6);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 5.0 * delta);
    camera.updateProjectionMatrix();
  } else if (currentMode === 'GERWALK') {
    const euler = new THREE.Euler().setFromQuaternion(playerContainer.quaternion, 'YXZ');
    const levelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0, 'YXZ'));
    playerContainer.quaternion.slerp(levelQuat, 7.0 * delta);
        const yawRate = 2.3 * delta;
    if (keys['ArrowLeft'] || keys['GamepadGerwalkTurnLeft']) playerContainer.rotateY(yawRate);
    if (keys['ArrowRight'] || keys['GamepadGerwalkTurnRight']) playerContainer.rotateY(-yawRate);
    const flatForward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerContainer.quaternion);
    const flatRight = new THREE.Vector3(1, 0, 0).applyQuaternion(playerContainer.quaternion);
    const moveDir = new THREE.Vector3(0, 0, 0);
    let tiltPitch = 0, tiltRoll = 0;
    if (isReverseGerwalk) { moveDir.sub(flatForward); tiltPitch = 0.22; }
    else {
      if (keys['KeyW'] || keys['GamepadThrust'] || keys['GamepadMoveForward']) { moveDir.add(flatForward); tiltPitch = -0.14; }
      if (keys['KeyS'] || keys['GamepadSlowdown'] || keys['GamepadMoveBack']) { moveDir.sub(flatForward); tiltPitch = 0.16; }
    }
    if (keys['GamepadLB'] && keys['GamepadRB']) moveDir.y += 0.85;
    else {
      if (keys['KeyA'] || keys['GamepadLB']) { moveDir.sub(flatRight); tiltRoll = 0.18; }
      if (keys['KeyD'] || keys['GamepadRB']) { moveDir.add(flatRight); tiltRoll = -0.18; }
    }
    if (keys['ArrowUp'] || keys['GamepadGerwalkUp']) moveDir.y += 0.85;
    if (keys['ArrowDown'] || keys['GamepadGerwalkDown'] || keys['GamepadDescend']) moveDir.y -= 0.85;
    visualTiltGroup.rotation.x = THREE.MathUtils.lerp(visualTiltGroup.rotation.x, tiltPitch, 8.0 * delta);
    visualTiltGroup.rotation.z = THREE.MathUtils.lerp(visualTiltGroup.rotation.z, tiltRoll, 8.0 * delta);
    visualTiltGroup.position.y = Math.sin(performance.now() * 0.003) * 0.035;
    if (moveDir.lengthSq() > 0) moveDir.normalize();
    const gerwalkSpeed = isReverseGerwalk ? 16.5 : 14.0;
    velocity.lerp(moveDir.multiplyScalar(gerwalkSpeed), 4.5 * delta);
    camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 5.0 * delta);
    camera.updateProjectionMatrix();
  } else if (currentMode === 'BATTROID') {
    const euler = new THREE.Euler().setFromQuaternion(playerContainer.quaternion, 'YXZ');
    const levelQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0, 'YXZ'));
    playerContainer.quaternion.slerp(levelQuat, 9.0 * delta);
    visualTiltGroup.position.y = THREE.MathUtils.lerp(visualTiltGroup.position.y, 0, 8.0 * delta);
    const yawRate = 2.8 * delta;
    if (keys['ArrowLeft'] || keys['GamepadTurnLeft']) playerContainer.rotateY(yawRate);
    if (keys['ArrowRight'] || keys['GamepadTurnRight']) playerContainer.rotateY(-yawRate);
    const flatForward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerContainer.quaternion);
    const flatRight = new THREE.Vector3(1, 0, 0).applyQuaternion(playerContainer.quaternion);
    const moveDir = new THREE.Vector3(0, 0, 0);
    let tiltPitch = 0, tiltRoll = 0;
    if (keys['KeyW'] || keys['GamepadMoveForward']) { moveDir.add(flatForward); tiltPitch = -0.15; }
    if (keys['KeyS'] || keys['GamepadMoveBack']) { moveDir.sub(flatForward); tiltPitch = 0.14; }
    if (keys['KeyA'] || keys['GamepadLB']) { moveDir.sub(flatRight); tiltRoll = 0.16; }
    if (keys['KeyD'] || keys['GamepadRB']) { moveDir.add(flatRight); tiltRoll = -0.16; }
    const activeBattroidTrackMode = keys['GamepadTargetLock'] ? 'ENEMY' : battroidTrackMode;
    if (activeBattroidTrackMode !== 'NONE') {
      battroidTrackedTarget = getClosestBattroidTarget(playerContainer.position, activeBattroidTrackMode);
      if (battroidTrackedTarget) {
        const aimMat = new THREE.Matrix4().lookAt(playerContainer.position, battroidTrackedTarget.mesh.position, new THREE.Vector3(0, 1, 0));
        const aimQuat = new THREE.Quaternion().setFromRotationMatrix(aimMat);
        playerContainer.quaternion.slerp(aimQuat, 9.5 * delta);
      }
    } else {
      battroidTrackedTarget = null;
    }

    visualTiltGroup.rotation.x = THREE.MathUtils.lerp(visualTiltGroup.rotation.x, tiltPitch, 10.0 * delta);
    visualTiltGroup.rotation.z = THREE.MathUtils.lerp(visualTiltGroup.rotation.z, tiltRoll, 10.0 * delta);
    if (moveDir.lengthSq() > 0) moveDir.normalize();
    const battroidSpeed = 11.5;
    velocity.x = THREE.MathUtils.lerp(velocity.x, moveDir.x * battroidSpeed, 7.0 * delta);
    velocity.z = THREE.MathUtils.lerp(velocity.z, moveDir.z * battroidSpeed, 7.0 * delta);
    if (keys['ArrowUp']) velocity.y = THREE.MathUtils.lerp(velocity.y, 12.5, 6.0 * delta);
    else if (keys['ArrowDown'] || keys['GamepadDescend']) velocity.y = THREE.MathUtils.lerp(velocity.y, -15.0, 6.0 * delta);
    else velocity.y -= 16.0 * delta;
    camera.fov = THREE.MathUtils.lerp(camera.fov, 60, 5.0 * delta);
    camera.updateProjectionMatrix();
  }

  updateThrusters(isFullStop, keys);
  playerContainer.position.addScaledVector(velocity, delta);
  if (playerContainer.position.y < groundY) {
    playerContainer.position.y = groundY;
    if (velocity.y < 0) velocity.y = 0;
  }

  if (typeof resolveStructureCollisions === 'function') {
    const collided = resolveStructureCollisions(playerContainer.position, velocity);
    if (collided && velocity.length() > 14 && typeof spawnImpactSparks === 'function') {
      spawnImpactSparks(scene, camera, playerContainer.position);
    }
  }

  const camOffset = new THREE.Vector3(0, 0.45, 1.85).applyQuaternion(playerContainer.quaternion);
  camOffset.add(new THREE.Vector3(gamepadCameraSide * 1.15, 0, 0).applyQuaternion(playerContainer.quaternion));
  camera.position.lerp(playerContainer.position.clone().add(camOffset), 14.0 * delta);
  const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(playerContainer.quaternion);
  camera.up.lerp(camUp, 10.0 * delta);
  let cameraTarget = playerContainer.position.clone().add(forward.clone().multiplyScalar(4));
  if (gamepadCameraFocus === 'enemy' && typeof enemies !== 'undefined') {
    const target = enemies.reduce((closest, enemy) => {
      if (enemy.respawnTimer > 0) return closest;
      const distance = enemy.mesh.position.distanceToSquared(playerContainer.position);
      return !closest || distance < closest.distance ? { enemy, distance } : closest;
    }, null);
    if (target) cameraTarget = target.enemy.mesh.position.clone();
  } else if (gamepadCameraFocus === 'missile' && typeof enemyMissiles !== 'undefined') {
    const target = enemyMissiles.reduce((closest, missile) => {
      const distance = missile.mesh.position.distanceToSquared(playerContainer.position);
      return !closest || distance < closest.distance ? { missile, distance } : closest;
    }, null);
    if (target) cameraTarget = target.missile.mesh.position.clone();
  }
  camera.lookAt(cameraTarget);

  const speedKmh = Math.round(velocity.length() * 45);
  const altMeters = Math.max(0, Math.round((playerContainer.position.y - groundY) * 10));
  const altStr = String(altMeters).padStart(4, '0');

  const headingDeg = (Math.round(Math.atan2(forward.x, -forward.z) * (180 / Math.PI)) + 360) % 360;
  const headingStr = String(headingDeg).padStart(3, '0');
  const dirs = ['N ', 'NE', 'E ', 'SE', 'S ', 'SO', 'O ', 'NO'];
  const cardinalDir = dirs[Math.round(headingDeg / 45) % 8];

  let closestEnemyText = 'SIN BLANCOS';
  if (typeof enemies !== 'undefined' && enemies.length > 0) {
    let minEnemyDist = Infinity;
    let closestId = '';
    for (let i = 0; i < enemies.length; i++) {
      if (enemies[i].respawnTimer > 0) continue;
      const d = playerContainer.position.distanceTo(enemies[i].mesh.position);
      if (d < minEnemyDist) {
        minEnemyDist = d;
        closestId = enemies[i].id;
      }
    }
    if (minEnemyDist < Infinity) {
      const distStr = String(Math.round(minEnemyDist * 10)).padStart(4, '0');
      closestEnemyText = closestId + ' (' + distStr + ' M)';
    }
  }

  hudEl.innerHTML =
    'MODO: <b>' + currentMode + '</b> | SCORE: <b>' + score + '</b><br>' +
    'ALTITUD: <b>' + altStr + ' M</b> | RUMBO: <b>' + cardinalDir + ' (' + headingStr + '°)</b><br>' +
    'ENEMIGO CERCANO: <b>' + closestEnemyText + '</b>';
}



