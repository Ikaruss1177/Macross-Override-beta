const hudCanvas = document.getElementById('hudCanvas');
const hudCtx = hudCanvas.getContext('2d');

function resizeHudCanvas() {
  hudCanvas.width = Math.round(window.visualViewport?.width || window.innerWidth);
  hudCanvas.height = Math.round(window.visualViewport?.height || window.innerHeight);
}
resizeHudCanvas();

function drawDYRLEnemyHexagon(sx, sy, radius, distNum, subNum) {
  hudCtx.save();
  hudCtx.translate(sx, sy);

  hudCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  hudCtx.shadowBlur = 5;

  hudCtx.strokeStyle = '#ffffff';
  hudCtx.lineWidth = 2.2;
  hudCtx.lineCap = 'round';
  hudCtx.lineJoin = 'round';

  const r = radius;
  const p0 = { x: Math.cos(0) * r, y: Math.sin(0) * r };
  const p1 = { x: Math.cos(Math.PI / 3) * r, y: Math.sin(Math.PI / 3) * r };
  const p2 = { x: Math.cos((2 * Math.PI) / 3) * r, y: Math.sin((2 * Math.PI) / 3) * r };
  const p3 = { x: Math.cos(Math.PI) * r, y: Math.sin(Math.PI) * r };
  const p4 = { x: Math.cos((4 * Math.PI) / 3) * r, y: Math.sin((4 * Math.PI) / 3) * r };
  const p5 = { x: Math.cos((5 * Math.PI) / 3) * r, y: Math.sin((5 * Math.PI) / 3) * r };

  hudCtx.beginPath();
  hudCtx.moveTo(p0.x, p0.y);
  hudCtx.lineTo(p1.x, p1.y);
  hudCtx.lineTo(p2.x, p2.y);
  hudCtx.lineTo(p3.x, p3.y);
  hudCtx.lineTo(p4.x, p4.y);
  hudCtx.lineTo(p5.x, p5.y);
  hudCtx.closePath();
  hudCtx.stroke();

  hudCtx.beginPath();
  hudCtx.moveTo(-r * 1.85, p4.y);
  hudCtx.lineTo(-r * 1.25, p4.y);
  hudCtx.stroke();

  const rad40 = (40 * Math.PI) / 180;
  const stemLen = r * 1.15;
  const hookLen = r * 0.52;

  const stemEndX = p1.x + Math.sin(rad40) * stemLen;
  const stemEndY = p1.y + Math.cos(rad40) * stemLen;
  const hookEndX = stemEndX - Math.cos(rad40) * hookLen;
  const hookEndY = stemEndY + Math.sin(rad40) * hookLen;

  hudCtx.beginPath();
  hudCtx.moveTo(p1.x, p1.y);
  hudCtx.lineTo(stemEndX, stemEndY);
  hudCtx.lineTo(hookEndX, hookEndY);
  hudCtx.stroke();

  hudCtx.font = 'bold 10px Conthrax, sans-serif';
  hudCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  hudCtx.fillText(String(distNum), r * 1.18, r * 0.08);
  hudCtx.fillText(String(subNum), r * 0.85, r * 0.95);
  hudCtx.restore();
}

