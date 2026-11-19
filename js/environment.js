const ISLAND_POLY = new Array(
  { x: -340, z: -480 }, { x: -110, z: -530 }, { x: 160,  z: -460 },
  { x: 350,  z: -330 }, { x: 460,  z: -140 }, { x: 480,  z: 80 },
  { x: 410,  z: 270 },  { x: 250,  z: 350 },  { x: 145,  z: 290 },
  { x: 115,  z: 195 },  { x: 20,   z: 185 },  { x: -35,  z: 250 },
  { x: -30,  z: 365 },  { x: -85,  z: 495 },  { x: -235, z: 530 },
  { x: -345, z: 455 },  { x: -315, z: 375 },  { x: -225, z: 385 },
  { x: -210, z: 315 },  { x: -290, z: 245 },  { x: -435, z: 185 },
  { x: -510, z: -40 },  { x: -465, z: -295 }
);

const ISLETS = new Array(
  { x: 360, z: -490, rx: 68, rz: 42, h: 14.0 },
  { x: 485, z: -510, rx: 38, rz: 28, h: 9.5 },
  { x: 445, z: -420, rx: 32, rz: 24, h: 7.5 }
);

const CRATERS = new Array(
  { x: 285,  z: -175, outerR: 98, innerR: 44, height: 42 },
  { x: 255,  z: 65,   outerR: 84, innerR: 36, height: 35 },
  { x: 335,  z: 195,  outerR: 72, innerR: 32, height: 28 },
  { x: 75,   z: -375, outerR: 88, innerR: 38, height: 38 },
  { x: -175, z: -385, outerR: 92, innerR: 42, height: 40 },
  { x: -365, z: -215, outerR: 82, innerR: 35, height: 34 },
  { x: -375, z: 75,   outerR: 76, innerR: 32, height: 30 },
  { x: -215, z: 455,  outerR: 65, innerR: 28, height: 24 }
);

const COMPLEX_CONFIG = { centerX: -12, centerZ: 15, rotY: 0.45, groundY: 3.25 };
const SDF1_LOCAL_DOCK = { x: -8, z: 36, length: 126, width: 44 };
let sdf1AnchorGroup = null;
function distToSegment(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

function signedDistanceToIsland(x, z) {
  let inside = false;
  let minEdgeDist = 99999;
  const n = ISLAND_POLY.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ISLAND_POLY[i].x, zi = ISLAND_POLY[i].z;
    const xj = ISLAND_POLY[j].x, zj = ISLAND_POLY[j].z;

    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + 0.00001) + xi);
    if (intersect) inside = !inside;

    const d = distToSegment(x, z, xi, zi, xj, zj);
    if (d < minEdgeDist) minEdgeDist = d;
  }

  const coastNoise = Math.sin(x * 0.022) * 8.5 + Math.cos(z * 0.022) * 8.5;
  return (inside ? -minEdgeDist : minEdgeDist) + coastNoise;
}

function localToWorldXZ(lx, lz) {
  const cos = Math.cos(COMPLEX_CONFIG.rotY);
  const sin = Math.sin(COMPLEX_CONFIG.rotY);
  return {
    x: COMPLEX_CONFIG.centerX + (lx * cos + lz * sin),
    z: COMPLEX_CONFIG.centerZ + (-lx * sin + lz * cos)
  };
}
function getCalderaBlend(x, z) {
  const dx = (x + 12) / 255;
  const dz = (z - 10) / 205;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d <= 0.78) return 0.0;
  if (d >= 1.15) return 1.0;
  const t = (d - 0.78) / 0.37;
  return t * t * (3 - 2 * t);
}

function getTerrainHeight(x, z) {
  if (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_2') return -9999;
  if (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_3' && typeof getInteriorTerrainHeight === 'function') return getInteriorTerrainHeight(x, z);

  for (let i = 0; i < ISLETS.length; i++) {
    const isl = ISLETS[i];
    const nx = (x - isl.x) / isl.rx;
    const nz = (z - isl.z) / isl.rz;
    const d2 = nx * nx + nz * nz;
    if (d2 < 1.35) {
      const t = Math.max(0, 1.0 - d2 / 1.35);
      return -1.2 + t * (isl.h + 1.2);
    }
  }

  const sd = signedDistanceToIsland(x, z);
  if (sd > 24) return -3.2;

  let baseH = 3.2;
  if (sd > -24) {
    const t = (24 - sd) / 48;
    const smooth = t * t * (3 - 2 * t);
    baseH = -3.2 + smooth * 6.4;
  }

  const calderaFactor = getCalderaBlend(x, z);
  if (calderaFactor <= 0.01 || sd > -26) return baseH;

  let craterH = 0;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dist = Math.hypot(x - c.x, z - c.z);
    if (dist < c.outerR) {
      const norm = dist / c.outerR;
      const rimPeak = c.innerR / c.outerR;
      if (norm > rimPeak) {
        const slope = 1.0 - (norm - rimPeak) / (1.0 - rimPeak);
        craterH += Math.sin(slope * Math.PI * 0.5) * c.height;
      } else {
        const bowl = norm / rimPeak;
        craterH += (0.38 + 0.62 * bowl * bowl) * c.height;
      }
    }
  }

  const rimRidge = Math.max(0, Math.min(1, (-sd - 26) / 95)) * 14.0;
  const hills = (Math.sin(x * 0.014) * Math.cos(z * 0.014) + 1.0) * 4.5;
  return baseH + calderaFactor * (craterH + rimRidge + hills);
}
const structureColliders = new Array();

function registerBoxCollider(cx, cy, cz, w, h, d, rotY) {
  const angle = rotY || 0;
  structureColliders.push({
    cx: cx,
    cy: cy,
    cz: cz,
    halfW: w * 0.5,
    halfH: h * 0.5,
    halfD: d * 0.5,
    rotY: angle,
    cos: Math.cos(-angle),
    sin: Math.sin(-angle)
  });
}

function resolveStructureCollisions(pos, vel) {
  const r = 0.85;
  let hit = false;

  for (let i = 0; i < structureColliders.length; i++) {
    const b = structureColliders[i];

    const dx = pos.x - b.cx;
    const dz = pos.z - b.cz;
    const lx = b.rotY === 0 ? dx : (dx * b.cos + dz * b.sin);
    const lz = b.rotY === 0 ? dz : (-dx * b.sin + dz * b.cos);

    if (
      Math.abs(lx) < (b.halfW + r) &&
      Math.abs(pos.y - b.cy) < (b.halfH + r) &&
      Math.abs(lz) < (b.halfD + r)
    ) {
      hit = true;
      const penX = (b.halfW + r) - Math.abs(lx);
      const penY = (b.halfH + r) - Math.abs(pos.y - b.cy);
      const penZ = (b.halfD + r) - Math.abs(lz);

      if (penY <= penX && penY <= penZ) {
        if (pos.y >= b.cy) {
          pos.y = b.cy + b.halfH + r;
          if (vel.y < 0) vel.y = 0;
        } else {
          pos.y = b.cy - b.halfH - r;
          if (vel.y > 0) vel.y = 0;
        }
      } else {
        let corrLx = 0;
        let corrLz = 0;
        if (penX < penZ) {
          corrLx = (lx >= 0 ? 1 : -1) * penX;
        } else {
          corrLz = (lz >= 0 ? 1 : -1) * penZ;
        }

        const invCos = b.cos;
        const invSin = -b.sin;
        pos.x += (corrLx * invCos + corrLz * invSin);
        pos.z += (-corrLx * invSin + corrLz * invCos);
        vel.x *= -0.25;
        vel.z *= -0.25;
      }
    }
  }
  return hit;
}
let waterNormalTex1 = null;
let waterNormalTex2 = null;
let skyCanvas = null;
let skyCtx = null;
let skyTex = null;
let oceanMeshMat = null;
let towerCabMat = null;
let towerRadarMesh = null;
let cloudMat = null;
let cloudInstMesh = null;
const streetPointLights = new Array();
const cloudData = new Array();
const cloudDummy = new THREE.Object3D();

const nightEmissiveMaterials = new Array();
let lastSkyKey = '';
let currentSimulatedHour = 12;

function createAnimeToonGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#33363f';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#788292';
  ctx.fillRect(1, 0, 2, 1);
  ctx.fillStyle = '#b4bcc8';
  ctx.fillRect(3, 0, 1, 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function initDynamicSkyTexture() {
  skyCanvas = document.createElement('canvas');
  skyCanvas.width = 32;
  skyCanvas.height = 256;
  skyCtx = skyCanvas.getContext('2d');
  skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  paintSkyGradient('#08203e', '#144c75', '#3d7694', '#949087');
  return skyTex;
}
function paintSkyGradient(c0, c1, c2, c3) {
  const key = c0 + c1 + c2 + c3;
  if (key === lastSkyKey || !skyCtx || !skyTex) return;
  lastSkyKey = key;

  const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, c0);
  grad.addColorStop(0.48, c1);
  grad.addColorStop(0.84, c2);
  grad.addColorStop(1.0, c3);
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 32, 256);
  skyTex.needsUpdate = true;
}

