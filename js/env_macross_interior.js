const INTERIOR_CONFIG = {
  length: 960,
  roadWidth: 34,
  boulevardWidth: 3.2,
  sidewalkWidth: 38,
  upperDeckY: 14.0,
  upperDeckWidth: 260,
  bridgeInterval: 120,
  bridgeElevation: 3.2
};

function getInteriorTerrainHeight(x, z) {
  const halfGap = (INTERIOR_CONFIG.roadWidth * 0.5) + 7.0;
  const isOverUpperDeckXZ = (
    Math.abs(x) >= halfGap &&
    Math.abs(x) <= halfGap + INTERIOR_CONFIG.upperDeckWidth &&
    Math.abs(z) <= INTERIOR_CONFIG.length * 0.5
  );

  if (isOverUpperDeckXZ) {
    const currentY = (typeof playerContainer !== 'undefined' && playerContainer)
      ? playerContainer.position.y
      : 20.0;
    if (currentY >= INTERIOR_CONFIG.upperDeckY - 0.5) {
      return INTERIOR_CONFIG.upperDeckY;
    }
  }
  return 0.0;
}

function createInteriorAvenueTexture() {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0c1017';
  ctx.fillRect(0, 0, w, h);

  const glowPositions = new Array(170, 512, 850);
  for (let g = 0; g < glowPositions.length; g++) {
    const gy = glowPositions.at(g);
    const grad = ctx.createRadialGradient(w * 0.5, gy, 10, w * 0.5, gy, 210);
    grad.addColorStop(0.0, 'rgba(56, 189, 248, 0.14)');
    grad.addColorStop(0.5, 'rgba(250, 204, 21, 0.06)');
    grad.addColorStop(1.0, 'rgba(12, 16, 23, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, gy - 210, w, 420);
  }

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(10, 0, 5, h);
  ctx.fillRect(w - 15, 0, 5, h);

  const leftLaneDivider = Math.floor(w * 0.23);
  const rightLaneDivider = Math.floor(w * 0.77);
  for (let y = 20; y < h; y += 64) {
    ctx.fillRect(leftLaneDivider - 2, y, 4, 34);
    ctx.fillRect(rightLaneDivider - 2, y, 4, 34);
  }
  const drawRoadArrow = (cx, cy, dirY) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, dirY);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(14, -6);
    ctx.lineTo(5, -6);
    ctx.lineTo(5, 24);
    ctx.lineTo(-5, 24);
    ctx.lineTo(-5, -6);
    ctx.lineTo(-14, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const leftLaneOuter = w * 0.125;
  const leftLaneInner = w * 0.335;
  const rightLaneInner = w * 0.665;
  const rightLaneOuter = w * 0.875;
  const arrowYPositions = new Array(220, 520, 820);

  for (let i = 0; i < arrowYPositions.length; i++) {
    const ay = arrowYPositions.at(i);
    drawRoadArrow(leftLaneOuter, ay, 1);
    drawRoadArrow(leftLaneInner, ay, 1);
    drawRoadArrow(rightLaneInner, ay, -1);
    drawRoadArrow(rightLaneOuter, ay, -1);
  }

  ctx.fillStyle = '#f8fafc';
  for (let x = 22; x < w - 22; x += 24) {
    if (x > w * 0.43 && x < w * 0.57) continue;
    ctx.fillRect(x, 16, 13, 46);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, INTERIOR_CONFIG.length / INTERIOR_CONFIG.bridgeInterval);
  tex.anisotropy = 4;
  return tex;
}

function createOchreConcentricTileTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#18110b';
  ctx.fillRect(0, 0, size, size);

  const drawRosette = (cx, cy, maxR) => {
    const rings = new Array(
      { rIn: maxR * 0.74, rOut: maxR * 0.98, count: 20 },
      { rIn: maxR * 0.50, rOut: maxR * 0.72, count: 16 },
      { rIn: maxR * 0.25, rOut: maxR * 0.48, count: 14 }
    );

    for (let r = 0; r < rings.length; r++) {
      const ring = rings.at(r);
      const step = (Math.PI * 2) / ring.count;
      const gap = 0.022;

      for (let i = 0; i < ring.count; i++) {
        const a0 = i * step + gap;
        const a1 = (i + 1) * step - gap;

        ctx.beginPath();
        ctx.arc(cx, cy, ring.rOut, a0, a1);
        ctx.arc(cx, cy, ring.rIn, a1, a0, true);
        ctx.closePath();

        ctx.fillStyle = '#cf8942';
        ctx.fill();
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#eab070';
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.23, 0, Math.PI * 2);
    ctx.fillStyle = '#cf8942';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#eab070';
    ctx.stroke();
  };

  const cornerR = size * 0.34;
  drawRosette(0, 0, cornerR);
  drawRosette(size, 0, cornerR);
  drawRosette(0, size, cornerR);
  drawRosette(size, size, cornerR);
  drawRosette(size * 0.5, size * 0.5, size * 0.44);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
function createBrushedMetalTexture(baseHex, lineHex) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = baseHex || '#3a424d';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const shade = (Math.sin(y * 13.7) * 0.5 + 0.5) * 14;
    ctx.fillStyle = `rgba(255, 255, 255, ${shade / 255})`;
    ctx.fillRect(0, y, size, 1);
  }

  ctx.strokeStyle = lineHex || '#1e242b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.5);
  ctx.lineTo(size, size * 0.5);
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function createStorefrontTextures() {
  const shopConfigs = new Array(
    { name: 'FASHION // BOUTIQUE', neon: '#f472b6', bg: '#2e1026', windowBg: '#fce7f3', accent: '#ec4899', type: 'CLOTHES' },
    { name: 'ARCADE // GAME CENTER', neon: '#38bdf8', bg: '#082038', windowBg: '#0c4a6e', accent: '#22d3ee', type: 'ARCADE' },
    { name: 'CAFE // STARLIGHT', neon: '#fbbf24', bg: '#291a0a', windowBg: '#fef3c7', accent: '#f59e0b', type: 'CAFE' },
    { name: 'NYAN-NYAN // RAMEN', neon: '#4ade80', bg: '#0a2615', windowBg: '#dcfce7', accent: '#22c55e', type: 'RESTAURANT' }
  );

  const results = new Array();

  for (let i = 0; i < shopConfigs.length; i++) {
    const cfg = shopConfigs.at(i);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = cfg.bg;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(24, 14, 464, 46);
    ctx.strokeStyle = cfg.neon;
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 14, 464, 46);

    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = cfg.neon;
    ctx.textAlign = 'center';
    ctx.fillText(cfg.name, 256, 45);

    ctx.fillStyle = cfg.windowBg;
    ctx.fillRect(30, 74, 310, 152);
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(30, 74, 310, 152);

    if (cfg.type === 'CLOTHES') {
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(75, 110, 36, 85);
      ctx.fillRect(155, 105, 42, 95);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(240, 115, 38, 80);
    } else if (cfg.type === 'ARCADE') {
      for (let m = 0; m < 4; m++) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(48 + m * 70, 115, 52, 105);
        ctx.fillStyle = (m % 2 === 0) ? '#38bdf8' : '#f472b6';
        ctx.fillRect(54 + m * 70, 128, 40, 32);
      }
    } else {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(48, 175, 274, 16);
      ctx.fillStyle = cfg.accent;
      ctx.beginPath();
      ctx.arc(110, 145, 22, 0, Math.PI * 2);
      ctx.arc(240, 145, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(364, 74, 116, 178);
    ctx.fillStyle = cfg.neon;
    ctx.globalAlpha = 0.45;
    ctx.fillRect(374, 84, 96, 158);
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    results.push({ tex: tex, neonHex: cfg.neon });
  }

  return results;
}
function buildAvenueAndSidewalks(targetGroup, toonGradient) {
  const len = INTERIOR_CONFIG.length;
  const roadW = INTERIOR_CONFIG.roadWidth;
  const swW = INTERIOR_CONFIG.sidewalkWidth;

  const roadTex = createInteriorAvenueTexture();
  const roadGeo = new THREE.PlaneGeometry(roadW, len);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    emissiveMap: roadTex,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.25
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.position.set(0, 0.01, 0);
  targetGroup.add(roadMesh);

  const blvW = INTERIOR_CONFIG.boulevardWidth;
  const blvGeo = new THREE.BoxGeometry(blvW, 0.32, len);
  const blvMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
  const blvMesh = new THREE.Mesh(blvGeo, blvMat);
  blvMesh.position.set(0, 0.16, 0);
  targetGroup.add(blvMesh);

  const soilGeo = new THREE.PlaneGeometry(blvW - 0.7, len - 2);
  soilGeo.rotateX(-Math.PI / 2);
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x1e3a1e, roughness: 0.9 });
  const soilMesh = new THREE.Mesh(soilGeo, soilMat);
  soilMesh.position.set(0, 0.33, 0);
  targetGroup.add(soilMesh);

  const bushGeo = new THREE.IcosahedronGeometry(0.95, 1);
  bushGeo.scale(1.1, 0.78, 1.35);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x2f6b27, roughness: 0.8 });

  const bushPositions = new Array();
  for (let z = -len * 0.5 + 10; z <= len * 0.5 - 10; z += 5.5) {
    const mod = ((z % INTERIOR_CONFIG.bridgeInterval) + INTERIOR_CONFIG.bridgeInterval) % INTERIOR_CONFIG.bridgeInterval;
    if (mod < 9 || mod > INTERIOR_CONFIG.bridgeInterval - 9) continue;
    bushPositions.push(z);
  }

  if (bushPositions.length > 0) {
    const bushInst = new THREE.InstancedMesh(bushGeo, bushMat, bushPositions.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bushPositions.length; i++) {
      const s = 0.85 + Math.abs(Math.sin(i * 19.3)) * 0.45;
      dummy.position.set(0, 0.68, bushPositions.at(i));
      dummy.rotation.set(0, i * 1.1, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      bushInst.setMatrixAt(i, dummy.matrix);
    }
    bushInst.instanceMatrix.needsUpdate = true;
    targetGroup.add(bushInst);
  }

  const lampPoleGeo = new THREE.CylinderGeometry(0.14, 0.2, 6.2, 6);
  lampPoleGeo.translate(0, 3.1, 0);
  const lampHeadGeo = new THREE.BoxGeometry(1.6, 0.28, 0.45);
  lampHeadGeo.translate(0.65, 6.15, 0);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const lampSpots = new Array();
  for (let z = -len * 0.5 + 24; z <= len * 0.5 - 24; z += 36) {
    lampSpots.push({ x: -(roadW * 0.5 + 1.2), z: z, rotY: 0 });
    lampSpots.push({ x: (roadW * 0.5 + 1.2), z: z, rotY: Math.PI });
  }

  if (lampSpots.length > 0) {
    const instPoles = new THREE.InstancedMesh(lampPoleGeo, poleMat, lampSpots.length);
    const instHeads = new THREE.InstancedMesh(lampHeadGeo, lampGlowMat, lampSpots.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < lampSpots.length; i++) {
      const sp = lampSpots.at(i);
      dummy.position.set(sp.x, 0.08, sp.z);
      dummy.rotation.set(0, sp.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instPoles.setMatrixAt(i, dummy.matrix);
      instHeads.setMatrixAt(i, dummy.matrix);
    }
    instPoles.instanceMatrix.needsUpdate = true;
    instHeads.instanceMatrix.needsUpdate = true;
    targetGroup.add(instPoles, instHeads);
  }

  for (let z = -360; z <= 360; z += 180) {
    const streetLight = new THREE.PointLight(0xfde68a, 2.2, 65);
    streetLight.position.set(0, 8.5, z);
    targetGroup.add(streetLight);
  }

  const ochreTex = createOchreConcentricTileTexture();
  ochreTex.repeat.set(4, Math.round(len / 9.5));
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: ochreTex,
    emissiveMap: ochreTex,
    emissive: new THREE.Color(0xd9934c),
    emissiveIntensity: 0.22,
    roughness: 0.65
  });

  const swGeo = new THREE.PlaneGeometry(swW, len);
  swGeo.rotateX(-Math.PI / 2);

  const leftSw = new THREE.Mesh(swGeo, sidewalkMat);
  leftSw.position.set(-(roadW * 0.5 + swW * 0.5), 0.08, 0);

  const rightSw = new THREE.Mesh(swGeo, sidewalkMat);
  rightSw.position.set(roadW * 0.5 + swW * 0.5, 0.08, 0);

  targetGroup.add(leftSw, rightSw);
}
function buildUpperCityDecksAndShops(targetGroup) {
  const len = INTERIOR_CONFIG.length;
  const deckY = INTERIOR_CONFIG.upperDeckY;
  const deckW = INTERIOR_CONFIG.upperDeckWidth;
  const innerEdgeX = (INTERIOR_CONFIG.roadWidth * 0.5) + 7.0;
  const centerOffsetX = innerEdgeX + deckW * 0.5;

  const deckMetalTex = createBrushedMetalTexture('#3b434e', '#1c2128');
  deckMetalTex.repeat.set(32, Math.round(len / 8));

  const topMat = new THREE.MeshStandardMaterial({
    map: deckMetalTex,
    color: 0x7c8796,
    roughness: 0.68,
    metalness: 0.45
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: deckMetalTex,
    color: 0x525d6b,
    roughness: 0.72,
    metalness: 0.40
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.62,
    metalness: 0.52
  });
  const slabMats = new Array(trimMat, trimMat, topMat, wallMat, trimMat, trimMat);

  const storeTextures = createStorefrontTextures();
  const storeMats = new Array();
  for (let st = 0; st < storeTextures.length; st++) {
    const item = storeTextures.at(st);
    storeMats.push(new THREE.MeshBasicMaterial({ map: item.tex }));
  }

  const sides = new Array(-1, 1);
  for (let s = 0; s < sides.length; s++) {
    const sign = sides.at(s);
    const cx = sign * centerOffsetX;

    const slabGeo = new THREE.BoxGeometry(deckW, 1.4, len);
    const slabMesh = new THREE.Mesh(slabGeo, slabMats);
    slabMesh.position.set(cx, deckY - 0.7, 0);
    targetGroup.add(slabMesh);

    const wallX = sign * (INTERIOR_CONFIG.roadWidth * 0.5 + INTERIOR_CONFIG.sidewalkWidth);
    const supportWall = new THREE.Mesh(new THREE.BoxGeometry(2.5, deckY - 1.4, len), wallMat);
    supportWall.position.set(wallX, (deckY - 1.4) * 0.5, 0);
    targetGroup.add(supportWall);

    const colGeo = new THREE.BoxGeometry(1.6, deckY - 1.4, 1.6);
    const colPositions = new Array();
    for (let z = -len * 0.5 + 15; z <= len * 0.5 - 15; z += 30) {
      colPositions.push(z);
    }
    const colInst = new THREE.InstancedMesh(colGeo, trimMat, colPositions.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < colPositions.length; i++) {
      dummy.position.set(sign * (innerEdgeX + 1.5), (deckY - 1.4) * 0.5, colPositions.at(i));
      dummy.updateMatrix();
      colInst.setMatrixAt(i, dummy.matrix);
    }
    colInst.instanceMatrix.needsUpdate = true;
    targetGroup.add(colInst);

    const shopFrontX = sign * (wallX * sign - 1.5);
    const shopGeo = new THREE.PlaneGeometry(25.5, 9.8);
    let shopCounter = s;

    for (let z = -len * 0.5 + 30; z <= len * 0.5 - 30; z += 30) {
      const mat = storeMats.at(shopCounter % storeMats.length);
      shopCounter++;
      const shopMesh = new THREE.Mesh(shopGeo, mat);
      shopMesh.position.set(shopFrontX, 5.2, z);
      shopMesh.rotation.y = sign < 0 ? (Math.PI / 2) : (-Math.PI / 2);
      targetGroup.add(shopMesh);
    }

    if (typeof registerBoxCollider === 'function') {
      registerBoxCollider(cx, deckY - 0.7, 0, deckW, 1.4, len, 0);
      registerBoxCollider(wallX, (deckY - 1.4) * 0.5, 0, 2.5, deckY - 1.4, len, 0);
    }
  }
}
function buildStraightBridgesWithStairs(targetGroup) {
  const len = INTERIOR_CONFIG.length;
  const interval = INTERIOR_CONFIG.bridgeInterval;
  const deckY = INTERIOR_CONFIG.upperDeckY;
  const elev = INTERIOR_CONFIG.bridgeElevation;
  const bridgeTopY = deckY + elev;

  const innerEdgeX = (INTERIOR_CONFIG.roadWidth * 0.5) + 7.0;
  const spanWidth = innerEdgeX * 2;
  const bridgeDepth = 8.5;

  const bridgeMetalTex = createBrushedMetalTexture('#454f5c', '#1c2128');
  bridgeMetalTex.repeat.set(6, 2);

  const bridgeMat = new THREE.MeshStandardMaterial({
    map: bridgeMetalTex,
    color: 0x8c97a6,
    roughness: 0.64,
    metalness: 0.48
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x525d6b,
    roughness: 0.58,
    metalness: 0.55
  });
  const stairMat = new THREE.MeshStandardMaterial({
    map: bridgeMetalTex,
    color: 0x737e8c,
    roughness: 0.70,
    metalness: 0.42
  });

  const stairHypotenuse = Math.hypot(elev, elev);

  for (let z = -len * 0.5 + interval; z <= len * 0.5 - interval; z += interval) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 0, z);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 0.85, bridgeDepth), bridgeMat);
    deck.position.set(0, bridgeTopY - 0.425, 0);
    bridgeGroup.add(deck);

    const railN = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 1.1, 0.35), railMat);
    railN.position.set(0, bridgeTopY + 0.55, -bridgeDepth * 0.5 + 0.2);
    const railS = railN.clone();
    railS.position.z = bridgeDepth * 0.5 - 0.2;
    bridgeGroup.add(railN, railS);

    if (typeof registerBoxCollider === 'function') {
      registerBoxCollider(0, bridgeTopY - 0.425, z, spanWidth, 0.85, bridgeDepth, 0);
    }

    const ends = new Array(-1, 1);
    for (let e = 0; e < ends.length; e++) {
      const sign = ends.at(e);
      const stairX = sign * (innerEdgeX + elev * 0.5);
      const stairY = deckY + elev * 0.5;

      const ramp = new THREE.Mesh(new THREE.BoxGeometry(stairHypotenuse, 0.55, bridgeDepth - 0.6), stairMat);
      ramp.position.set(stairX, stairY - 0.2, 0);
      ramp.rotation.z = sign * (-Math.PI / 4);
      bridgeGroup.add(ramp);

      const stepsCount = 8;
      for (let st = 0; st < stepsCount; st++) {
        const t = (st + 0.5) / stepsCount;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(elev / stepsCount, 0.35, bridgeDepth - 0.8),
          bridgeMat
        );
        stepMesh.position.set(
          sign * (innerEdgeX + t * elev),
          bridgeTopY - t * elev,
          0
        );
        bridgeGroup.add(stepMesh);
      }

      if (typeof registerBoxCollider === 'function') {
        registerBoxCollider(stairX, stairY - 0.2, z, elev, elev * 0.6, bridgeDepth - 0.6, 0);
      }
    }

    targetGroup.add(bridgeGroup);
  }
}
let auditoriumLaserGroup = null;