function drawSeekerBrackets(sx, sy, spreadOffset, isLocked, enemyId, lockIndex) {
  const color = isLocked ? '#ef4444' : '#ffffff';
  const innerX = 27 + spreadOffset;
  const halfH = 18 + spreadOffset * 0.5;
  const tip45 = 9;

  hudCtx.save();
  hudCtx.translate(sx, sy);

  hudCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  hudCtx.shadowBlur = 6;

  hudCtx.strokeStyle = color;
  hudCtx.lineWidth = isLocked ? 3.2 : 2.6;
  hudCtx.lineCap = 'round';
  hudCtx.lineJoin = 'round';

  hudCtx.beginPath();
  hudCtx.moveTo(-innerX + tip45, -halfH - tip45);
  hudCtx.lineTo(-innerX, -halfH);
  hudCtx.lineTo(-innerX, halfH);
  hudCtx.lineTo(-innerX + tip45, halfH + tip45);
  hudCtx.stroke();

  hudCtx.beginPath();
  hudCtx.moveTo(innerX - tip45, -halfH - tip45);
  hudCtx.lineTo(innerX, -halfH);
  hudCtx.lineTo(innerX, halfH);
  hudCtx.lineTo(innerX - tip45, halfH + tip45);
  hudCtx.stroke();

  hudCtx.font = 'bold 9px Conthrax, sans-serif';
  hudCtx.fillStyle = color;
  const statusLabel = isLocked ? ('LOCK-' + lockIndex + ' // ' + enemyId) : ('SCAN // ' + enemyId);
  hudCtx.fillText(statusLabel, -innerX, -halfH - tip45 - 6);
  hudCtx.restore();
}
function drawEnemyMissileMarkers(w, h, camera, playerContainer) {
  if (typeof enemyMissiles === 'undefined' || enemyMissiles.length === 0) return;

  const projVec = new THREE.Vector3();
  const blink = (Math.floor(performance.now() / 110) % 2 === 0);

  for (let i = 0; i < enemyMissiles.length; i++) {
    const em = enemyMissiles[i];
    projVec.copy(em.mesh.position).project(camera);
    if (projVec.z > 1) continue;

    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-(projVec.y * 0.5) + 0.5) * h;
    if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) continue;

    const dist = em.mesh.position.distanceTo(playerContainer.position);
    const isDangerClose = dist < 26;
    const circleColor = isDangerClose ? (blink ? '#ef4444' : '#fca5a5') : '#ffffff';
    const radius = isDangerClose ? 13 : 10;

    hudCtx.save();
    hudCtx.translate(sx, sy);

    hudCtx.shadowColor = isDangerClose ? 'rgba(239, 68, 68, 0.95)' : 'rgba(0, 0, 0, 0.95)';
    hudCtx.shadowBlur = isDangerClose ? 8 : 5;

    hudCtx.strokeStyle = circleColor;
    hudCtx.lineWidth = isDangerClose ? 2.6 : 2.0;
    hudCtx.beginPath();
    hudCtx.arc(0, 0, radius, 0, Math.PI * 2);
    hudCtx.stroke();

    hudCtx.font = 'bold 8.5px Conthrax, sans-serif';
    hudCtx.fillStyle = circleColor;
    hudCtx.fillText(isDangerClose ? 'WARN' : 'MSL', radius + 5, 3);

    hudCtx.restore();
  }
}