const DAYPART_HOURS = Object.freeze({ morning: 9, midday: 12, afternoon: 17, night: 22 });

function updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode = 'real') {
  if (typeof activeMapId !== 'undefined' && activeMapId !== 'MAPA_1') return;

  const now = new Date();
  let decHour = Object.prototype.hasOwnProperty.call(DAYPART_HOURS, timeOfDayMode)
    ? DAYPART_HOURS[timeOfDayMode]
    : now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  if (typeof manualHourOffset === 'number' && manualHourOffset !== 0) {
    decHour = (decHour + manualHourOffset) % 24;
  }
  currentSimulatedHour = decHour;

  const sunAngle = ((decHour - 6) / 24) * Math.PI * 2;
  const sunElev = Math.sin(sunAngle);
  const sunHoriz = Math.cos(sunAngle);

  if (dirLight) {
    dirLight.position.set(sunHoriz * 260, Math.max(25, sunElev * 240), 110);
  }

  let nightFactor = 0.0;

  if (sunElev > 0.22) {
    nightFactor = 0.0;
    paintSkyGradient('#0b2c52', '#195a88', '#447fa0', '#96938a');
    if (scene.fog) scene.fog.color.setHex(0x6b92a8);
    if (ambientLight) { ambientLight.color.setHex(0x7c93ad); ambientLight.intensity = 0.56; }
    if (hemiLight) { hemiLight.color.setHex(0x5299c7); hemiLight.groundColor.setHex(0x28323e); hemiLight.intensity = 0.48; }
    if (dirLight) { dirLight.color.setHex(0xfff1d6); dirLight.intensity = 1.65; }
    if (oceanMeshMat) { oceanMeshMat.color.setHex(0x0b3556); oceanMeshMat.envMapIntensity = 0.95; }
    if (cloudMat) { cloudMat.color.setHex(0xdbeafe); }
  } else if (sunElev > -0.15) {
    const t = (0.22 - sunElev) / 0.37;
    nightFactor = t * 0.65;
    paintSkyGradient('#0d1b3a', '#3b335c', '#9c4a3b', '#c97a4b');
    if (scene.fog) scene.fog.color.setHex(0x8c5548);
    if (ambientLight) { ambientLight.color.setHex(0x8c6268); ambientLight.intensity = 0.44; }
    if (hemiLight) { hemiLight.color.setHex(0xb86454); hemiLight.groundColor.setHex(0x1f2430); hemiLight.intensity = 0.38; }
    if (dirLight) { dirLight.color.setHex(0xff8c42); dirLight.intensity = 1.35 * (1.0 - t * 0.45); }
    if (oceanMeshMat) { oceanMeshMat.color.setHex(0x092640); oceanMeshMat.envMapIntensity = 0.75; }
    if (cloudMat) { cloudMat.color.setHex(0xfdba74); }
  } else {
    nightFactor = 1.0;
    paintSkyGradient('#020612', '#061126', '#0d1f3d', '#182b49');
    if (scene.fog) scene.fog.color.setHex(0x0a172e);
    if (ambientLight) { ambientLight.color.setHex(0x283b5c); ambientLight.intensity = 0.36; }
    if (hemiLight) { hemiLight.color.setHex(0x1e3a66); hemiLight.groundColor.setHex(0x0b101b); hemiLight.intensity = 0.30; }
    if (dirLight) { dirLight.color.setHex(0x6b93d6); dirLight.intensity = 0.55; }
    if (oceanMeshMat) { oceanMeshMat.color.setHex(0x041224); oceanMeshMat.envMapIntensity = 0.45; }
    if (cloudMat) { cloudMat.color.setHex(0x1e293b); }
  }

  for (let i = 0; i < nightEmissiveMaterials.length; i++) {
    nightEmissiveMaterials[i].emissiveIntensity = nightFactor * 1.35;
  }
  if (towerCabMat) {
    towerCabMat.emissiveIntensity = 0.25 + nightFactor * 1.25;
  }
  for (let i = 0; i < streetPointLights.length; i++) {
    streetPointLights[i].intensity = nightFactor * 2.6;
  }
}
function createWaterNormalTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * Math.PI * 2;
      const ny = (y / size) * Math.PI * 2;
      const dx = Math.cos(nx * 3 + Math.sin(ny * 2)) * 0.5 + Math.cos(nx * 5 - ny * 4) * 0.25;
      const dy = Math.sin(ny * 3 + Math.cos(nx * 2)) * 0.5 + Math.sin(ny * 5 + nx * 3) * 0.25;

      const idx = (y * size + x) * 4;
      data[idx]     = Math.floor((dx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((dy * 0.5 + 0.5) * 255);
      data[idx + 2] = 240;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(72, 72);
  return tex;
}

function buildSkyClouds(scene, toonGradient) {
  const puffGeo = new THREE.IcosahedronGeometry(14, 1);
  puffGeo.scale(2.4, 0.65, 1.5);

  cloudMat = new THREE.MeshToonMaterial({
    color: 0xdbeafe,
    gradientMap: toonGradient || createAnimeToonGradient(),
    transparent: false,
    depthWrite: true,
    fog: true
  });

  const clusterOffsets = [
    { ox: 0,   oy: 0,   oz: 0,  sx: 1.25, sy: 1.15, sz: 1.15 },
    { ox: -22, oy: -2,  oz: 4,  sx: 0.90, sy: 0.85, sz: 0.90 },
    { ox: 24,  oy: -2,  oz: -3, sx: 0.95, sy: 0.85, sz: 0.95 },
    { ox: 6,   oy: 4,   oz: 6,  sx: 0.85, sy: 1.05, sz: 0.85 }
  ];

  const cloudClusters = 55;
  const totalInstances = cloudClusters * clusterOffsets.length;
  cloudInstMesh = new THREE.InstancedMesh(puffGeo, cloudMat, totalInstances);
  cloudInstMesh.frustumCulled = false;

  cloudData.length = 0;
  let idx = 0;

  for (let i = 0; i < cloudClusters; i++) {
    const cx = (Math.random() - 0.5) * 2600;
    const cy = 125 + Math.random() * 85;
    const cz = (Math.random() - 0.5) * 2600;
    const scale = 0.85 + Math.random() * 1.15;
    const speed = 2.0 + Math.random() * 2.5;
    const yaw = Math.random() * Math.PI * 2;

    cloudData.push({ x: cx, y: cy, z: cz, scale: scale, speed: speed, yaw: yaw, offsets: clusterOffsets });

    for (let p = 0; p < clusterOffsets.length; p++) {
      const off = clusterOffsets[p];
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const wx = cx + (off.ox * cos - off.oz * sin) * scale;
      const wz = cz + (off.ox * sin + off.oz * cos) * scale;

      cloudDummy.position.set(wx, cy + off.oy * scale, wz);
      cloudDummy.rotation.set(0, yaw, 0);
      cloudDummy.scale.set(off.sx * scale, off.sy * scale, off.sz * scale);
      cloudDummy.updateMatrix();
      cloudInstMesh.setMatrixAt(idx++, cloudDummy.matrix);
    }
  }

  cloudInstMesh.instanceMatrix.needsUpdate = true;
  scene.add(cloudInstMesh);
}
function updateEnvironment(delta) {
  if (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_2') {
    if (typeof updateSaturnEnvironment === 'function') updateSaturnEnvironment(delta);
    return;
  }
  if (typeof activeMapId !== 'undefined' && activeMapId === 'MAPA_3') {
    if (typeof updateInteriorEnvironment === 'function') updateInteriorEnvironment(delta);
    return;
  }

  if (waterNormalTex1 && waterNormalTex2) {
    waterNormalTex1.offset.x += 0.032 * delta;
    waterNormalTex1.offset.y += 0.020 * delta;
    waterNormalTex2.offset.x -= 0.022 * delta;
    waterNormalTex2.offset.y += 0.028 * delta;
  }

  if (towerRadarMesh) {
    towerRadarMesh.rotation.y += 1.6 * delta;
  }

  if (cloudInstMesh && cloudData.length > 0) {
    let idx = 0;
    for (let i = 0; i < cloudData.length; i++) {
      const c = cloudData[i];
      c.x += c.speed * delta;
      if (c.x > 1350) c.x = -1350;

      const cos = Math.cos(c.yaw);
      const sin = Math.sin(c.yaw);

      for (let p = 0; p < c.offsets.length; p++) {
        const off = c.offsets[p];
        const wx = c.x + (off.ox * cos - off.oz * sin) * c.scale;
        const wz = c.z + (off.ox * sin + off.oz * cos) * c.scale;

        cloudDummy.position.set(wx, c.y + off.oy * c.scale, wz);
        cloudDummy.rotation.set(0, c.yaw, 0);
        cloudDummy.scale.set(off.sx * c.scale, off.sy * c.scale, off.sz * c.scale);
        cloudDummy.updateMatrix();
        cloudInstMesh.setMatrixAt(idx++, cloudDummy.matrix);
      }
    }
    cloudInstMesh.instanceMatrix.needsUpdate = true;
  }
}

function createRunwayTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 128, 512);

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(8, 0, 4, 512);
  ctx.fillRect(116, 0, 4, 512);

  for (let x = 18; x <= 102; x += 12) {
    ctx.fillRect(x, 12, 6, 26);
    ctx.fillRect(x, 474, 6, 26);
  }

  for (let y = 56; y < 456; y += 36) {
    ctx.fillRect(61, y, 6, 20);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}
function createApronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d3542';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#1e242d';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, 68, 68);
  ctx.strokeRect(144, 144, 68, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(126, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}

function createHangarTextures() {
  const doorCanvas = document.createElement('canvas');
  doorCanvas.width = 256;
  doorCanvas.height = 128;
  const dCtx = doorCanvas.getContext('2d');

  dCtx.fillStyle = '#3b4656';
  dCtx.fillRect(0, 0, 256, 128);
  dCtx.fillStyle = '#1e293b';
  dCtx.fillRect(42, 24, 172, 104);

  dCtx.strokeStyle = '#64748b';
  dCtx.lineWidth = 2;
  for (let x = 64; x < 214; x += 22) {
    dCtx.beginPath(); dCtx.moveTo(x, 24); dCtx.lineTo(x, 128); dCtx.stroke();
  }

  dCtx.fillStyle = '#eab308';
  dCtx.fillRect(42, 18, 172, 6);

  const sideCanvas = document.createElement('canvas');
  sideCanvas.width = 256;
  sideCanvas.height = 128;
  const sCtx = sideCanvas.getContext('2d');

  sCtx.fillStyle = '#475569';
  sCtx.fillRect(0, 0, 256, 128);
  sCtx.fillStyle = '#334155';
  for (let x = 0; x < 256; x += 16) sCtx.fillRect(x, 0, 6, 128);
  sCtx.fillStyle = '#1e293b';
  sCtx.fillRect(0, 108, 256, 20);

  const doorTex = new THREE.CanvasTexture(doorCanvas);
  const sideTex = new THREE.CanvasTexture(sideCanvas);
  doorTex.anisotropy = 4;
  sideTex.anisotropy = 4;
  return { door: doorTex, side: sideTex };
}

function createControlTowerTexture() {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 128;
  diffCanvas.height = 256;
  const dCtx = diffCanvas.getContext('2d');

  const emisCanvas = document.createElement('canvas');
  emisCanvas.width = 128;
  emisCanvas.height = 256;
  const eCtx = emisCanvas.getContext('2d');

  dCtx.fillStyle = '#475569';
  dCtx.fillRect(0, 0, 128, 256);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 128, 256);

  dCtx.fillStyle = '#334155';
  for (let y = 0; y < 256; y += 32) {
    dCtx.fillRect(0, y, 128, 4);
  }

  for (let y = 44; y < 220; y += 64) {
    dCtx.fillStyle = '#0f172a';
    dCtx.fillRect(24, y, 80, 14);
    eCtx.fillStyle = '#38bdf8';
    eCtx.fillRect(26, y + 2, 76, 10);
  }

  return {
    diffuse: new THREE.CanvasTexture(diffCanvas),
    emissive: new THREE.CanvasTexture(emisCanvas)
  };
}
function createCityAvenueTexture() {
  const size = 1024;
  const cell = 256;
  const roadHalf = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#14181f';
  ctx.fillRect(0, 0, size, size);

  for (let gx = 0; gx < size; gx += cell) {
    for (let gy = 0; gy < size; gy += cell) {
      const bx = gx + roadHalf;
      const by = gy + roadHalf;
      const bw = cell - roadHalf * 2;
      const bh = cell - roadHalf * 2;

      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, by, bw, bh);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + 5, by + 5, bw - 10, bh - 10);

      const tx0 = bx + 7;
      const ty0 = by + 7;
      const tw = bw - 14;
      const th = bh - 14;
      const tilesCount = 16;
      const tileW = tw / tilesCount;
      const tileH = th / tilesCount;

      for (let r = 0; r < tilesCount; r++) {
        for (let c = 0; c < tilesCount; c++) {
          const px = tx0 + c * tileW;
          const py = ty0 + r * tileH;

          const checker = (r + c) % 2 === 0;
          ctx.fillStyle = checker ? '#4b586b' : '#434f61';
          ctx.fillRect(px, py, tileW, tileH);

          ctx.fillStyle = 'rgba(203, 213, 225, 0.14)';
          ctx.fillRect(px + 1, py + 1, tileW - 2, 1.5);
          ctx.fillRect(px + 1, py + 1, 1.5, tileH - 2);

          ctx.strokeStyle = '#262f3d';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileW - 1, tileH - 1);
        }
      }
    }
  }

  ctx.fillStyle = '#cbd5e1';
  for (let i = 0; i <= size; i += cell) {
    for (let b = 0; b < size; b += cell) {
      const crossPositions = [b + roadHalf + 4, b + cell - roadHalf - 16];
      for (let cp = 0; cp < crossPositions.length; cp++) {
        const pos = crossPositions[cp];
        for (let s = -roadHalf + 5; s <= roadHalf - 9; s += 8) {
          ctx.fillRect(i + s, pos, 4, 12);
          ctx.fillRect(pos, i + s, 12, 4);
        }
      }

      ctx.fillStyle = '#94a3b8';
      for (let d = b + roadHalf + 24; d < b + cell - roadHalf - 20; d += 22) {
        ctx.fillRect(i - 1.5, d, 3, 11);
        ctx.fillRect(d, i - 1.5, 11, 3);
      }
      ctx.fillStyle = '#cbd5e1';
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}

function createStreetLightEmissiveMap() {
  const size = 1024;
  const cell = 256;
  const roadHalf = 28;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  const drawGlow = (x, y) => {
    const grad = ctx.createRadialGradient(x, y, 2, x, y, 36);
    grad.addColorStop(0.0, 'rgba(254, 240, 138, 0.90)');
    grad.addColorStop(0.45, 'rgba(253, 224, 71, 0.38)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fill();
  };

  for (let gx = 0; gx < size; gx += cell) {
    for (let gy = 0; gy < size; gy += cell) {
      const midX = gx + cell * 0.5;
      const midY = gy + cell * 0.5;
      const offset = 50;

      drawGlow(gx + roadHalf - 10, midY - offset);
      drawGlow(gx + roadHalf - 10, midY + offset);
      drawGlow(gx + cell - roadHalf + 10, midY - offset);
      drawGlow(gx + cell - roadHalf + 10, midY + offset);

      drawGlow(midX - offset, gy + roadHalf - 10);
      drawGlow(midX + offset, gy + roadHalf - 10);
      drawGlow(midX - offset, gy + cell - roadHalf + 10);
      drawGlow(midX + offset, gy + cell - roadHalf + 10);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = 4;
  return tex;
}
function createBuildingFacadePair(baseHex, windowLitHex, cols, rows) {
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 256;
  diffCanvas.height = 512;
  const dCtx = diffCanvas.getContext('2d');

  const emisCanvas = document.createElement('canvas');
  emisCanvas.width = 256;
  emisCanvas.height = 512;
  const eCtx = emisCanvas.getContext('2d');

  dCtx.fillStyle = baseHex;
  dCtx.fillRect(0, 0, 256, 512);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, 256, 512);

  const padX = 14;
  const padY = 16;
  const cellW = (256 - padX * 2) / cols;
  const cellH = (512 - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = padX + c * cellW + 3;
      const wy = padY + r * cellH + 4;
      const ww = Math.max(4, cellW - 6);
      const wh = Math.max(4, cellH - 8);

      const hash = Math.abs(Math.sin((r * 31 + c * 17) * 12.9898) * 43758.5453) % 1;
      if (hash > 0.65) {
        dCtx.fillStyle = '#1e293b';
        eCtx.fillStyle = windowLitHex;
        eCtx.fillRect(wx, wy, ww, wh);
      } else if (hash > 0.30) {
        dCtx.fillStyle = '#0f172a';
      } else {
        dCtx.fillStyle = '#1e293b';
      }
      dCtx.fillRect(wx, wy, ww, wh);

      dCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      dCtx.fillRect(wx, wy, ww * 0.4, wh);
    }
  }

  dCtx.fillStyle = '#0f172a';
  dCtx.fillRect(0, 492, 256, 20);

  const diffuseTex = new THREE.CanvasTexture(diffCanvas);
  diffuseTex.anisotropy = 4;
  const emissiveTex = new THREE.CanvasTexture(emisCanvas);
  emissiveTex.anisotropy = 4;
  return { diffuse: diffuseTex, emissive: emissiveTex };
}

function createBuildingRoofTexture(hasHelipad) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 120, 120);

  if (hasHelipad) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(48, 44, 6, 40);
    ctx.fillRect(74, 44, 6, 40);
    ctx.fillRect(48, 61, 32, 6);
  } else {
    ctx.fillStyle = '#475569';
    ctx.fillRect(22, 24, 34, 26);
    ctx.fillRect(72, 74, 32, 28);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 24, 34, 26);
    ctx.strokeRect(72, 74, 32, 28);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function createBuildingMaterialSet(toonGradient) {
  nightEmissiveMaterials.length = 0;

  const pair1 = createBuildingFacadePair('#475569', '#fde047', 5, 12);
  const pair2 = createBuildingFacadePair('#3b4859', '#7dd3fc', 6, 16);
  const pair3 = createBuildingFacadePair('#52525b', '#fef08a', 4, 10);

  const roofStandard = createBuildingRoofTexture(false);
  const roofHelipad = createBuildingRoofTexture(true);

  const makeBoxMats = (pair, roofTex) => {
    const wallMat = new THREE.MeshToonMaterial({
      map: pair.diffuse,
      emissiveMap: pair.emissive,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.0,
      gradientMap: toonGradient
    });
    nightEmissiveMaterials.push(wallMat);

    return [
      wallMat, wallMat,
      new THREE.MeshToonMaterial({ map: roofTex, gradientMap: toonGradient }),
      new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: toonGradient }),
      wallMat, wallMat
    ];
  };

  return [
    makeBoxMats(pair1, roofStandard),
    makeBoxMats(pair2, roofHelipad),
    makeBoxMats(pair3, roofStandard)
  ];
}

