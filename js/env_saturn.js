let saturnPlanetGroup = null;
let saturnRingInstMesh = null;
let saturnDustPoints = null;
let saturnStarsPoints = null;
const saturnRingAsteroids = [];

function createSpaceStarfield(targetGroup) {
  const starCount = 2600;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const c = new THREE.Color();

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const radius = 1650 + Math.random() * 450;

    positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    const tint = Math.random();
    const brightness = 0.45 + Math.random() * 0.55;
    if (tint < 0.25) {
      c.setRGB(0.75 * brightness, 0.88 * brightness, 1.0 * brightness);
    } else if (tint < 0.45) {
      c.setRGB(1.0 * brightness, 0.94 * brightness, 0.80 * brightness);
    } else {
      c.setRGB(brightness, brightness, brightness);
    }

    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starMat = new THREE.PointsMaterial({
    size: 3.2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: false,
    depthWrite: true,
    fog: false
  });

  saturnStarsPoints = new THREE.Points(starGeo, starMat);
  targetGroup.add(saturnStarsPoints);
}

function buildProceduralSaturnRings(targetGroup, planetCenter) {
  saturnRingAsteroids.length = 0;

  const rockGeo = new THREE.DodecahedronGeometry(1.0, 0);
  const posAttr = rockGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const jitter = 0.78 + Math.abs(Math.sin(vx * 12.7 + vy * 7.3 + vz * 5.1)) * 0.45;
    posAttr.setXYZ(i, vx * jitter, vy * jitter * 0.65, vz * jitter);
  }
  rockGeo.computeVertexNormals();

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.88,
    metalness: 0.05,
    flatShading: true
  });
  const totalFragments = 3200;
  saturnRingInstMesh = new THREE.InstancedMesh(rockGeo, ringMat, totalFragments);
  saturnRingInstMesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const bands = [
    { rMin: 560,  rMax: 730,  weight: 0.25, palette: [0x64748b, 0x7c8ea6, 0x94a3b8] },
    { rMin: 745,  rMax: 1020, weight: 0.48, palette: [0xcbd5e1, 0x93c5fd, 0xd6cfc2] },
    { rMin: 1060, rMax: 1320, weight: 0.27, palette: [0x94a3b8, 0x60a5fa, 0x9ca3af] }
  ];

  for (let i = 0; i < totalFragments; i++) {
    const roll = Math.random();
    let chosenBand = bands[1];
    if (roll < bands[0].weight) chosenBand = bands[0];
    else if (roll > bands[0].weight + bands[1].weight) chosenBand = bands[2];

    const radius = chosenBand.rMin + Math.random() * (chosenBand.rMax - chosenBand.rMin);
    const arcSpread = (Math.random() < 0.78)
      ? (Math.PI * 0.5 + (Math.random() - 0.5) * 1.35)
      : (Math.random() * Math.PI * 2);

    const thicknessY = (Math.random() - 0.5) * 52;
    const lx = Math.cos(arcSpread) * radius;
    const lz = Math.sin(arcSpread) * radius;

    const tiltAngle = 0.14;
    const wx = planetCenter.x + lx;
    const wy = planetCenter.y + thicknessY - (lz - 900) * Math.sin(tiltAngle);
    const wz = planetCenter.z + lz * Math.cos(tiltAngle);

    if (Math.hypot(wx - 0, wy - 38, wz - 120) < 28) continue;
    const isLargeRock = (Math.random() < 0.04 && Math.hypot(wx, wz - 120) < 360);
    const sx = isLargeRock ? (5.5 + Math.random() * 5.5) : (0.55 + Math.random() * 2.1);
    const sy = sx * (0.55 + Math.random() * 0.45);
    const sz = sx * (0.7 + Math.random() * 0.5);

    const rotX = Math.random() * Math.PI * 2;
    const rotY = Math.random() * Math.PI * 2;
    const rotZ = Math.random() * Math.PI * 2;

    dummy.position.set(wx, wy, wz);
    dummy.rotation.set(rotX, rotY, rotZ);
    dummy.scale.set(sx, sy, sz);
    dummy.updateMatrix();

    saturnRingInstMesh.setMatrixAt(i, dummy.matrix);

    const hex = chosenBand.palette[Math.floor(Math.random() * chosenBand.palette.length)];
    color.setHex(hex);
    saturnRingInstMesh.setColorAt(i, color);

    if (isLargeRock && typeof registerBoxCollider === 'function') {
      registerBoxCollider(wx, wy, wz, sx * 1.4, sy * 1.4, sz * 1.4, rotY);
    }

    saturnRingAsteroids.push({
      radius: radius,
      angle: arcSpread,
      yOffset: thicknessY,
      speed: (0.004 + Math.random() * 0.002) * (850 / radius),
      sx: sx, sy: sy, sz: sz,
      rotX: rotX, rotY: rotY, rotZ: rotZ,
      rotSpeed: (Math.random() - 0.5) * 0.35,
      isStaticCollider: isLargeRock,
      wx: wx, wy: wy, wz: wz
    });
  }

  saturnRingInstMesh.instanceMatrix.needsUpdate = true;
  if (saturnRingInstMesh.instanceColor) saturnRingInstMesh.instanceColor.needsUpdate = true;
  targetGroup.add(saturnRingInstMesh);
}
function buildSaturnRingDustLayer(targetGroup, planetCenter) {
  const dustCount = 9500;
  const positions = new Float32Array(dustCount * 3);
  const colors = new Float32Array(dustCount * 3);
  const c = new THREE.Color();
  const tiltAngle = 0.14;
  const cosTilt = Math.cos(tiltAngle);
  const sinTilt = Math.sin(tiltAngle);

  for (let i = 0; i < dustCount; i++) {
    // Distribuido en las bandas del anillo (560 a 1320)
    const radius = 560 + Math.random() * 760;
    const angle = (Math.random() < 0.80)
      ? (Math.PI * 0.5 + (Math.random() - 0.5) * 1.45)
      : (Math.random() * Math.PI * 2);

    // Mitad por encima del cinturón de hielo (+26 a +44) y mitad por debajo (-26 a -44)
    const layerSign = (i % 2 === 0) ? 1 : -1;
    const yOffset = layerSign * (26 + Math.random() * 18);

    const lx = Math.cos(angle) * radius;
    const lz = Math.sin(angle) * radius;

    const wx = planetCenter.x + lx;
    const wy = planetCenter.y + yOffset - (lz - 900) * sinTilt;
    const wz = planetCenter.z + lz * cosTilt;

    positions[i * 3]     = wx;
    positions[i * 3 + 1] = wy;
    positions[i * 3 + 2] = wz;

    // Tonos grises y azul pálido apagados para simular polvo fino sin brillo excesivo
    const shade = 0.28 + Math.random() * 0.25;
    c.setRGB(shade * 0.88, shade * 0.94, shade * 1.05);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Opaco (transparent: false, depthWrite: true) para respetar el orden Z de thrusters y verniers
  const dustMat = new THREE.PointsMaterial({
    size: 0.45,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: false,
    depthWrite: true,
    fog: true
  });

  saturnDustPoints = new THREE.Points(dustGeo, dustMat);
  targetGroup.add(saturnDustPoints);
}
function loadSaturnPlanetModel(targetGroup, planetCenter) {
  saturnPlanetGroup = new THREE.Group();
  saturnPlanetGroup.position.copy(planetCenter);
  saturnPlanetGroup.rotation.z = THREE.MathUtils.degToRad(24.0);
  saturnPlanetGroup.rotation.x = 0.14;
  targetGroup.add(saturnPlanetGroup);

  const texLoader = new THREE.TextureLoader();
  const saturnTex = texLoader.load('./textures/saturn.webp');
  saturnTex.anisotropy = 4;

  const sphereGeo = new THREE.SphereGeometry(380, 96, 64);
  const sphereMat = new THREE.MeshStandardMaterial({
    map: saturnTex,
    roughness: 0.85,
    metalness: 0.04,
    fog: false
  });

  const planetMesh = new THREE.Mesh(sphereGeo, sphereMat);
  saturnPlanetGroup.add(planetMesh);
}
const saturnDummy = new THREE.Object3D();
const SATURN_CENTER = new THREE.Vector3(-60, 45, -780);

function buildSaturnOrbitEnvironment(scene, targetGroup) {
  scene.background = new THREE.Color(0x010308);
  scene.fog = new THREE.FogExp2(0x020612, 0.00032);

  if (typeof dirLight !== 'undefined' && dirLight) {
    dirLight.position.set(480, 160, 180);
    dirLight.color.setHex(0xfff7ed);
    dirLight.intensity = 1.45;
  }
  if (typeof ambientLight !== 'undefined' && ambientLight) {
    ambientLight.color.setHex(0x1e293b);
    ambientLight.intensity = 0.24;
  }
  if (typeof hemiLight !== 'undefined' && hemiLight) {
    hemiLight.color.setHex(0x38bdf8);
    hemiLight.groundColor.setHex(0x02040a);
    hemiLight.intensity = 0.22;
  }

  createSpaceStarfield(targetGroup);
  loadSaturnPlanetModel(targetGroup, SATURN_CENTER);
  buildProceduralSaturnRings(targetGroup, SATURN_CENTER);
  buildSaturnRingDustLayer(targetGroup, SATURN_CENTER);
}
function updateSaturnEnvironment(delta) {
  if (saturnPlanetGroup) {
    saturnPlanetGroup.rotation.y += 0.012 * delta;
  }

  if (saturnRingInstMesh && saturnRingAsteroids.length > 0) {
    const tiltAngle = 0.14;
    const cosTilt = Math.cos(tiltAngle);
    const sinTilt = Math.sin(tiltAngle);

    for (let i = 0; i < saturnRingAsteroids.length; i++) {
      const a = saturnRingAsteroids[i];
      if (a.isStaticCollider) continue;

      a.angle += a.speed * delta;
      a.rotX += a.rotSpeed * delta;
      a.rotY += a.rotSpeed * delta;

      const lx = Math.cos(a.angle) * a.radius;
      const lz = Math.sin(a.angle) * a.radius;

      const wx = SATURN_CENTER.x + lx;
      const wy = SATURN_CENTER.y + a.yOffset - (lz - 900) * sinTilt;
      const wz = SATURN_CENTER.z + lz * cosTilt;

      saturnDummy.position.set(wx, wy, wz);
      saturnDummy.rotation.set(a.rotX, a.rotY, a.rotZ);
      saturnDummy.scale.set(a.sx, a.sy, a.sz);
      saturnDummy.updateMatrix();
      saturnRingInstMesh.setMatrixAt(i, saturnDummy.matrix);
    }
    saturnRingInstMesh.instanceMatrix.needsUpdate = true;
  }
}