function drawBattroidTrackReticle(w, h, camera) {
  if (typeof currentMode === 'undefined' || currentMode !== 'BATTROID') return;
  if (typeof battroidTrackMode === 'undefined' || battroidTrackMode === 'NONE') return;
  if (typeof battroidTrackedTarget === 'undefined' || !battroidTrackedTarget || !battroidTrackedTarget.mesh) return;

  const projVec = new THREE.Vector3().copy(battroidTrackedTarget.mesh.position).project(camera);
  if (projVec.z > 1) return;

  const sx = (projVec.x * 0.5 + 0.5) * w;
  const sy = (-(projVec.y * 0.5) + 0.5) * h;
  const r = 24;

  hudCtx.save();
  hudCtx.translate(sx, sy);
  hudCtx.shadowColor = 'rgba(250, 204, 21, 0.9)';
  hudCtx.shadowBlur = 8;
  hudCtx.strokeStyle = '#facc15';
  hudCtx.lineWidth = 2.0;

  hudCtx.beginPath();
  hudCtx.moveTo(0, -r);
  hudCtx.lineTo(r, 0);
  hudCtx.lineTo(0, r);
  hudCtx.lineTo(-r, 0);
  hudCtx.closePath();
  hudCtx.stroke();

  hudCtx.font = 'bold 8.5px Conthrax, sans-serif';
  hudCtx.fillStyle = '#facc15';
  hudCtx.fillText('AUTO // ' + battroidTrackMode, -r, r + 13);
  hudCtx.restore();
}
function drawWeaponStatusPanel(w) {
  const boxW = 295;
  const boxH = 196;
  const x = w - boxW - 15;
  const y = 15;
  const cut = 10;

  const hp = (typeof playerArmor !== 'undefined') ? playerArmor : 100;
  const maxHp = (typeof playerMaxArmor !== 'undefined') ? playerMaxArmor : 100;
  const dmgFlash = (typeof armorDamageFlash !== 'undefined') ? armorDamageFlash : 0;
  const armorRatio = Math.max(0, Math.min(1, hp / maxHp));

  hudCtx.save();

  hudCtx.beginPath();
  hudCtx.moveTo(x + cut, y);
  hudCtx.lineTo(x + boxW, y);
  hudCtx.lineTo(x + boxW, y + boxH - cut);
  hudCtx.lineTo(x + boxW - cut, y + boxH);
  hudCtx.lineTo(x, y + boxH);
  hudCtx.lineTo(x, y + cut);
  hudCtx.closePath();

  hudCtx.fillStyle = dmgFlash > 0 ? 'rgba(127, 29, 29, 0.88)' : 'rgba(6, 12, 24, 0.84)';
  hudCtx.fill();

  const frameColor = (dmgFlash > 0 || armorRatio <= 0.25) ? '#ef4444' : '#38bdf8';
  hudCtx.shadowColor = frameColor;
  hudCtx.shadowBlur = dmgFlash > 0 ? 14 : 8;
  hudCtx.strokeStyle = frameColor;
  hudCtx.lineWidth = 1.6;
  hudCtx.stroke();

  hudCtx.shadowBlur = 0;
  hudCtx.font = 'bold 9.5px Conthrax, sans-serif';
  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('ARMOR', x + 14, y + 22);

  let armorColor = '#22c55e';
  let armorTag = Math.round(armorRatio * 100) + '% // OK';
  if (armorRatio <= 0.25) {
    armorColor = '#ef4444';
    armorTag = Math.round(armorRatio * 100) + '% // CRITICAL';
  } else if (armorRatio <= 0.55) {
    armorColor = '#f59e0b';
    armorTag = Math.round(armorRatio * 100) + '% // DAMAGED';
  }

  hudCtx.shadowColor = armorColor;
  hudCtx.shadowBlur = 6;
  hudCtx.fillStyle = armorColor;
  hudCtx.fillText(armorTag, x + 135, y + 22);

  const barX = x + 14;
  const barY = y + 29;
  const barW = boxW - 28;
  const barH = 11;

  hudCtx.shadowBlur = 0;
  hudCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  hudCtx.fillRect(barX, barY, barW, barH);
  hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  hudCtx.lineWidth = 1;
  hudCtx.strokeRect(barX, barY, barW, barH);

  hudCtx.shadowColor = armorColor;
  hudCtx.shadowBlur = 6;
  hudCtx.fillStyle = armorColor;
  hudCtx.fillRect(barX + 2, barY + 2, (barW - 4) * armorRatio, barH - 4);

  hudCtx.shadowBlur = 0;
  hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  hudCtx.lineWidth = 1;
  hudCtx.beginPath();
  hudCtx.moveTo(x + 12, y + 50);
  hudCtx.lineTo(x + boxW - 12, y + 50);
  hudCtx.stroke();

  const isFiringGun = (typeof muzzleFlashTimer !== 'undefined' && muzzleFlashTimer > 0);
  hudCtx.font = 'bold 10px Conthrax, sans-serif';
  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('GUN: GU-11', x + 14, y + 72);

  hudCtx.shadowColor = isFiringGun ? 'rgba(250, 204, 21, 0.9)' : 'rgba(34, 197, 94, 0.8)';
  hudCtx.shadowBlur = 6;
  hudCtx.fillStyle = isFiringGun ? '#facc15' : '#22c55e';
  hudCtx.fillText(isFiringGun ? 'FIRING // INF' : 'READY // INF', x + 135, y + 72);

  hudCtx.shadowBlur = 0;
  hudCtx.beginPath();
  hudCtx.moveTo(x + 12, y + 86);
  hudCtx.lineTo(x + boxW - 12, y + 86);
  hudCtx.stroke();

  const lockCount = (typeof lockedEnemies !== 'undefined') ? lockedEnemies.length : 0;
  const hasLock = lockCount > 0;

  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('MSL: ' + (typeof getCurrentMissileType === 'function' ? getCurrentMissileType() : 'AMM-1'), x + 14, y + 110);

  hudCtx.shadowColor = hasLock ? 'rgba(239, 68, 68, 0.9)' : 'rgba(56, 189, 248, 0.6)';
  hudCtx.shadowBlur = 6;
  hudCtx.fillStyle = hasLock ? '#ef4444' : '#94a3b8';
  const mslLabel = hasLock ? ('LOCK [' + lockCount + '/4]') : 'STBY';
  hudCtx.fillText(mslLabel, x + 135, y + 110);

  for (let i = 0; i < 4; i++) {
    const cellX = x + 232 + i * 12;
    const cellY = y + 100;
    const cellActive = i < lockCount;
    hudCtx.fillStyle = cellActive ? '#ef4444' : 'rgba(51, 65, 85, 0.6)';
    hudCtx.fillRect(cellX, cellY, 8, 12);
  }

  hudCtx.shadowBlur = 0;
  hudCtx.beginPath();
  hudCtx.moveTo(x + 12, y + 124);
  hudCtx.lineTo(x + boxW - 12, y + 124);
  hudCtx.stroke();

  const isBattroid = (typeof currentMode !== 'undefined' && currentMode === 'BATTROID');
  const tMode = (typeof battroidTrackMode !== 'undefined') ? battroidTrackMode : 'NONE';

  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('TRACK [N]', x + 14, y + 148);

  let trackLabel = 'N/A (B-ONLY)';
  let trackColor = '#64748b';
  if (isBattroid) {
    if (tMode === 'ENEMY') {
      trackLabel = 'ENEMY // AUTO';
      trackColor = '#22c55e';
    } else if (tMode === 'MISSILE') {
      trackLabel = 'MISSILE // AUTO';
      trackColor = '#facc15';
    } else {
      trackLabel = 'NONE // MANUAL';
      trackColor = '#94a3b8';
    }
  }

  hudCtx.shadowColor = trackColor;
  hudCtx.shadowBlur = (isBattroid && tMode !== 'NONE') ? 6 : 0;
  hudCtx.fillStyle = trackColor;
  hudCtx.fillText(trackLabel, x + 135, y + 148);
  hudCtx.shadowBlur = 0;
  hudCtx.beginPath();
  hudCtx.moveTo(x + 12, y + 160);
  hudCtx.lineTo(x + boxW - 12, y + 160);
  hudCtx.stroke();

  const isFighterMode = (typeof currentMode !== 'undefined' && currentMode === 'FIGHTER');
  const cCooldown = (typeof chaffCooldown !== 'undefined') ? chaffCooldown : 0;
  const cActive = (typeof chaffFlares !== 'undefined' && chaffFlares.length > 0);

  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('CHAFF [C]', x + 14, y + 183);

  let chaffLabel = 'N/A (F-ONLY)';
  let chaffColor = '#64748b';
  if (isFighterMode) {
    if (cActive) {
      chaffLabel = 'DEPLOYED // FLARE';
      chaffColor = '#facc15';
    } else if (cCooldown > 0) {
      chaffLabel = 'RELOAD // ' + cCooldown.toFixed(1) + 'S';
      chaffColor = '#f59e0b';
    } else {
      chaffLabel = 'READY // DECOY';
      chaffColor = '#22c55e';
    }
  }

  hudCtx.shadowColor = chaffColor;
  hudCtx.shadowBlur = (isFighterMode && (cActive || cCooldown <= 0)) ? 6 : 0;
  hudCtx.fillStyle = chaffColor;
  hudCtx.fillText(chaffLabel, x + 135, y + 183);
  hudCtx.restore();
}
function drawPropulsionPanel(h) {
  const boxW = 305;
  const boxH = 92;
  const x = 15;
  const y = h - boxH - 15;
  const cut = 10;

  const thr = (typeof throttle !== 'undefined') ? throttle : 0;
  const accel = (typeof isAccelerating !== 'undefined') ? isAccelerating : false;
  const heat = (typeof turboHeat !== 'undefined') ? turboHeat : 0;
  const overheat = (typeof isOverheated !== 'undefined') ? isOverheated : false;
  const spdKmh = (typeof velocity !== 'undefined') ? Math.round(velocity.length() * 45) : 0;

  hudCtx.save();

  hudCtx.beginPath();
  hudCtx.moveTo(x, y);
  hudCtx.lineTo(x + boxW - cut, y);
  hudCtx.lineTo(x + boxW, y + cut);
  hudCtx.lineTo(x + boxW, y + boxH);
  hudCtx.lineTo(x + cut, y + boxH);
  hudCtx.lineTo(x, y + boxH - cut);
  hudCtx.closePath();

  hudCtx.fillStyle = 'rgba(6, 12, 24, 0.84)';
  hudCtx.fill();

  const borderCol = overheat ? '#ef4444' : (heat > 0.75 ? '#f59e0b' : '#38bdf8');
  hudCtx.shadowColor = borderCol;
  hudCtx.shadowBlur = overheat ? 12 : 8;
  hudCtx.strokeStyle = borderCol;
  hudCtx.lineWidth = 1.6;
  hudCtx.stroke();

  hudCtx.shadowBlur = 0;
  hudCtx.font = 'bold 9.5px Conthrax, sans-serif';
  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('THROTTLE', x + 14, y + 22);

  hudCtx.fillStyle = accel ? '#ff7b29' : '#22c55e';
  const thrText = accel ? ('MAX // ' + spdKmh + ' KM/H') : (Math.round(thr * 100) + '% // ' + spdKmh + ' KM/H');
  hudCtx.fillText(thrText, x + 115, y + 22);

  const barX = x + 14;
  const barW = boxW - 28;
  const thrBarY = y + 29;
  const barH = 11;

  hudCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  hudCtx.fillRect(barX, thrBarY, barW, barH);
  hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  hudCtx.lineWidth = 1;
  hudCtx.strokeRect(barX, thrBarY, barW, barH);

  const fillRatio = accel ? 1.0 : Math.max(0, Math.min(1, thr));
  hudCtx.shadowColor = accel ? '#ff7b29' : '#22c55e';
  hudCtx.shadowBlur = 6;
  hudCtx.fillStyle = accel ? '#ff7b29' : '#22c55e';
  hudCtx.fillRect(barX + 2, thrBarY + 2, (barW - 4) * fillRatio, barH - 4);

  hudCtx.shadowBlur = 0;
  hudCtx.fillStyle = overheat ? '#ef4444' : '#94a3b8';
  hudCtx.fillText('TURBINE HEAT', x + 14, y + 60);

  const blink = (Math.floor(performance.now() / 160) % 2 === 0);
  let heatStatus = Math.round(heat * 100) + '% // NOMINAL';
  let heatColor = '#38bdf8';

  if (overheat) {
    heatStatus = blink ? 'OVERHEAT // COOLING' : 'LOCKED // COOLING';
    heatColor = '#ef4444';
  } else if (heat > 0.75) {
    heatStatus = Math.round(heat * 100) + '% // HEAT WARN';
    heatColor = '#f59e0b';
  } else if (heat > 0.35) {
    heatStatus = Math.round(heat * 100) + '% // WARM';
    heatColor = '#facc15';
  }

  hudCtx.shadowColor = heatColor;
  hudCtx.shadowBlur = overheat ? 10 : 5;
  hudCtx.fillStyle = heatColor;
  hudCtx.fillText(heatStatus, x + 128, y + 60);

  const heatBarY = y + 67;
  hudCtx.shadowBlur = 0;
  hudCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  hudCtx.fillRect(barX, heatBarY, barW, barH);
  hudCtx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  hudCtx.strokeRect(barX, heatBarY, barW, barH);

  hudCtx.shadowColor = heatColor;
  hudCtx.shadowBlur = 7;
  hudCtx.fillStyle = heatColor;
  hudCtx.fillRect(barX + 2, heatBarY + 2, (barW - 4) * Math.min(1, heat), barH - 4);

  hudCtx.restore();
}