function isInsideReservedSDF1Local(lx, lz) {
  return Math.abs(lx - SDF1_LOCAL_DOCK.x) < (SDF1_LOCAL_DOCK.width * 0.5 + 10) &&
         Math.abs(lz - SDF1_LOCAL_DOCK.z) < (SDF1_LOCAL_DOCK.length * 0.5 + 10);
}
function buildSDF1DockZone(complexGroup, toonGradient) {
  const dockGroup = new THREE.Group();
  dockGroup.position.set(SDF1_LOCAL_DOCK.x, 0.03, SDF1_LOCAL_DOCK.z);

  const padMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: toonGradient });
  const borderMat = new THREE.MeshToonMaterial({ color: 0x64748b, gradientMap: toonGradient });

  const padGeo = new THREE.PlaneGeometry(SDF1_LOCAL_DOCK.width, SDF1_LOCAL_DOCK.length);
  padGeo.rotateX(-Math.PI / 2);
  dockGroup.add(new THREE.Mesh(padGeo, padMat));

  const sideL = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, SDF1_LOCAL_DOCK.length), borderMat);
  sideL.position.set(-SDF1_LOCAL_DOCK.width * 0.5, 0.27, 0);
  const sideR = sideL.clone();
  sideR.position.x = SDF1_LOCAL_DOCK.width * 0.5;
  dockGroup.add(sideL, sideR);

  complexGroup.add(dockGroup);

  sdf1AnchorGroup = new THREE.Group();
  sdf1AnchorGroup.position.set(SDF1_LOCAL_DOCK.x, 0.04, SDF1_LOCAL_DOCK.z);
  complexGroup.add(sdf1AnchorGroup);

  loadSDF1Model();
}