function buildOpenDomeAuditorium(targetGroup) {
  const deckY = INTERIOR_CONFIG.upperDeckY;
  const audX = 118;
  const audZ = -20;

  const audGroup = new THREE.Group();
  audGroup.position.set(audX, deckY, audZ);

  const plazaGeo = new THREE.CylinderGeometry(54, 56, 0.5, 48);
  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
  plazaMesh.position.y = 0.25;
  audGroup.add(plazaMesh);

  const shellGeo = new THREE.SphereGeometry(
    48,
    24,
    18,
    Math.PI * 0.28,
    Math.PI * 1.48,
    Math.PI * 0.14,
    Math.PI * 0.42
  );
  const shellOuterMat = new THREE.MeshStandardMaterial({
    color: 0x262320,
    roughness: 0.55,
    metalness: 0.45,
    flatShading: true,
    side: THREE.FrontSide
  });
  const shellInnerMat = new THREE.MeshBasicMaterial({
    color: 0xbe185d,
    side: THREE.BackSide
  });

  const shellOuter = new THREE.Mesh(shellGeo, shellOuterMat);
  shellOuter.position.y = -4.0;
  const shellInner = new THREE.Mesh(shellGeo, shellInnerMat);
  shellInner.position.y = -4.0;
  shellInner.scale.set(0.985, 0.985, 0.985);
  audGroup.add(shellOuter, shellInner);

  for (let t = 0; t < 4; t++) {
    const rOuter = 44 - t * 4.5;
    const rInner = rOuter - 4.2;
    const h = 7.5 - t * 1.6;
    const tierGeo = new THREE.CylinderGeometry(rOuter, rOuter, h, 36, 1, true);
    const tierMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const tierMesh = new THREE.Mesh(tierGeo, tierMat);
    tierMesh.position.y = h * 0.5;
    audGroup.add(tierMesh);

    const stepCapGeo = new THREE.RingGeometry(rInner, rOuter, 36);
    stepCapGeo.rotateX(-Math.PI / 2);
    const stepCap = new THREE.Mesh(stepCapGeo, tierMat);
    stepCap.position.y = h;
    audGroup.add(stepCap);
  }

  const stageGeo = new THREE.CylinderGeometry(18, 20, 1.2, 36);
  const stageMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const stageMesh = new THREE.Mesh(stageGeo, stageMat);
  stageMesh.position.set(-10, 0.8, 0);
  audGroup.add(stageMesh);

  const stageLight = new THREE.PointLight(0xf43f5e, 3.5, 75);
  stageLight.position.set(-8, 12, 0);
  audGroup.add(stageLight);

  auditoriumLaserGroup = new THREE.Group();
  const cyanLaserMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.92
  });
  const pinkLaserMat = new THREE.MeshBasicMaterial({
    color: 0xfb7185,
    transparent: true,
    opacity: 0.90
  });

  const laserEndpoints = new Array(
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(34, 9, 14), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(36, 10, 4), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(32, 11, -12), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(14, 15, -34), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(-2, 16, -38), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(-14, 6, 32), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(-4, 6, 34), mat: cyanLaserMat },
    { p1: new THREE.Vector3(-18, 16, -8), p2: new THREE.Vector3(-24, 5, 24), mat: pinkLaserMat },
    { p1: new THREE.Vector3(12, 18, -22), p2: new THREE.Vector3(-22, 8, 18), mat: cyanLaserMat }
  );

  for (let l = 0; l < laserEndpoints.length; l++) {
    const item = laserEndpoints.at(l);
    const dist = item.p1.distanceTo(item.p2);
    const beamGeo = new THREE.CylinderGeometry(0.14, 0.14, dist, 6);
    beamGeo.rotateX(Math.PI / 2);
    const beamMesh = new THREE.Mesh(beamGeo, item.mat);
    beamMesh.position.copy(item.p1).lerp(item.p2, 0.5);
    beamMesh.lookAt(item.p2);
    auditoriumLaserGroup.add(beamMesh);
  }
  audGroup.add(auditoriumLaserGroup);

  targetGroup.add(audGroup);

  if (typeof registerBoxCollider === 'function') {
    registerBoxCollider(audX, deckY + 6.0, audZ, 90, 12, 90, 0);
  }
}
function buildInteriorParks(targetGroup) {
  const deckY = INTERIOR_CONFIG.upperDeckY;

  const parks = new Array(
    { x: -108, z: -180, w: 68, d: 84 },
    { x: -108, z: 180,  w: 68, d: 84 },
    { x: 118,  z: -210, w: 68, d: 84 },
    { x: 118,  z: 190,  w: 68, d: 84 }
  );

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x1e4620,
    emissive: new THREE.Color(0x0f2912),
    emissiveIntensity: 0.45,
    roughness: 0.85
  });
  const pathMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.18,
    roughness: 0.6
  });
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 3.2, 6);
  trunkGeo.translate(0, 1.6, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3b281e, roughness: 0.9 });

  const crownGeo = new THREE.IcosahedronGeometry(2.4, 1);
  crownGeo.scale(1.0, 0.85, 1.0);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a5e23, roughness: 0.8 });

  const treeCoords = new Array();

  for (let p = 0; p < parks.length; p++) {
    const pk = parks.at(p);

    const lawn = new THREE.Mesh(new THREE.BoxGeometry(pk.w, 0.35, pk.d), grassMat);
    lawn.position.set(pk.x, deckY + 0.175, pk.z);
    targetGroup.add(lawn);

    const pathX = new THREE.Mesh(new THREE.BoxGeometry(pk.w - 4, 0.4, 4.5), pathMat);
    pathX.position.set(pk.x, deckY + 0.2, pk.z);
    const pathZ = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, pk.d - 4), pathMat);
    pathZ.position.set(pk.x, deckY + 0.2, pk.z);
    targetGroup.add(pathX, pathZ);

    const pond = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.45, 24), waterMat);
    pond.position.set(pk.x, deckY + 0.23, pk.z);
    targetGroup.add(pond);

    for (let tx = pk.x - pk.w * 0.42; tx <= pk.x + pk.w * 0.42; tx += 11) {
      for (let tz = pk.z - pk.d * 0.42; tz <= pk.z + pk.d * 0.42; tz += 11) {
        if (Math.abs(tx - pk.x) < 8 || Math.abs(tz - pk.z) < 8) continue;
        treeCoords.push({ x: tx, z: tz });
      }
    }
  }

  if (treeCoords.length > 0) {
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCoords.length);
    const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCoords.length);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < treeCoords.length; i++) {
      const tc = treeCoords.at(i);
      const s = 0.85 + Math.abs(Math.sin(i * 7.1)) * 0.45;

      dummy.position.set(tc.x, deckY + 0.3, tc.z);
      dummy.rotation.set(0, i * 0.9, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tc.x, deckY + 0.3 + 3.4 * s, tc.z);
      dummy.scale.set(s, s * 1.1, s);
      dummy.updateMatrix();
      crownInst.setMatrixAt(i, dummy.matrix);
    }

    trunkInst.instanceMatrix.needsUpdate = true;
    crownInst.instanceMatrix.needsUpdate = true;
    targetGroup.add(trunkInst, crownInst);
  }
}
function buildInteriorCityBuildings(targetGroup) {
  const deckY = INTERIOR_CONFIG.upperDeckY;
  const len = INTERIOR_CONFIG.length;

  const pairGold = (typeof createBuildingFacadePair === 'function')
    ? createBuildingFacadePair('#1e293b', '#fde047', 6, 15)
    : null;
  const pairCyan = (typeof createBuildingFacadePair === 'function')
    ? createBuildingFacadePair('#0f172a', '#38bdf8', 6, 18)
    : null;
  const pairPink = (typeof createBuildingFacadePair === 'function')
    ? createBuildingFacadePair('#1e1b2e', '#f472b6', 5, 13)
    : null;

  const roofTex = (typeof createBuildingRoofTexture === 'function')
    ? createBuildingRoofTexture(true)
    : null;

  const makeMatSet = (pair, fallbackHex) => {
    const wall = new THREE.MeshStandardMaterial({
      map: pair ? pair.diffuse : null,
      emissiveMap: pair ? pair.emissive : null,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: pair ? 1.45 : 0.6,
      color: pair ? 0xffffff : fallbackHex,
      roughness: 0.5
    });
    const roof = new THREE.MeshStandardMaterial({
      map: roofTex,
      color: 0x475569,
      roughness: 0.6
    });
    return new Array(wall, wall, roof, roof, wall, wall);
  };

  const matSets = new Array(
    makeMatSet(pairGold, 0x334155),
    makeMatSet(pairCyan, 0x1e293b),
    makeMatSet(pairPink, 0x2e1065)
  );

  const buckets = new Array(new Array(), new Array(), new Array());
  const dummy = new THREE.Object3D();

  const sides = new Array(-1, 1);
  for (let s = 0; s < sides.length; s++) {
    const sign = sides.at(s);

    for (let bx = 48; bx <= 230; bx += 34) {
      for (let bz = -len * 0.5 + 36; bz <= len * 0.5 - 36; bz += 34) {
        const wx = sign * bx;
        const wz = bz;

        if (Math.hypot(wx - 118, wz - (-20)) < 66) continue;
        if (Math.abs(wx - (-108)) < 38 && Math.abs(Math.abs(wz) - 180) < 46) continue;
        if (Math.abs(wx - 118) < 38 && (Math.abs(wz - (-210)) < 46 || Math.abs(wz - 190) < 46)) continue;

        const seed = Math.abs(Math.sin(wx * 13.7 + wz * 41.3) * 43758.5453) % 1;
        if (seed < 0.10) continue;

        const w = 13 + seed * 6;
        const d = 13 + ((seed * 3) % 1) * 6;
        const h = 16 + seed * 40;

        dummy.position.set(wx, deckY, wz);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();

        const idx = Math.floor(seed * 3) % 3;
        buckets.at(idx).push(dummy.matrix.clone());

        if (typeof registerBoxCollider === 'function') {
          registerBoxCollider(wx, deckY + h * 0.5, wz, w, h, d, 0);
        }
      }
    }
  }

  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  bldgGeo.translate(0, 0.5, 0);

  for (let m = 0; m < 3; m++) {
    const list = buckets.at(m);
    if (list.length === 0) continue;
    const inst = new THREE.InstancedMesh(bldgGeo, matSets.at(m), list.length);
    for (let i = 0; i < list.length; i++) {
      inst.setMatrixAt(i, list.at(i));
    }
    inst.instanceMatrix.needsUpdate = true;
    targetGroup.add(inst);
  }
}
const vaultVideoElements = new Array();
const spaceWindowExplosions = new Array();
let spaceWindowExpGroup = null;
const spaceExpFrames = new Array();

function createEngineHullWallTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#141922';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#090c12';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.strokeRect(4, size * 0.5, size - 8, size * 0.5 - 4);

  ctx.fillStyle = '#283242';
  ctx.fillRect(36, 0, 22, size);
  ctx.fillRect(72, 0, 14, size);
  ctx.fillRect(0, 140, size, 18);
  ctx.fillRect(0, 390, size, 24);

  ctx.fillStyle = '#475569';
  ctx.fillRect(42, 0, 5, size);
  ctx.fillRect(0, 144, size, 4);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(180, 60, 120, 64);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.strokeRect(180, 60, 120, 64);

  const ledColors = new Array('#38bdf8', '#facc15', '#22c55e', '#f43f5e');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = ledColors.at(i % ledColors.length);
    ctx.fillRect(194 + i * 12, 82, 6, 18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function buildSDF1EngineVault(targetGroup) {
  const halfW = 288;
  const halfL = INTERIOR_CONFIG.length * 0.5;
  const ceilingY = 148;

  const hullTex = createEngineHullWallTexture();
  hullTex.repeat.set(16, 4);

  const wallMat = new THREE.MeshStandardMaterial({
    map: hullTex,
    emissiveMap: hullTex,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.28,
    roughness: 0.65,
    metalness: 0.55
  });

  const ceilTex = createBrushedMetalTexture('#1a202c', '#0b0f17');
  ceilTex.repeat.set(24, 36);
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex,
    emissive: new THREE.Color(0x0f172a),
    emissiveIntensity: 0.35,
    roughness: 0.6,
    metalness: 0.6
  });

  const ceilGeo = new THREE.PlaneGeometry(halfW * 2, halfL * 2);
  ceilGeo.rotateX(Math.PI / 2);
  const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
  ceilMesh.position.set(0, ceilingY, 0);
  targetGroup.add(ceilMesh);

  const wallNSGeo = new THREE.PlaneGeometry(halfW * 2, ceilingY);
  const wallN = new THREE.Mesh(wallNSGeo, wallMat);
  wallN.position.set(0, ceilingY * 0.5, -halfL);

  const wallS = new THREE.Mesh(wallNSGeo, wallMat);
  wallS.position.set(0, ceilingY * 0.5, halfL);
  wallS.rotation.y = Math.PI;

  const wallWGeo = new THREE.PlaneGeometry(halfL * 2, ceilingY);
  const wallW = new THREE.Mesh(wallWGeo, wallMat);
  wallW.position.set(-halfW, ceilingY * 0.5, 0);
  wallW.rotation.y = Math.PI / 2;

  targetGroup.add(wallN, wallS, wallW);

  const ribMat = new THREE.MeshStandardMaterial({ color: 0x26303d, roughness: 0.55, metalness: 0.65 });
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.75 });

  const ribZList = new Array();
  for (let z = -halfL + 40; z <= halfL - 40; z += 60) {
    ribZList.push(z);
  }

  const sideRibGeo = new THREE.BoxGeometry(5.5, ceilingY, 4.5);
  const topBeamGeo = new THREE.BoxGeometry(halfW * 2, 5.0, 4.5);
  const pipeGeo = new THREE.CylinderGeometry(1.4, 1.4, ceilingY, 10);

  const instRibW = new THREE.InstancedMesh(sideRibGeo, ribMat, ribZList.length);
  const instRibE = new THREE.InstancedMesh(sideRibGeo, ribMat, ribZList.length);
  const instTopBeam = new THREE.InstancedMesh(topBeamGeo, ribMat, ribZList.length);
  const instPipes = new THREE.InstancedMesh(pipeGeo, pipeMat, ribZList.length * 2);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < ribZList.length; i++) {
    const z = ribZList.at(i);

    dummy.position.set(-halfW + 2.5, ceilingY * 0.5, z);
    dummy.updateMatrix();
    instRibW.setMatrixAt(i, dummy.matrix);

    dummy.position.set(halfW - 2.5, ceilingY * 0.5, z);
    dummy.updateMatrix();
    instRibE.setMatrixAt(i, dummy.matrix);

    dummy.position.set(0, ceilingY - 2.5, z);
    dummy.updateMatrix();
    instTopBeam.setMatrixAt(i, dummy.matrix);

    dummy.position.set(-halfW + 5.8, ceilingY * 0.5, z + 6);
    dummy.updateMatrix();
    instPipes.setMatrixAt(i * 2, dummy.matrix);

    dummy.position.set(-halfW + 5.8, ceilingY * 0.5, z + 10);
    dummy.updateMatrix();
    instPipes.setMatrixAt(i * 2 + 1, dummy.matrix);
  }

  instRibW.instanceMatrix.needsUpdate = true;
  instRibE.instanceMatrix.needsUpdate = true;
  instTopBeam.instanceMatrix.needsUpdate = true;
  instPipes.instanceMatrix.needsUpdate = true;
  targetGroup.add(instRibW, instRibE, instTopBeam, instPipes);

  if (typeof registerBoxCollider === 'function') {
    registerBoxCollider(0, ceilingY + 2, 0, halfW * 2, 4, halfL * 2, 0);
    registerBoxCollider(0, ceilingY * 0.5, -halfL - 2, halfW * 2, ceilingY, 4, 0);
    registerBoxCollider(0, ceilingY * 0.5, halfL + 2, halfW * 2, ceilingY, 4, 0);
    registerBoxCollider(-halfW - 2, ceilingY * 0.5, 0, 4, ceilingY, halfL * 2, 0);
    registerBoxCollider(halfW + 2, ceilingY * 0.5, 0, 4, ceilingY, halfL * 2, 0);
  }
}
function createScreenFallbackTexture(screenIdx) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');

  const palettes = new Array(
    { bg: '#1e1b4b', accent: '#f472b6', title: 'MINMAY LIVE // DYRL FEED 01' },
    { bg: '#082f49', accent: '#38bdf8', title: 'SDF-1 MACROSS // STAGE CAM 02' },
    { bg: '#2e1065', accent: '#fde047', title: 'UN SPACY // BROADCAST 03' }
  );
  const p = palettes.at(screenIdx % palettes.length);

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, 512, 288);

  const grad = ctx.createRadialGradient(256, 144, 15, 256, 144, 220);
  grad.addColorStop(0.0, p.accent);
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 288);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 260);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(p.title, 256, 150);

  return new THREE.CanvasTexture(canvas);
}