function drawPauseOverlay(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const boxW = 340;
  const boxH = 115;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;
  const cut = 14;

  hudCtx.save();

  hudCtx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  hudCtx.fillRect(0, 0, w, h);

  hudCtx.beginPath();
  hudCtx.moveTo(x + cut, y);
  hudCtx.lineTo(x + boxW - cut, y);
  hudCtx.lineTo(x + boxW, y + cut);
  hudCtx.lineTo(x + boxW, y + boxH - cut);
  hudCtx.lineTo(x + boxW - cut, y + boxH);
  hudCtx.lineTo(x + cut, y + boxH);
  hudCtx.lineTo(x, y + boxH - cut);
  hudCtx.lineTo(x, y + cut);
  hudCtx.closePath();

  hudCtx.fillStyle = 'rgba(6, 12, 24, 0.92)';
  hudCtx.fill();

  hudCtx.shadowColor = 'rgba(56, 189, 248, 0.9)';
  hudCtx.shadowBlur = 14;
  hudCtx.strokeStyle = '#38bdf8';
  hudCtx.lineWidth = 2.0;
  hudCtx.stroke();

  hudCtx.shadowBlur = 6;
  hudCtx.strokeStyle = '#22c55e';
  hudCtx.lineWidth = 1.5;
  hudCtx.beginPath();
  hudCtx.moveTo(x + 24, cy - 22);
  hudCtx.lineTo(x + boxW - 24, cy - 22);
  hudCtx.moveTo(x + 24, cy + 26);
  hudCtx.lineTo(x + boxW - 24, cy + 26);
  hudCtx.stroke();

  hudCtx.textAlign = 'center';
  hudCtx.textBaseline = 'middle';
  hudCtx.shadowColor = 'rgba(56, 189, 248, 0.95)';
  hudCtx.shadowBlur = 12;
  hudCtx.font = 'bold 26px Conthrax, sans-serif';
  hudCtx.fillStyle = '#ffffff';
  hudCtx.fillText('PAUSA', cx, cy + 2);

  hudCtx.shadowBlur = 4;
  hudCtx.font = 'bold 9.5px Conthrax, sans-serif';
  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillText('SYSTEM STANDBY // PRESIONA [P]', cx, cy + 40);

  hudCtx.restore();
}
function drawRestartOverlay(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const boxW = 390;
  const boxH = 145;
  const x = cx - boxW / 2;
  const y = cy - boxH / 2;
  const cut = 14;

  const declined = (typeof restartDeclined !== 'undefined') ? restartDeclined : false;

  hudCtx.save();

  hudCtx.fillStyle = 'rgba(2, 6, 23, 0.65)';
  hudCtx.fillRect(0, 0, w, h);

  hudCtx.beginPath();
  hudCtx.moveTo(x + cut, y);
  hudCtx.lineTo(x + boxW - cut, y);
  hudCtx.lineTo(x + boxW, y + cut);
  hudCtx.lineTo(x + boxW, y + boxH - cut);
  hudCtx.lineTo(x + boxW - cut, y + boxH);
  hudCtx.lineTo(x + cut, y + boxH);
  hudCtx.lineTo(x, y + boxH - cut);
  hudCtx.lineTo(x, y + cut);
  hudCtx.closePath();

  hudCtx.fillStyle = 'rgba(15, 6, 10, 0.92)';
  hudCtx.fill();

  hudCtx.shadowColor = 'rgba(239, 68, 68, 0.95)';
  hudCtx.shadowBlur = 15;
  hudCtx.strokeStyle = '#ef4444';
  hudCtx.lineWidth = 2.2;
  hudCtx.stroke();

  hudCtx.textAlign = 'center';
  hudCtx.textBaseline = 'middle';

  hudCtx.shadowBlur = 6;
  hudCtx.font = 'bold 10px Conthrax, sans-serif';
  hudCtx.fillStyle = '#f87171';
  hudCtx.fillText('VF-1A DESTROYED // SYSTEM FAILURE', cx, cy - 42);

  hudCtx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  hudCtx.shadowBlur = 12;
  hudCtx.font = 'bold 24px Conthrax, sans-serif';
  hudCtx.fillStyle = '#ffffff';
  hudCtx.fillText('RESTART?', cx, cy - 6);

  hudCtx.shadowColor = 'rgba(34, 197, 94, 0.9)';
  hudCtx.shadowBlur = 8;
  hudCtx.font = 'bold 14px Conthrax, sans-serif';
  const padType = window.gameControls?.getGamepadDiagramType?.();
  const yesLabel = padType === 'xbox' ? '[A] SÍ' : padType === 'ps2' ? '[×] SÍ' : '[Y] YES';
  const noLabel = padType === 'xbox' ? '[B] NO' : padType === 'ps2' ? '[○] NO' : '[N] NO';
  hudCtx.shadowColor = '#38bdf8';
  hudCtx.shadowBlur = 10;
  hudCtx.strokeStyle = '#38bdf8';
  hudCtx.lineWidth = 2;
  hudCtx.strokeRect(cx + (declined ? 34 : -122), cy + 22, 88, 32);
  hudCtx.shadowColor = 'rgba(34, 197, 94, 0.9)';
  hudCtx.shadowBlur = 8;
  hudCtx.fillStyle = !declined ? '#22c55e' : '#64748b';
  hudCtx.fillText(yesLabel, cx - 78, cy + 38);

  hudCtx.shadowColor = declined ? 'rgba(239, 68, 68, 0.95)' : 'rgba(148, 163, 184, 0.5)';
  hudCtx.fillStyle = declined ? '#ef4444' : '#94a3b8';
  hudCtx.fillText(noLabel, cx + 78, cy + 38);

  hudCtx.restore();
}