function loadSDF1Model() {
  if (!sdf1AnchorGroup || typeof THREE.GLTFLoader !== 'function') return;

  const loader = new THREE.GLTFLoader();
  loader.load('./models/sdf1.glb', (gltf) => {
    const model = gltf.scene;
    model.visible = false;

    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (rawSize.x > rawSize.z * 1.25) {
      model.rotation.y = -Math.PI / 2;
    } else {
      model.rotation.y = Math.PI;
    }
    model.updateMatrixWorld(true);

    const orientedBox = new THREE.Box3().setFromObject(model);
    const orientedSize = orientedBox.getSize(new THREE.Vector3());
    const maxHoriz = Math.max(orientedSize.x, orientedSize.z);
    if (maxHoriz > 0) {
      const targetLength = 175;
      const scaleFactor = targetLength / maxHoriz;
      model.scale.set(scaleFactor, scaleFactor, scaleFactor);
      model.updateMatrixWorld(true);
    }

    const finalBox = new THREE.Box3().setFromObject(model);
    const finalCenter = finalBox.getCenter(new THREE.Vector3());
    const finalSize = finalBox.getSize(new THREE.Vector3());

    model.position.x -= finalCenter.x;
    model.position.z -= finalCenter.z;
    model.position.y -= finalBox.min.y;
    model.updateMatrixWorld(true);

    const cols = 12;
    const rows = 26;
    const minX = -finalSize.x * 0.5;
    const minZ = -finalSize.z * 0.5;
    const cellW = finalSize.x / cols;
    const cellD = finalSize.z / rows;

    const cellMaxY = new Float32Array(cols * rows);
    const cellMinY = new Float32Array(cols * rows);
    cellMaxY.fill(-1);
    cellMinY.fill(9999);

    const vTmp = new THREE.Vector3();
    model.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : new Array(child.material);
          mats.forEach((m) => { m.side = THREE.DoubleSide; });
        }

        const posAttr = child.geometry && child.geometry.attributes && child.geometry.attributes.position;
        if (posAttr) {
          for (let i = 0; i < posAttr.count; i += 4) {
            vTmp.fromBufferAttribute(posAttr, i).applyMatrix4(child.matrixWorld);
            const c = Math.min(cols - 1, Math.max(0, Math.floor((vTmp.x - minX) / cellW)));
            const r = Math.min(rows - 1, Math.max(0, Math.floor((vTmp.z - minZ) / cellD)));
            const idx = r * cols + c;
            if (vTmp.y > cellMaxY[idx]) cellMaxY[idx] = vTmp.y;
            if (vTmp.y < cellMinY[idx]) cellMinY[idx] = vTmp.y;
          }
        }
      }
    });

    sdf1AnchorGroup.add(model);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (cellMaxY[idx] <= 0.2) continue;

        const topY = cellMaxY[idx];
        const botY = Math.max(0, cellMinY[idx]);
        const h = Math.max(1.2, topY - botY);
        const midY = botY + h * 0.5;

        const localCellX = SDF1_LOCAL_DOCK.x + minX + (c + 0.5) * cellW;
        const localCellZ = SDF1_LOCAL_DOCK.z + minZ + (r + 0.5) * cellD;
        const wp = localToWorldXZ(localCellX, localCellZ);

        registerBoxCollider(
          wp.x, COMPLEX_CONFIG.groundY + midY, wp.z,
          cellW * 0.96, h, cellD * 0.96, COMPLEX_CONFIG.rotY
        );
      }
    }

    model.visible = true;
    try {
      if (typeof renderer !== 'undefined' && renderer && typeof camera !== 'undefined' && typeof scene !== 'undefined') {
        renderer.compile(model, camera, scene);
      }
    } catch (e) {}
  });
}