function buildVerticalGiantMonitors(targetGroup) {
  for (let v = 0; v < vaultVideoElements.length; v++) {
    const oldVid = vaultVideoElements.at(v);
    oldVid.pause();
    oldVid.removeAttribute('src');
    oldVid.load();
  }
  vaultVideoElements.length = 0;

  const towerGroup = new THREE.Group();
  towerGroup.position.set(-281, 0, 0);

  const towerFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });
  const towerBack = new THREE.Mesh(new THREE.BoxGeometry(6, 136, 76), towerFrameMat);
  towerBack.position.set(-2.5, 68, 0);
  towerGroup.add(towerBack);

  const neonSideColors = new Array(0xf472b6, 0x38bdf8, 0xfacc15, 0x4ade80);
  for (let s = 0; s < 10; s++) {
    const signMat = new THREE.MeshBasicMaterial({ color: neonSideColors.at(s % neonSideColors.length) });
    const signL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.5, 3.2), signMat);
    signL.position.set(1.2, 22 + s * 11, -37.5);
    const signR = signL.clone();
    signR.position.z = 37.5;
    towerGroup.add(signL, signR);
  }

  const screenW = 64;
  const screenH = 36;
  const videoFiles = new Array('./videos/dyrl1.mp4', './videos/dyrl2.mp4', './videos/dyrl3.mp4');
  const yCenters = new Array(34, 72, 110);

  for (let i = 0; i < 3; i++) {
    const fallbackTex = createScreenFallbackTexture(i);
    const screenMat = new THREE.MeshBasicMaterial({ map: fallbackTex });

    const video = document.createElement('video');
    video.src = videoFiles.at(i);
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadeddata', () => {
      const vidTex = new THREE.VideoTexture(video);
      vidTex.minFilter = THREE.LinearFilter;
      vidTex.magFilter = THREE.LinearFilter;
      screenMat.map = vidTex;
      screenMat.needsUpdate = true;
      video.play().catch(() => {});
    });

    video.load();
    vaultVideoElements.push(video);

    const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(1.2, yCenters.at(i), 0);
    screenMesh.rotation.y = Math.PI / 2;
    towerGroup.add(screenMesh);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, screenW + 2), towerFrameMat);
    bezel.position.set(1.0, yCenters.at(i) - screenH * 0.5 - 0.9, 0);
    towerGroup.add(bezel);
  }

  targetGroup.add(towerGroup);
}
function buildSpaceBattleWindow(targetGroup) {
  spaceWindowExplosions.length = 0;
  spaceExpFrames.length = 0;

  const loader = new THREE.TextureLoader();
  for (let i = 1; i <= 10; i++) {
    spaceExpFrames.push(loader.load('./textures/exp' + i + '.webp'));
  }

  const winGroup = new THREE.Group();
  winGroup.position.set(288, 0, 0);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.65 });
  const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(4, 24, 960), frameMat);
  lowerWall.position.set(0, 12, 0);
  const upperWall = new THREE.Mesh(new THREE.BoxGeometry(4, 24, 960), frameMat);
  upperWall.position.set(0, 136, 0);
  winGroup.add(lowerWall, upperWall);

  for (let z = -420; z <= 420; z += 70) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(3.5, 100, 3.2), frameMat);
    mullion.position.set(0, 74, z);
    winGroup.add(mullion);
  }

  const glassGeo = new THREE.PlaneGeometry(840, 100);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.14,
    roughness: 0.12,
    metalness: 0.1,
    reflectivity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(-0.5, 74, 0);
  glassMesh.rotation.y = -Math.PI / 2;
  winGroup.add(glassMesh);

  const spaceBackGeo = new THREE.PlaneGeometry(1400, 520);
  const spaceBackMat = new THREE.MeshBasicMaterial({ color: 0x010206, fog: false });
  const spaceBack = new THREE.Mesh(spaceBackGeo, spaceBackMat);
  spaceBack.position.set(520, 90, 0);
  spaceBack.rotation.y = -Math.PI / 2;
  winGroup.add(spaceBack);

  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let s = 0; s < starCount; s++) {
    starPos[s * 3]     = 45 + Math.random() * 440;
    starPos[s * 3 + 1] = -40 + Math.random() * 280;
    starPos[s * 3 + 2] = (Math.random() - 0.5) * 1250;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, transparent: false, fog: false });
  winGroup.add(new THREE.Points(starGeo, starMat));

  spaceWindowExpGroup = new THREE.Group();
  winGroup.add(spaceWindowExpGroup);

  targetGroup.add(winGroup);
}