function drawDYRLHud(delta, camera, playerContainer, enemies, isPaused) {
  const w = hudCanvas.width;
  const h = hudCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  hudCtx.clearRect(0, 0, w, h);

  if (typeof armorDamageFlash !== 'undefined' && armorDamageFlash > 0) {
    hudCtx.save();
    hudCtx.strokeStyle = 'rgba(239, 68, 68, ' + Math.min(0.85, armorDamageFlash * 2.5) + ')';
    hudCtx.lineWidth = 14;
    hudCtx.strokeRect(0, 0, w, h);
    hudCtx.restore();
  }

  const scanRadius = 215;
  const candidates = new Array();
  const projVec = new THREE.Vector3();

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (e.respawnTimer > 0) {
      e.lockProgress = 0;
      e.seekerX = cx;
      e.seekerY = cy;
      continue;
    }

    projVec.copy(e.mesh.position).project(camera);
    if (projVec.z > 1) {
      e.lockProgress = Math.max(0, (e.lockProgress || 0) - delta * 2.0);
      continue;
    }

    const sx = (projVec.x * 0.5 + 0.5) * w;
    const sy = (-(projVec.y * 0.5) + 0.5) * h;
    const distCenter = Math.hypot(sx - cx, sy - cy);
    const worldDist = Math.round(e.mesh.position.distanceTo(playerContainer.position) * 10);
    const altDiff = Math.max(0, Math.round(e.mesh.position.y * 2.4));

    drawDYRLEnemyHexagon(sx, sy, 18, worldDist, altDiff);

    if (distCenter < scanRadius) {
      candidates.push({ enemy: e, sx: sx, sy: sy, distCenter: distCenter });
    } else {
      e.lockProgress = Math.max(0, (e.lockProgress || 0) - delta * 2.5);
      e.seekerX = cx;
      e.seekerY = cy;
    }
  }

  candidates.sort((a, b) => a.distCenter - b.distCenter);
  const activeBatch = candidates.slice(0, MAX_MULTI_LOCK);

  for (let i = MAX_MULTI_LOCK; i < candidates.length; i++) {
    candidates[i].enemy.lockProgress = 0;
    candidates[i].enemy.seekerX = cx;
    candidates[i].enemy.seekerY = cy;
  }

  lockedEnemies.length = 0;

  for (let i = 0; i < activeBatch.length; i++) {
    const item = activeBatch[i];
    const e = item.enemy;

    if (typeof e.seekerX !== 'number') {
      e.seekerX = cx;
      e.seekerY = cy;
    }

    const lerpRate = Math.min(1.0, 12.0 * delta);
    e.seekerX += (item.sx - e.seekerX) * lerpRate;
    e.seekerY += (item.sy - e.seekerY) * lerpRate;

    const alignDist = Math.hypot(item.sx - e.seekerX, item.sy - e.seekerY);
    if (alignDist < 30) {
      e.lockProgress = Math.min(1.0, (e.lockProgress || 0) + delta * 2.4);
    }

    const isFullLock = e.lockProgress >= 1.0;
    if (isFullLock) {
      lockedEnemies.push(e);
    }

    const spreadOffset = (1.0 - (e.lockProgress || 0)) * 18;
    drawSeekerBrackets(e.seekerX, e.seekerY, spreadOffset, isFullLock, e.id, i + 1);
  }

  drawEnemyMissileMarkers(w, h, camera, playerContainer);
  drawBattroidTrackReticle(w, h, camera);

  const rollAngle = new THREE.Euler().setFromQuaternion(playerContainer.quaternion, 'YXZ').z;
  hudCtx.save();
  hudCtx.translate(cx, cy);

  hudCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  hudCtx.shadowBlur = 5;
  hudCtx.strokeStyle = '#38bdf8';
  hudCtx.lineWidth = 2.2;
  hudCtx.beginPath();
  hudCtx.arc(0, 0, 88, -Math.PI * 0.35, Math.PI * 0.35);
  hudCtx.stroke();
  hudCtx.beginPath();
  hudCtx.arc(0, 0, 88, Math.PI * 0.65, Math.PI * 1.35);
  hudCtx.stroke();

  hudCtx.save();
  hudCtx.rotate(-rollAngle);
  hudCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  hudCtx.shadowBlur = 5;
  hudCtx.strokeStyle = '#22c55e';
  hudCtx.lineWidth = 2.0;
  hudCtx.beginPath();
  hudCtx.moveTo(-64, 0); hudCtx.lineTo(-24, 0);
  hudCtx.moveTo(24, 0); hudCtx.lineTo(64, 0);
  hudCtx.moveTo(-42, -26); hudCtx.lineTo(-20, -26);
  hudCtx.moveTo(20, -26); hudCtx.lineTo(42, -26);
  hudCtx.moveTo(-42, 26); hudCtx.lineTo(-20, 26);
  hudCtx.moveTo(20, 26); hudCtx.lineTo(42, 26);
  hudCtx.stroke();
  hudCtx.restore();

  hudCtx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  hudCtx.shadowBlur = 5;
  hudCtx.strokeStyle = '#4ade80';
  hudCtx.lineWidth = 2.4;
  hudCtx.beginPath();
  hudCtx.moveTo(0, -18); hudCtx.lineTo(0, -6);
  hudCtx.moveTo(0, 6); hudCtx.lineTo(0, 18);
  hudCtx.moveTo(-18, 0); hudCtx.lineTo(-6, 0);
  hudCtx.moveTo(6, 0); hudCtx.lineTo(18, 0);
  hudCtx.stroke();

  hudCtx.fillStyle = '#38bdf8';
  hudCtx.fillRect(-2, -2, 4, 4);
  hudCtx.restore();

  drawWeaponStatusPanel(w);
  drawPropulsionPanel(h);

  if (typeof isGameOver !== 'undefined' && isGameOver) {
    drawRestartOverlay(w, h);
  } else if (isPaused) {
    drawPauseOverlay(w, h);
  }
}