function buildStreetLights(complexGroup, toonGradient) {
  streetPointLights.length = 0;

  const poleMat = new THREE.MeshToonMaterial({ color: 0x334155, gradientMap: toonGradient });
  const bulbMat = new THREE.MeshToonMaterial({
    color: 0x94a3b8, emissive: new THREE.Color(0xfef08a), emissiveIntensity: 0.0, gradientMap: toonGradient
  });
  nightEmissiveMaterials.push(bulbMat);

  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 4.4, 6);
  poleGeo.translate(0, 2.2, 0);
  const armGeo = new THREE.BoxGeometry(1.1, 0.12, 0.12);
  armGeo.translate(0.45, 4.35, 0);
  const bulbGeo = new THREE.BoxGeometry(0.42, 0.16, 0.24);
  bulbGeo.translate(0.85, 4.25, 0);

  const placements = new Array();
  const blockStep = 28;
  const curbOffset = 10.6;

  for (let bx = -194; bx <= -54; bx += blockStep) {
    for (let bz = -28; bz <= 112; bz += blockStep) {
      const spots = [
        { lx: bx - curbOffset, lz: bz - 5.5, rotY: Math.PI },
        { lx: bx - curbOffset, lz: bz + 5.5, rotY: Math.PI },
        { lx: bx + curbOffset, lz: bz - 5.5, rotY: 0 },
        { lx: bx + curbOffset, lz: bz + 5.5, rotY: 0 },
        { lx: bx - 5.5, lz: bz - curbOffset, rotY: Math.PI / 2 },
        { lx: bx + 5.5, lz: bz - curbOffset, rotY: Math.PI / 2 },
        { lx: bx - 5.5, lz: bz + curbOffset, rotY: -Math.PI / 2 },
        { lx: bx + 5.5, lz: bz + curbOffset, rotY: -Math.PI / 2 }
      ];

      for (let i = 0; i < spots.length; i++) {
        const sp = spots[i];
        if (isInsideReservedSDF1Local(sp.lx, sp.lz)) continue;
        const wp = localToWorldXZ(sp.lx, sp.lz);
        if (getTerrainHeight(wp.x, wp.z) < 2.8) continue;
        placements.push(sp);
      }
    }
  }

  if (placements.length === 0) return;

  const instPoles = new THREE.InstancedMesh(poleGeo, poleMat, placements.length);
  const instArms = new THREE.InstancedMesh(armGeo, poleMat, placements.length);
  const instBulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, placements.length);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    dummy.position.set(p.lx, 0.02, p.lz);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();

    instPoles.setMatrixAt(i, dummy.matrix);
    instArms.setMatrixAt(i, dummy.matrix);
    instBulbs.setMatrixAt(i, dummy.matrix);
  }

  instPoles.instanceMatrix.needsUpdate = true;
  instArms.instanceMatrix.needsUpdate = true;
  instBulbs.instanceMatrix.needsUpdate = true;

  complexGroup.add(instPoles, instArms, instBulbs);

  const intersectionNodes = [
    { lx: -180, lz: -14 }, { lx: -124, lz: -14 }, { lx: -68, lz: -14 },
    { lx: -180, lz: 42 },  { lx: -124, lz: 42 },  { lx: -180, lz: 98 }
  ];

  for (let i = 0; i < intersectionNodes.length; i++) {
    const node = intersectionNodes[i];
    if (isInsideReservedSDF1Local(node.lx, node.lz)) continue;
    const pLight = new THREE.PointLight(0xfde047, 0.0, 34);
    pLight.position.set(node.lx, 5.2, node.lz);
    complexGroup.add(pLight);
    streetPointLights.push(pLight);
  }
}