let nextSpaceExpTimer = 0.2;
const spaceExpGeo = new THREE.PlaneGeometry(1, 1);

function updateSpaceBattleWindow(delta) {
  if (!spaceWindowExpGroup || spaceExpFrames.length === 0) return;

  nextSpaceExpTimer -= delta;
  if (nextSpaceExpTimer <= 0 && spaceWindowExplosions.length < 18) {
    nextSpaceExpTimer = 0.25 + Math.random() * 0.55;

    const depthX = 35 + Math.random() * 390;
    const posY = 15 + Math.random() * 145;
    const posZ = (Math.random() - 0.5) * 860;
    const scale = 14 + (depthX / 420) * 42 + Math.random() * 14;

    const mat = new THREE.MeshBasicMaterial({
      map: spaceExpFrames.at(0),
      transparent: true,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(spaceExpGeo, mat);
    mesh.position.set(depthX, posY, posZ);
    mesh.rotation.y = -Math.PI / 2;
    mesh.scale.set(scale, scale, 1);
    spaceWindowExpGroup.add(mesh);

    const dur = 0.55 + Math.random() * 0.35;
    spaceWindowExplosions.push({ mesh: mesh, mat: mat, life: dur, maxLife: dur });
  }

  for (let i = spaceWindowExplosions.length - 1; i >= 0; i--) {
    const ex = spaceWindowExplosions.at(i);
    ex.life -= delta;
    const progress = 1.0 - Math.max(0, ex.life / ex.maxLife);
    const frameIdx = Math.min(spaceExpFrames.length - 1, Math.floor(progress * spaceExpFrames.length));
    ex.mat.map = spaceExpFrames.at(frameIdx);

    if (ex.life <= 0) {
      spaceWindowExpGroup.remove(ex.mesh);
      ex.mat.dispose();
      spaceWindowExplosions.splice(i, 1);
    }
  }
}

function buildMacrossInteriorEnvironment(scene, targetGroup) {
  scene.background = new THREE.Color(0x030712);
  scene.fog = new THREE.FogExp2(0x060d1f, 0.00095);

  if (typeof dirLight !== 'undefined' && dirLight) {
    dirLight.position.set(80, 220, 60);
    dirLight.color.setHex(0x93c5fd);
    dirLight.intensity = 0.55;
  }
  if (typeof ambientLight !== 'undefined' && ambientLight) {
    ambientLight.color.setHex(0x1e293b);
    ambientLight.intensity = 0.42;
  }
  if (typeof hemiLight !== 'undefined' && hemiLight) {
    hemiLight.color.setHex(0x38bdf8);
    hemiLight.groundColor.setHex(0x0f172a);
    hemiLight.intensity = 0.38;
  }

  const toonGradient = (typeof createAnimeToonGradient === 'function')
    ? createAnimeToonGradient()
    : null;

  buildAvenueAndSidewalks(targetGroup, toonGradient);
  buildUpperCityDecksAndShops(targetGroup);
  buildStraightBridgesWithStairs(targetGroup);
  buildOpenDomeAuditorium(targetGroup);
  buildInteriorParks(targetGroup);
  buildInteriorCityBuildings(targetGroup);
  buildSDF1EngineVault(targetGroup);
  buildVerticalGiantMonitors(targetGroup);
  buildSpaceBattleWindow(targetGroup);
}

function updateInteriorEnvironment(delta) {
  if (auditoriumLaserGroup) {
    auditoriumLaserGroup.rotation.y += 0.12 * delta;
  }
  updateSpaceBattleWindow(delta);
}