function buildMacrossCityGrid(complexGroup, toonGradient) {
  const cityGroundGeo = new THREE.PlaneGeometry(168, 168);
  cityGroundGeo.rotateX(-Math.PI / 2);
  const cityGroundMat = new THREE.MeshToonMaterial({
    map: createCityAvenueTexture(),
    emissiveMap: createStreetLightEmissiveMap(),
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.0,
    gradientMap: toonGradient
  });
  nightEmissiveMaterials.push(cityGroundMat);

  const cityGround = new THREE.Mesh(cityGroundGeo, cityGroundMat);
  cityGround.position.set(-124, 0.02, 42);
  complexGroup.add(cityGround);

  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  bldgGeo.translate(0, 0.5, 0);
  const materialSets = createBuildingMaterialSet(toonGradient);

  const buckets = [new Array(), new Array(), new Array()];
  const dummy = new THREE.Object3D();

  const blockStep = 28;
  for (let bx = -194; bx <= -54; bx += blockStep) {
    for (let bz = -28; bz <= 112; bz += blockStep) {
      const subOffsets = [
        { ox: -5.2, oz: -5.2 }, { ox: 5.2, oz: -5.2 },
        { ox: -5.2, oz:  5.2 }, { ox: 5.2, oz:  5.2 }
      ];

      for (let s = 0; s < subOffsets.length; s++) {
        const lx = bx + subOffsets[s].ox;
        const lz = bz + subOffsets[s].oz;

        if (isInsideReservedSDF1Local(lx, lz)) continue;

        const worldPos = localToWorldXZ(lx, lz);
        if (getTerrainHeight(worldPos.x, worldPos.z) < 2.8) continue;

        const seed = Math.abs(Math.sin(lx * 17.13 + lz * 91.7) * 43758.5453) % 1;
        if (seed < 0.14) continue;

        const w = 6.2 + (seed * 2.4);
        const d = 6.2 + (((seed * 5) % 1) * 2.4);

        const distCore = Math.hypot(lx + 115, lz - 40);
        const coreFactor = Math.max(0.3, 1.0 - distCore / 95);
        const h = 3.5 + (seed * 18.0 * coreFactor);

        dummy.position.set(lx, 0.02, lz);
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();

        const matIndex = Math.floor(seed * 3) % 3;
        buckets[matIndex].push(dummy.matrix.clone());

        if (h > 6.5) {
          registerBoxCollider(worldPos.x, COMPLEX_CONFIG.groundY + h * 0.5, worldPos.z, w + 1.5, h, d + 1.5);
        }
      }
    }
  }

  for (let m = 0; m < 3; m++) {
    const list = buckets[m];
    if (list.length === 0) continue;
const instMesh = new THREE.InstancedMesh(bldgGeo, materialSets[m], list.length);
for (let i = 0; i < list.length; i++) instMesh.setMatrixAt(i, list[i]);
instMesh.instanceMatrix.needsUpdate = true;
complexGroup.add(instMesh);
}
buildStreetLights(complexGroup, toonGradient);
}
function buildNavalCarriers(scene, toonGradient) {
const hullMat = new THREE.MeshToonMaterial({ color: 0x334155, gradientMap: toonGradient });
const deckMat = new THREE.MeshToonMaterial({ color: 0x18181b, gradientMap: toonGradient });
const islandMat = new THREE.MeshToonMaterial({ color: 0x64748b, gradientMap: toonGradient });
const carriers = [
{ x: 105, z: 245, rotY: 0.45 },
{ x: 45,  z: 278, rotY: 0.45 }
];
carriers.forEach((c) => {
const ship = new THREE.Group();
const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 56), hullMat);
hull.position.y = 1.6;
const deck = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.6, 60), deckMat);
deck.position.y = 3.9;
const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.5, 7.5), islandMat);
bridge.position.set(5.2, 6.2, -4);
ship.add(hull, deck, bridge);
ship.position.set(c.x, -0.35, c.z);
ship.rotation.y = c.rotY;
scene.add(ship);
registerBoxCollider(c.x, 2.2, c.z, 15, 6.5, 60);
});
}
function buildAirbaseAndCity(scene, toonGradient) {
const complexGroup = new THREE.Group();
complexGroup.position.set(COMPLEX_CONFIG.centerX, COMPLEX_CONFIG.groundY, COMPLEX_CONFIG.centerZ);
complexGroup.rotation.y = COMPLEX_CONFIG.rotY;
scene.add(complexGroup);
const runwayTex = createRunwayTexture();
const runwayMat = new THREE.MeshToonMaterial({ map: runwayTex, gradientMap: toonGradient });
const rwyMain1 = new THREE.Mesh(new THREE.PlaneGeometry(14, 310).rotateX(-Math.PI / 2), runwayMat);
rwyMain1.position.set(-10, 0.04, -68);
rwyMain1.rotation.y = Math.PI / 2;
complexGroup.add(rwyMain1);
const rwyMain2 = new THREE.Mesh(new THREE.PlaneGeometry(11, 275).rotateX(-Math.PI / 2), runwayMat);
rwyMain2.position.set(-4, 0.03, -48);
rwyMain2.rotation.y = Math.PI / 2;
complexGroup.add(rwyMain2);
const taxiMat = new THREE.MeshToonMaterial({ color: 0x1e242d, gradientMap: toonGradient });
const taxiOffsets = [-95, -35, 35, 95];
for (let i = 0; i < taxiOffsets.length; i++) {
const taxi = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 32).rotateX(-Math.PI / 2), taxiMat);
taxi.position.set(taxiOffsets[i], 0.025, -52);
complexGroup.add(taxi);
}
const apronMat = new THREE.MeshToonMaterial({ map: createApronTexture(), gradientMap: toonGradient });
const apron = new THREE.Mesh(new THREE.PlaneGeometry(118, 125).rotateX(-Math.PI / 2), apronMat);
apron.position.set(86, 0.02, 24);
complexGroup.add(apron);
const hangarTexSet = createHangarTextures();
const hangarSideMat = new THREE.MeshToonMaterial({ map: hangarTexSet.side, gradientMap: toonGradient });
const hangarDoorMat = new THREE.MeshToonMaterial({ map: hangarTexSet.door, gradientMap: toonGradient });
const roofMat = new THREE.MeshToonMaterial({ map: createBuildingRoofTexture(false), gradientMap: toonGradient });
const hangarBoxMats = [hangarSideMat, hangarSideMat, roofMat, roofMat, hangarDoorMat, hangarDoorMat];
const beaconMat = new THREE.MeshToonMaterial({
color: 0xef4444, emissive: new THREE.Color(0xef4444), emissiveIntensity: 0.2, gradientMap: toonGradient
});
nightEmissiveMaterials.push(beaconMat);
for (let i = 0; i < 8; i++) {
const row = Math.floor(i / 4);
const col = i % 4;
const lx = 52 + col * 22;
const lz = -16 + row * 28;
if (isInsideReservedSDF1Local(lx, lz)) continue;
const hGroup = new THREE.Group();
const body = new THREE.Mesh(new THREE.BoxGeometry(12, 4.4, 16), hangarBoxMats);
body.position.y = 2.2;
const roof = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.8, 16.6), roofMat);
roof.position.y = 4.6;
const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), beaconMat);
beacon.position.set(0, 5.2, 7.6);
hGroup.add(body, roof, beacon);
hGroup.position.set(lx, 0, lz);
complexGroup.add(hGroup);
const wp = localToWorldXZ(lx, lz);
registerBoxCollider(wp.x, COMPLEX_CONFIG.groundY + 2.5, wp.z, 15, 5.2, 16);
}
const towerTexPair = createControlTowerTexture();
const towerBaseMat = new THREE.MeshToonMaterial({
map: towerTexPair.diffuse, emissiveMap: towerTexPair.emissive,
emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.0, gradientMap: toonGradient
});
nightEmissiveMaterials.push(towerBaseMat);
const towerBase = new THREE.Mesh(new THREE.BoxGeometry(4.5, 13, 4.5), towerBaseMat);
towerBase.position.set(38, 6.5, -24);
towerCabMat = new THREE.MeshToonMaterial({
color: 0x0284c7, emissive: new THREE.Color(0x38bdf8), emissiveIntensity: 0.35, gradientMap: toonGradient
});
const towerCab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.0, 6.5), towerCabMat);
towerCab.position.set(38, 14.2, -24);
const towerRoof = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.6, 7.0), roofMat);
towerRoof.position.set(38, 15.9, -24);
towerRadarMesh = new THREE.Mesh(
new THREE.BoxGeometry(3.8, 0.7, 0.4),
new THREE.MeshToonMaterial({ color: 0xe2e8f0, gradientMap: toonGradient })
);
towerRadarMesh.position.set(38, 16.9, -24);
complexGroup.add(towerBase, towerCab, towerRoof, towerRadarMesh);
const towerWp = localToWorldXZ(38, -24);
registerBoxCollider(towerWp.x, COMPLEX_CONFIG.groundY + 8.2, towerWp.z, 6.5, 16.4, 6.5);
const facilityMat = new THREE.MeshToonMaterial({ map: hangarTexSet.side, gradientMap: toonGradient });
const facilityMesh = new THREE.Mesh(new THREE.BoxGeometry(24, 6, 18), facilityMat);
facilityMesh.position.set(360, 14.0, -490);
scene.add(facilityMesh);
registerBoxCollider(360, 17.0, -490, 24, 6, 18);
buildSDF1DockZone(complexGroup, toonGradient);
buildMacrossCityGrid(complexGroup, toonGradient);
buildNavalCarriers(scene, toonGradient);
}
function buildSouthAtariaEnvironment(scene) {
const dynamicSky = initDynamicSkyTexture();
scene.background = dynamicSky;
scene.fog = new THREE.FogExp2(0x6b92a8, 0.00062);
const toonGradient = createAnimeToonGradient();
waterNormalTex1 = createWaterNormalTexture();
waterNormalTex2 = waterNormalTex1.clone();
waterNormalTex2.needsUpdate = true;
waterNormalTex2.repeat.set(48, 48);
const oceanGeo = new THREE.PlaneGeometry(5200, 5200);
oceanGeo.rotateX(-Math.PI / 2);
oceanMeshMat = new THREE.MeshStandardMaterial({
color: 0x0b3556,
roughness: 0.22,
metalness: 0.72,
normalMap: waterNormalTex1,
normalScale: new THREE.Vector2(0.45, 0.45),
envMap: dynamicSky,
envMapIntensity: 0.90
});
const ocean = new THREE.Mesh(oceanGeo, oceanMeshMat);
ocean.position.y = -0.35;
scene.add(ocean);
const size = 1480;
const segments = 250;
const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
terrainGeo.rotateX(-Math.PI / 2);
const posAttr = terrainGeo.attributes.position;
const colors = new Float32Array(posAttr.count * 3);
const cColor = new THREE.Color();
for (let i = 0; i < posAttr.count; i++) {
const vx = posAttr.getX(i);
const vz = posAttr.getZ(i);
const vy = getTerrainHeight(vx, vz);
posAttr.setY(i, vy);
const inMainCannonZone = (vx < -140 && vz < -160 && vx + vz * 0.45 > -480);
if (vy < 0.05) {
cColor.setHex(0x16536b);
} else if (vy < 1.65) {
cColor.setHex(0x6b6150);
} else if (inMainCannonZone && vy > 4.5) {
cColor.setHex(0x574e3d);
} else if (vy < 12.0) {
cColor.setHex(0x36472d);
} else if (vy < 26.0) {
cColor.setHex(0x2a3823);
} else {
cColor.setHex(0x4f483b);
}
colors[i * 3]     = cColor.r;
colors[i * 3 + 1] = cColor.g;
colors[i * 3 + 2] = cColor.b;
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();
const terrainMat = new THREE.MeshToonMaterial({
vertexColors: true,
gradientMap: toonGradient
});
const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
scene.add(terrainMesh);
buildAirbaseAndCity(scene, toonGradient);
buildSkyClouds(scene, toonGradient);
}
let activeMapId = 'MAPA_1';
let environmentGroup = null;
function clearCurrentEnvironment() {
structureColliders.length = 0;
nightEmissiveMaterials.length = 0;
streetPointLights.length = 0;
cloudData.length = 0;
lastSkyKey = '';
sdf1AnchorGroup = null;
cloudInstMesh = null;
towerRadarMesh = null;
towerCabMat = null;
oceanMeshMat = null;
if (environmentGroup) {
while (environmentGroup.children.length > 0) {
const child = environmentGroup.children[0];
environmentGroup.remove(child);
}
}
}
function switchEnvironmentMap(scene, mapId) {
if (!scene) return;
if (!environmentGroup) {
environmentGroup = new THREE.Group();
environmentGroup.name = 'EnvironmentMasterGroup';
scene.add(environmentGroup);
}
activeMapId = mapId || 'MAPA_1';
clearCurrentEnvironment();
const envTarget = {
add: (obj) => environmentGroup.add(obj),
remove: (obj) => environmentGroup.remove(obj),
set background(val) { scene.background = val; },
get background() { return scene.background; },
set fog(val) { scene.fog = val; },
get fog() { return scene.fog; }
};
if (activeMapId === 'MAPA_1') {
buildSouthAtariaEnvironment(envTarget);
} else if (activeMapId === 'MAPA_2') {
if (typeof buildSaturnOrbitEnvironment === 'function') {
buildSaturnOrbitEnvironment(scene, environmentGroup);
} else {
buildSouthAtariaEnvironment(envTarget);
}
} else if (activeMapId === 'MAPA_3') {
if (typeof buildMacrossInteriorEnvironment === 'function') {
buildMacrossInteriorEnvironment(scene, environmentGroup);
} else {
buildSouthAtariaEnvironment(envTarget);
}
}
if (typeof onEnvironmentMapChanged === 'function') {
onEnvironmentMapChanged(activeMapId);
}
}
