const hudEl = document.getElementById('hud');
const fpsEl = document.getElementById('fpsBox');
const startScreenEl = document.getElementById('startScreen');
const uiPanelEl = document.getElementById('ui');

const keys = {};
const keyboardHeldActions = new Set();
let gamepadHeldActions = new Set();
let suppressNextGamepadFrame = false;
const continuousControlActions = ['moveForward', 'moveBack', 'moveLeft', 'moveRight', 'turnLeft', 'turnRight', 'verticalUp', 'verticalDown', 'gunpod', 'missiles', 'brake', 'slowdown'];
let isGameStarted = false;
let isPaused = false;
let restartDeclined = false;
let gamepadFocusedElement = null;
let introOrbitAngle = 0.65;
let manualHourOffset = 0;
const timeOfDayStorageKey = 'macrossvoxp-time-of-day-v1';
const validTimeOfDayModes = ['real', 'morning', 'midday', 'afternoon', 'night'];
let timeOfDayMode = (() => {
  try {
    const saved = localStorage.getItem(timeOfDayStorageKey);
    return validTimeOfDayModes.includes(saved) ? saved : 'real';
  } catch (_) {
    return 'real';
  }
})();

const scene = new THREE.Scene();
switchEnvironmentMap(scene, 'MAPA_1');

const isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || false;
const initialViewportWidth = window.visualViewport?.width || window.innerWidth;
const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
const camera = new THREE.PerspectiveCamera(60, initialViewportWidth / initialViewportHeight, 0.25, 2400);
const renderer = new THREE.WebGLRenderer({ antialias: !isTouchDevice, powerPreference: 'high-performance' });
renderer.setSize(initialViewportWidth, initialViewportHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouchDevice ? 0.7 : 1.25));
renderer.domElement.id = 'gameCanvas';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x7c93ad, 0.56);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0x5299c7, 0x28323e, 0.48);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xfff1d6, 1.65);
dirLight.position.set(180, 220, 120);
scene.add(dirLight);
if (typeof updateDayNightCycle === 'function') {
  updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode);
}

const playerContainer = new THREE.Group();
playerContainer.position.set(0, 38, 120);
scene.add(playerContainer);

const visualTiltGroup = new THREE.Group();
playerContainer.add(visualTiltGroup);

initWeaponsAndEnemies(scene, playerContainer);
loadPlayerModel(visualTiltGroup);

function startMission() {
  if (isGameStarted) return;
  isGameStarted = true;
  restartDeclined = false;
  if (typeof stopTitleMusic === 'function') stopTitleMusic();
  if (startScreenEl) startScreenEl.classList.add('hidden');
  if (uiPanelEl) uiPanelEl.classList.remove('hidden');
  if (fpsEl) fpsEl.classList.remove('hidden');
  if (typeof unlockAudio === 'function') unlockAudio();
  if (typeof playSFX === 'function') playSFX('transform', 0.85, 0);
  if (gyroMobilePanel && gyroControlActive && gyroSensorSeen) {
    gyroSetup.hidden = true;
    gyroActions.hidden = false;
  }
  clock.getDelta();
}
function returnToStartScreen() {
  isGameStarted = false;
  isPaused = false;
  restartDeclined = false;
  if (gyroSetup && gyroActions) {
    gyroSetup.hidden = false;
    gyroActions.hidden = true;
    if (gyroSensorSeen) gyroStatus.textContent = 'Giroscopio listo · ya puedes iniciar la misión';
  }
  for (const k in keys) keys[k] = false;

  if (typeof silenceAllCombatAudio === 'function') {
    silenceAllCombatAudio();
  }
  if (typeof resetPlayerMission === 'function') {
    resetPlayerMission(playerContainer, visualTiltGroup);
  }
  if (typeof clearAllProjectiles === 'function') {
    clearAllProjectiles(scene);
  }
  if (typeof hudCtx !== 'undefined' && typeof hudCanvas !== 'undefined') {
    hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
  }

  if (uiPanelEl) uiPanelEl.classList.add('hidden');
  if (fpsEl) fpsEl.classList.add('hidden');
  if (startScreenEl) startScreenEl.classList.remove('hidden');

  if (typeof playTitleMusic === 'function') {
    playTitleMusic();
  }
}

const btnStartGame = document.getElementById('btnStartGame');
if (btnStartGame) {
  btnStartGame.addEventListener('click', startMission);
}

function togglePause() {
  if (!isGameStarted || isPlayerDying || isGameOver) return;
  if (isPaused) return;
  isPaused = true;
  clock.getDelta();
  if (window.gameControls?.openPauseOptions) window.gameControls.openPauseOptions();
}

window.addEventListener('macross:resume-game', () => {
  isPaused = false;
  clock.getDelta();
});

document.getElementById('btnExitToTitle')?.addEventListener('click', () => {
  if (window.gameControls?.closeOptions?.() === false) return;
  returnToStartScreen();
  btnStartGame?.focus();
});

const timeOfDaySelect = document.getElementById('timeOfDayMode');
if (timeOfDaySelect) {
  timeOfDaySelect.value = timeOfDayMode;
  timeOfDaySelect.addEventListener('change', () => {
    const selectedMode = timeOfDaySelect.value;
    if (!validTimeOfDayModes.includes(selectedMode)) return;
    timeOfDayMode = selectedMode;
    try { localStorage.setItem(timeOfDayStorageKey, timeOfDayMode); } catch (_) {}
    updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode);
  });
}

const gyroMobilePanel = document.getElementById('gyroMobilePanel');
const gyroSetup = document.getElementById('gyroSetup');
const gyroStatus = document.getElementById('gyroStatus');
const gyroActions = document.getElementById('gyroActions');
const gyroEnableButton = document.getElementById('btnEnableGyro');
let gyroControlActive = false;
let gyroSensorSeen = false;
let gyroLatestTilt = null;
let gyroNeutralTilt = null;
let gyroCheckTimer = 0;
const mobileHeldActions = new Set();
const mobileGyroInputs = {};
const mobileHeldStateKeys = {
  gunpod: 'ShiftLeft', missiles: 'Space', targetLock: 'GamepadTargetLock',
  moveForward: 'GamepadMoveForward', moveBack: 'GamepadMoveBack'
};

function clearMobileGyroAxes() {
  Object.keys(mobileGyroInputs).forEach(action => { mobileGyroInputs[action] = false; });
  keys.GamepadRollLeft = false;
  keys.GamepadRollRight = false;
  keys.GamepadTurnLeft = false;
  keys.GamepadTurnRight = false;
  keys.GamepadPitchUp = false;
  keys.GamepadPitchDown = false;
  keys.GamepadGerwalkUp = false;
  keys.GamepadGerwalkDown = false;
  keys.GamepadGerwalkTurnLeft = false;
  keys.GamepadGerwalkTurnRight = false;
  keys.GamepadThrust = false;
}

function releaseMobileHeldActions() {
  mobileHeldActions.forEach(action => {
    if (mobileHeldStateKeys[action]) keys[mobileHeldStateKeys[action]] = false;
    if (action === 'turbo') {
      keys.GamepadThrust = false;
      stopAcceleration();
    }
    if (action === 'reverse') stopReverseGerwalk();
  });
  mobileHeldActions.clear();
  document.querySelectorAll('[data-mobile-action].is-pressed').forEach(button => button.classList.remove('is-pressed'));
  clearMobileGyroAxes();
}

function getScreenRelativeTilt(event) {
  if (!Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return null;
  const angle = ((Number(window.screen?.orientation?.angle ?? window.orientation ?? 0) % 360) + 360) % 360;
  const radians = angle * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: event.gamma * cosine - event.beta * sine,
    y: event.beta * cosine + event.gamma * sine
  };
}

function updateGyroGameInput() {
  if (!gyroControlActive || !gyroSensorSeen || !gyroLatestTilt || !gyroNeutralTilt || !isGameStarted || isPaused || window.gameControls?.isOptionsOpen()) {
    clearMobileGyroAxes();
    return;
  }
  const deadzone = 7;
  const x = gyroLatestTilt.x - gyroNeutralTilt.x;
  const y = gyroLatestTilt.y - gyroNeutralTilt.y;
  const tiltLeft = x < -deadzone;
  const tiltRight = x > deadzone;
  const tiltForward = y > deadzone;
  const tiltBack = y < -deadzone;
  Object.assign(mobileGyroInputs, {
    rollLeft: tiltLeft, rollRight: tiltRight,
    turnLeft: tiltLeft, turnRight: tiltRight,
    gerwalkTurnLeft: tiltLeft, gerwalkTurnRight: tiltRight,
    pitchDown: tiltForward, pitchUp: tiltBack,
    gerwalkUp: tiltBack, gerwalkDown: tiltForward
  });
  applyMobileGyroInputs();
}

function applyMobileGyroInputs() {
  keys.GamepadRollLeft = Boolean(mobileGyroInputs.rollLeft);
  keys.GamepadRollRight = Boolean(mobileGyroInputs.rollRight);
  keys.GamepadTurnLeft = Boolean(mobileGyroInputs.turnLeft);
  keys.GamepadTurnRight = Boolean(mobileGyroInputs.turnRight);
  keys.GamepadGerwalkTurnLeft = Boolean(mobileGyroInputs.gerwalkTurnLeft);
  keys.GamepadGerwalkTurnRight = Boolean(mobileGyroInputs.gerwalkTurnRight);
  keys.GamepadPitchDown = Boolean(mobileGyroInputs.pitchDown);
  keys.GamepadPitchUp = Boolean(mobileGyroInputs.pitchUp);
  keys.GamepadGerwalkUp = Boolean(mobileGyroInputs.gerwalkUp);
  keys.GamepadGerwalkDown = Boolean(mobileGyroInputs.gerwalkDown);
}

function onMobileDeviceOrientation(event) {
  const tilt = getScreenRelativeTilt(event);
  if (!tilt) return;
  gyroLatestTilt = tilt;
  if (!gyroSensorSeen) {
    gyroSensorSeen = true;
    gyroNeutralTilt = { ...tilt };
    gyroEnableButton.hidden = false;
    gyroEnableButton.textContent = 'RECALIBRAR';
    if (isGameStarted) {
      gyroSetup.hidden = true;
      gyroActions.hidden = false;
      gyroStatus.textContent = 'Giroscopio activo · inclina el teléfono para pilotar';
    } else {
      gyroActions.hidden = true;
      gyroStatus.textContent = 'Giroscopio listo · ya puedes iniciar la misión';
    }
  }
  updateGyroGameInput();
}

function recalibrateMobileGyro() {
  if (!gyroLatestTilt) return;
  gyroNeutralTilt = { ...gyroLatestTilt };
  if (gyroStatus) gyroStatus.textContent = 'Centro calibrado · inclina el teléfono para pilotar';
}

async function enableMobileGyro() {
  if (!gyroMobilePanel || !gyroEnableButton) return;
  if (!window.isSecureContext) {
    gyroStatus.textContent = 'El navegador requiere HTTPS para habilitar el giroscopio.';
    return;
  }
  try {
    const permissionRequest = window.DeviceOrientationEvent?.requestPermission;
    if (typeof permissionRequest === 'function') {
      const permission = await permissionRequest.call(window.DeviceOrientationEvent);
      if (permission !== 'granted') throw new Error('permission-denied');
    }
    gyroControlActive = true;
    gyroSensorSeen = false;
    gyroNeutralTilt = null;
    gyroStatus.textContent = 'Esperando datos del giroscopio…';
    window.addEventListener('deviceorientation', onMobileDeviceOrientation, { passive: true });
    window.clearTimeout(gyroCheckTimer);
    gyroCheckTimer = window.setTimeout(() => {
      if (!gyroSensorSeen) {
        gyroControlActive = false;
        window.removeEventListener('deviceorientation', onMobileDeviceOrientation);
        gyroStatus.textContent = 'No se detectó un giroscopio disponible en este teléfono.';
        gyroEnableButton.hidden = false;
        gyroEnableButton.textContent = 'ACTIVAR GIROSCOPIO';
        gyroActions.hidden = true;
      }
    }, 2200);
  } catch (_) {
    gyroControlActive = false;
    gyroStatus.textContent = 'No se pudo activar el giroscopio. Revisa el permiso del navegador.';
  }
}

if (isTouchDevice && window.DeviceOrientationEvent && gyroMobilePanel) {
  gyroMobilePanel.hidden = false;
  gyroMobilePanel.classList.add('is-available');
  gyroSetup.hidden = false;
  gyroActions.hidden = true;
  gyroEnableButton?.addEventListener('click', () => {
    if (gyroControlActive && gyroSensorSeen) recalibrateMobileGyro();
    else enableMobileGyro();
  });
  document.getElementById('btnGyroRecalibrate')?.addEventListener('click', recalibrateMobileGyro);
  document.getElementById('btnMoreMobileActions')?.addEventListener('click', event => {
    const button = event.currentTarget;
    const extras = [...document.querySelectorAll('.gyro-extra-action')];
    const opening = extras.some(extra => extra.hidden);
    extras.forEach(extra => { extra.hidden = !opening; });
    button.setAttribute('aria-expanded', String(opening));
    button.textContent = opening ? 'MENOS ▴' : 'MÁS ▾';
  });
  const syncMobileGamepad = () => {
    const connected = Array.from(navigator.getGamepads?.() || []).some(pad => pad?.connected);
    gyroMobilePanel.classList.toggle('has-gamepad', connected);
    const status = document.getElementById('mobileGamepadStatus');
    if (status) status.textContent = connected ? 'Mando conectado · se usan sus controles y se ocultan los táctiles.' : 'Mando no detectado.';
  };
  window.addEventListener('gamepadconnected', syncMobileGamepad);
  window.addEventListener('gamepaddisconnected', () => window.setTimeout(syncMobileGamepad, 100));
  syncMobileGamepad();
  window.setInterval(syncMobileGamepad, 700);
  const hideTouchControls = document.getElementById('hideMobileControls');
  try {
    hideTouchControls.checked = localStorage.getItem('macrossvoxp-hide-mobile-controls') === 'true';
  } catch (_) {}
  gyroMobilePanel.classList.toggle('user-hide-controls', Boolean(hideTouchControls.checked));
  hideTouchControls.addEventListener('change', () => {
    const hidden = hideTouchControls.checked;
    gyroMobilePanel.classList.toggle('user-hide-controls', hidden);
    try { localStorage.setItem('macrossvoxp-hide-mobile-controls', String(hidden)); } catch (_) {}
  });
}

function cycleMobileTransformation(direction) {
  if (!isGameStarted || isPaused || isPlayerDying || isGameOver) return;
  const modes = ['FIGHTER', 'GERWALK', 'BATTROID'];
  const index = Math.max(0, modes.indexOf(currentMode));
  transformTo(modes[(index + direction + modes.length) % modes.length]);
}

function setMobileHeldAction(action, pressed, button) {
  if (!pressed) {
    mobileHeldActions.delete(action);
    if (mobileHeldStateKeys[action]) keys[mobileHeldStateKeys[action]] = false;
    if (button) button.classList.remove('is-pressed');
    if (action === 'turbo') {
      keys.GamepadThrust = false;
      stopAcceleration();
    }
    if (action === 'reverse') stopReverseGerwalk();
    return;
  }
  if (!gyroSensorSeen || !isGameStarted || isPaused || isGameOver || isPlayerDying) return;
  if (button) button.classList.toggle('is-pressed', pressed);
  mobileHeldActions.add(action);
  if (mobileHeldStateKeys[action]) keys[mobileHeldStateKeys[action]] = true;
  if (action === 'turbo') {
    keys.GamepadThrust = currentMode === 'GERWALK';
    if (currentMode === 'FIGHTER') startAcceleration();
    if (currentMode === 'BATTROID' && typeof triggerBattroidImpulse === 'function') triggerBattroidImpulse(keys);
  }
  if (action === 'reverse') startReverseGerwalk();
}

function performMobileAction(action) {
  if (!gyroSensorSeen || !isGameStarted || isPaused || isGameOver || isPlayerDying) return;
  if (action === 'transformPrevious') cycleMobileTransformation(-1);
  if (action === 'transformNext') cycleMobileTransformation(1);
  if (action === 'melee') triggerGunpodMelee();
  if (action === 'chaff' && typeof deployChaff === 'function') deployChaff(scene, playerContainer);
}

document.querySelectorAll('[data-mobile-action]').forEach(button => {
  const action = button.dataset.mobileAction;
  const held = Object.prototype.hasOwnProperty.call(mobileHeldStateKeys, action) || action === 'turbo' || action === 'reverse';
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    if (held) setMobileHeldAction(action, true, button);
    else performMobileAction(action);
  });
  const release = event => {
    if (held) {
      event.preventDefault();
      setMobileHeldAction(action, false, button);
    }
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

document.getElementById('btnMobilePause')?.addEventListener('click', () => {
  if (gyroSensorSeen && isGameStarted && !isPaused) togglePause();
});
window.addEventListener('blur', releaseMobileHeldActions);

let selectedMapId = 'MAPA_1';

const MAP_TITLES = {
  MAPA_1: '01 // ISLA SOUTH ATARIA',
  MAPA_2: '02 // ÓRBITA DE SATURNO',
  MAPA_3: '03 // MACROSS CITY INTERIOR (DYRL)'
};

const mapSelectButtons = document.querySelectorAll('.map-select-btn');
const selectedMapTitleEl = document.getElementById('selectedMapTitle');

mapSelectButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mapKey = btn.dataset.map;
    if (!mapKey || mapKey === selectedMapId) return;

    selectedMapId = mapKey;
    mapSelectButtons.forEach((b) => b.classList.toggle('active', b === btn));
    if (selectedMapTitleEl) {
      selectedMapTitleEl.textContent = MAP_TITLES[mapKey] || mapKey;
    }

    if (typeof switchEnvironmentMap === 'function') {
      switchEnvironmentMap(scene, selectedMapId);
    }
  });
});

function visibleGamepadMenuItems() {
  if (window.gameControls?.isOptionsOpen()) {
    const candidates = [...document.querySelectorAll('#optionsScreen button, #optionsScreen input, #optionsScreen select')];
    return candidates.filter(element => {
      if (element.disabled || !element.getClientRects().length) return false;
      return !element.closest('[hidden]');
    });
  }
  if (!isGameStarted) {
    return [...document.querySelectorAll('#startScreen button')].filter(element => element.getClientRects().length && !element.disabled);
  }
  return [];
}

function setGamepadMenuFocus(element) {
  document.querySelectorAll('.gamepad-menu-focus').forEach(item => item.classList.remove('gamepad-menu-focus'));
  gamepadFocusedElement = element || null;
  if (!element) return;
  element.classList.add('gamepad-menu-focus');
  element.focus({ preventScroll: true });
}

document.addEventListener('macross:options-opened', event => {
  if (event.detail?.pause) setGamepadMenuFocus(document.getElementById('btnContinueGame'));
});

function stepGamepadMenuFocus(direction) {
  const items = visibleGamepadMenuItems();
  if (!items.length) return;
  let currentIndex = items.indexOf(gamepadFocusedElement);
  if (currentIndex < 0) currentIndex = items.indexOf(document.activeElement);
  const current = currentIndex >= 0 ? items[currentIndex] : document.activeElement;
  if (current instanceof HTMLInputElement && current.type === 'range' && (direction === 'left' || direction === 'right')) {
    const step = Number(current.step) || 1;
    const sign = direction === 'right' ? 1 : -1;
    current.value = String(Math.max(Number(current.min), Math.min(Number(current.max), Number(current.value) + sign * step * 5)));
    current.dispatchEvent(new Event('input', { bubbles: true }));
    setGamepadMenuFocus(current);
    return;
  }
  if (current instanceof HTMLSelectElement && (direction === 'left' || direction === 'right')) {
    const offset = direction === 'right' ? 1 : -1;
    current.selectedIndex = (current.selectedIndex + offset + current.options.length) % current.options.length;
    current.dispatchEvent(new Event('change', { bubbles: true }));
    setGamepadMenuFocus(current);
    return;
  }
  const offset = (direction === 'up' || direction === 'left') ? -1 : 1;
  const nextIndex = currentIndex < 0
    ? (offset > 0 ? 0 : items.length - 1)
    : (currentIndex + offset + items.length) % items.length;
  setGamepadMenuFocus(items[nextIndex]);
}

function acceptGamepadMenuSelection() {
  const items = visibleGamepadMenuItems();
  const target = items.includes(gamepadFocusedElement) ? gamepadFocusedElement : items[0];
  if (!target) return;
  setGamepadMenuFocus(target);
  if (!(target instanceof HTMLInputElement && target.type === 'range')) target.click();
  const focusedAfterClick = document.activeElement;
  if (window.gameControls?.isOptionsOpen() && visibleGamepadMenuItems().includes(focusedAfterClick)) {
    setGamepadMenuFocus(focusedAfterClick);
  }
}

window.addEventListener('macross:gamepad-menu-input', event => {
  const { direction, accept, back } = event.detail || {};
  if (window.gameControls?.isOptionsOpen()) {
    if (back) {
      suppressNextGamepadFrame = true;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
      return;
    }
    if (window.gameControls.isListening()) return;
    if (direction) stepGamepadMenuFocus(direction);
    if (accept) {
      suppressNextGamepadFrame = true;
      acceptGamepadMenuSelection();
    }
    return;
  }

  if (typeof isGameOver !== 'undefined' && isGameOver) {
    if (direction === 'left' || direction === 'up') restartDeclined = false;
    if (direction === 'right' || direction === 'down') restartDeclined = true;
    if (back) restartDeclined = true;
    if (accept || back) suppressNextGamepadFrame = true;
    if (accept) {
      if (restartDeclined) returnToStartScreen();
      else window.location.reload();
    }
    return;
  }

  if (isPaused) {
    if (back || accept) {
      suppressNextGamepadFrame = true;
      togglePause();
    }
    return;
  }
  if (!isGameStarted) {
    if (direction) stepGamepadMenuFocus(direction);
    if (accept) {
      suppressNextGamepadFrame = true;
      acceptGamepadMenuSelection();
    }
  }
});

const btnFighter = document.getElementById('btnFighter');
if (btnFighter) btnFighter.addEventListener('click', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) transformTo('FIGHTER'); });
const btnGerwalk = document.getElementById('btnGerwalk');
if (btnGerwalk) btnGerwalk.addEventListener('click', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) transformTo('GERWALK'); });
const btnBattroid = document.getElementById('btnBattroid');
if (btnBattroid) btnBattroid.addEventListener('click', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) transformTo('BATTROID'); });
const btnMelee = document.getElementById('btnMelee');
if (btnMelee) btnMelee.addEventListener('click', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) triggerGunpodMelee(); });
const btnStop = document.getElementById('btnStop');
if (btnStop) btnStop.addEventListener('click', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) triggerFullStop(); });

const btnSweep = document.getElementById('btnSweep');
if (btnSweep) {
  btnSweep.addEventListener('mousedown', () => { if (isGameStarted && !isPaused && !isPlayerDying && !isGameOver) startAcceleration(); });
  btnSweep.addEventListener('mouseup', stopAcceleration);
  btnSweep.addEventListener('mouseleave', stopAcceleration);
}

const sliderSFX = document.getElementById('sliderSFX');
const initialAudioSettings = typeof getAudioSettings === 'function' ? getAudioSettings() : { sfx: 50, bgm: 50 };
if (sliderSFX) sliderSFX.value = String(initialAudioSettings.sfx);
if (sliderSFX) {
  sliderSFX.addEventListener('input', (e) => {
    if (typeof setSFXVolume === 'function') setSFXVolume(Number(e.target.value));
  });
  sliderSFX.addEventListener('change', (e) => e.target.blur());
}

const sliderBGM = document.getElementById('sliderBGM');
if (sliderBGM) sliderBGM.value = String(initialAudioSettings.bgm);
if (sliderBGM) {
  sliderBGM.addEventListener('input', (e) => {
    const volume = Number(e.target.value);
    if (typeof setBGMVolume === 'function') setBGMVolume(volume);
    const tester = document.getElementById('soundTester');
    if (tester) tester.volume = volume / 100;
  });
  sliderBGM.addEventListener('change', (e) => e.target.blur());
}
const soundTestTrack = document.getElementById('soundTestTrack');
const soundTester = document.getElementById('soundTester');
const audioStatus = document.getElementById('audioStatus');
if (soundTestTrack && soundTester) {
  soundTestTrack.addEventListener('change', () => {
    soundTester.pause();
    soundTester.src = soundTestTrack.value;
    soundTester.load();
    if (audioStatus) audioStatus.textContent = 'Pista lista para reproducir.';
  });
  soundTester.addEventListener('play', () => {
    if (audioStatus) audioStatus.textContent = `Reproduciendo: ${soundTestTrack.selectedOptions[0].textContent}.`;
  });
  soundTester.addEventListener('pause', () => {
    if (audioStatus) audioStatus.textContent = 'Reproductor de prueba pausado.';
  });
  soundTester.addEventListener('error', () => {
    if (audioStatus) audioStatus.textContent = 'No se pudo cargar esta pista.';
  });
  soundTester.volume = sliderBGM ? Number(sliderBGM.value) / 100 : 0.65;
}

window.addEventListener('keydown', (e) => {
  const code = e.code || '';
  if (window.gameControls.isOptionsOpen()) return;

  if (code === 'KeyC' && isGameStarted && !isPaused && !e.repeat) {
    if (typeof deployChaff === 'function') deployChaff(scene, playerContainer);
    return;
  }

  const actions = window.gameControls.getActionsForCode(code);
  if (code === 'Space' || actions.includes('missiles')) e.preventDefault();
  if (!actions.length) return;
  if (actions.includes('advanceTime')) {
    manualHourOffset = (manualHourOffset + 2) % 24;
    if (typeof updateDayNightCycle === 'function') {
      updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode);
    }
    return;
  }

  if (!isGameStarted) {
    if (actions.includes('startMission')) startMission();
    return;
  }

  if (typeof isGameOver !== 'undefined' && isGameOver) {
    if (actions.includes('restartAfterDefeat')) {
      window.location.reload();
    } else if (actions.includes('menuAfterDefeat') || actions.includes('returnMenu')) {
      returnToStartScreen();
    }
    return;
  }

  if (actions.includes('returnMenu')) {
    returnToStartScreen();
    return;
  }

  if (e.repeat) return;

  if (actions.includes('pause')) {
    togglePause();
    return;
  }

  if (actions.includes('music')) {
    if (typeof toggleMusic === 'function') toggleMusic();
    return;
  }

  if (isPaused || (typeof isPlayerDying !== 'undefined' && isPlayerDying)) return;
  for (const action of continuousControlActions) {
    if (actions.includes(action)) {
      keyboardHeldActions.add(action);
      keys[window.gameControls.getStateKey(action)] = true;
    }
  }
  if (actions.includes('fighter')) transformTo('FIGHTER');
  if (actions.includes('gerwalk')) transformTo('GERWALK');
  if (actions.includes('battroid')) transformTo('BATTROID');
  if (actions.includes('melee')) triggerGunpodMelee();
  if (actions.includes('turbo')) startAcceleration();
  if (actions.includes('brake')) triggerFullStop();
  if (actions.includes('reverse')) startReverseGerwalk();
  if (actions.includes('tracking')) {
    if (typeof cycleBattroidTracking === 'function') cycleBattroidTracking();
  }
}, true);

window.addEventListener('click', (e) => {
  if (!isGameStarted) return;
  if (typeof isGameOver !== 'undefined' && isGameOver) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    if (Math.abs(e.clientY - (cy + 38)) < 28) {
      if (Math.abs(e.clientX - (cx - 78)) < 55) {
        window.location.reload();
      } else if (Math.abs(e.clientX - (cx + 78)) < 55) {
        returnToStartScreen();
      }
    }
  }
});

window.addEventListener('keyup', (e) => {
  const code = e.code || '';
  const actions = window.gameControls.getActionsForCode(code);
  for (const action of continuousControlActions) {
    if (actions.includes(action)) {
      keyboardHeldActions.delete(action);
      keys[window.gameControls.getStateKey(action)] = false;
    }
  }
  if (window.gameControls.isOptionsOpen()) return;
  if (actions.includes('turbo')) stopAcceleration();
  if (actions.includes('reverse')) stopReverseGerwalk();
});
window.addEventListener('macross:clear-inputs', () => {
  keyboardHeldActions.clear();
  gamepadHeldActions.clear();
  for (const action of continuousControlActions) keys[window.gameControls.getStateKey(action)] = false;
  releaseMobileHeldActions();
  stopAcceleration();
  stopReverseGerwalk();
});

function handleGamepadActionPress(action) {
  if (!isGameStarted) {
    if (action === 'startMission') startMission();
    return;
  }
  if (typeof isGameOver !== 'undefined' && isGameOver) {
    if (action === 'restartAfterDefeat') window.location.reload();
    else if (action === 'menuAfterDefeat' || action === 'returnMenu') returnToStartScreen();
    return;
  }
  if (action === 'returnMenu') { returnToStartScreen(); return; }
  if (action === 'pause') { togglePause(); return; }
  if (action === 'music') { if (typeof toggleMusic === 'function') toggleMusic(); return; }
  if (action === 'advanceTime') {
    manualHourOffset = (manualHourOffset + 2) % 24;
    if (typeof updateDayNightCycle === 'function') updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode);
    return;
  }
  if (isPaused || (typeof isPlayerDying !== 'undefined' && isPlayerDying)) return;
  if (action === 'fighter') transformTo('FIGHTER');
  if (action === 'gerwalk') transformTo('GERWALK');
  if (action === 'battroid') transformTo('BATTROID');
  if (action === 'transformNext' || action === 'transformPrevious') {
    if (action === 'transformPrevious' && currentMode === 'BATTROID') return;
    const modes = ['FIGHTER', 'GERWALK', 'BATTROID'];
    const currentIndex = Math.max(0, modes.indexOf(currentMode));
    const offset = action === 'transformNext' ? 1 : -1;
    transformTo(modes[(currentIndex + offset + modes.length) % modes.length]);
  }
  if (action === 'melee') triggerGunpodMelee();
  if (action === 'tracking' && typeof cycleBattroidTracking === 'function') cycleBattroidTracking();
  if (action === 'missileType' && typeof cycleMissileType === 'function') cycleMissileType();
  if (action === 'chaff' && typeof deployChaff === 'function') deployChaff(scene, playerContainer);
  if (action.startsWith('camera') && typeof setGamepadCameraView === 'function') setGamepadCameraView(action);
}
window.addEventListener('macross:gamepad-frame', event => {
  const next = new Set(event.detail.pressedActions || []);
  if (suppressNextGamepadFrame) {
    suppressNextGamepadFrame = false;
    for (const action of ['gunpod', 'missiles', 'brake']) {
      keys[window.gameControls.getStateKey(action)] = keyboardHeldActions.has(action) || mobileHeldActions.has(action);
    }
    gamepadHeldActions = next;
    return;
  }
  for (const action of ['gunpod', 'missiles', 'brake']) {
    const keyCode = window.gameControls.getStateKey(action);
    keys[keyCode] = next.has(action) || keyboardHeldActions.has(action) || mobileHeldActions.has(action);
  }
  keys.GamepadMoveForward = next.has('moveForward') || mobileHeldActions.has('moveForward');
  keys.GamepadMoveBack = next.has('moveBack') || mobileHeldActions.has('moveBack');
  keys.GamepadTurnLeft = next.has('turnLeft') || mobileGyroInputs.turnLeft;
  keys.GamepadTurnRight = next.has('turnRight') || mobileGyroInputs.turnRight;
  keys.GamepadGerwalkTurnLeft = next.has('moveLeft') || mobileGyroInputs.gerwalkTurnLeft;
  keys.GamepadGerwalkTurnRight = next.has('moveRight') || mobileGyroInputs.gerwalkTurnRight;
  keys.GamepadRollLeft = next.has('turnLeft') || mobileGyroInputs.rollLeft;
  keys.GamepadRollRight = next.has('turnRight') || mobileGyroInputs.rollRight;
  keys.GamepadPitchUp = next.has('verticalUp') || mobileGyroInputs.pitchUp;
  keys.GamepadPitchDown = next.has('verticalDown') || mobileGyroInputs.pitchDown;
  keys.GamepadGerwalkUp = next.has('gerwalkUp') || mobileGyroInputs.gerwalkUp;
  keys.GamepadGerwalkDown = next.has('gerwalkDown') || mobileGyroInputs.gerwalkDown;
  keys.GamepadLB = next.has('strafeLeft');
  keys.GamepadRB = next.has('strafeRight');
  keys.GamepadDescend = next.has('descend');
  keys.GamepadTargetLock = next.has('targetLock') || mobileHeldActions.has('targetLock');
  keys.GamepadThrust = (next.has('turbo') || mobileHeldActions.has('turbo')) && currentMode === 'GERWALK';
  keys.GamepadSlowdown = next.has('slowdown');

  const transformCombo = next.has('transformPrevious') && next.has('transformNext');
  const justTransformCombo = transformCombo && !(gamepadHeldActions.has('transformPrevious') && gamepadHeldActions.has('transformNext'));
  if (justTransformCombo && isGameStarted && !isPaused && !isGameOver && !isPlayerDying) {
    transformTo(currentMode === 'FIGHTER' ? 'BATTROID' : 'FIGHTER');
  }

  if (next.has('turbo') && !gamepadHeldActions.has('turbo') && isGameStarted && !isPaused) {
    if (currentMode === 'BATTROID' && typeof triggerBattroidImpulse === 'function') triggerBattroidImpulse(keys);
    else if (currentMode === 'FIGHTER') startAcceleration();
  }
  if (!next.has('turbo') && gamepadHeldActions.has('turbo')) stopAcceleration();
  if (next.has('reverse') && !gamepadHeldActions.has('reverse') && isGameStarted && !isPaused && !isGameOver && !isPlayerDying) startReverseGerwalk();
  if (!next.has('reverse') && gamepadHeldActions.has('reverse')) stopReverseGerwalk();
  for (const action of next) {
    if (!gamepadHeldActions.has(action)) {
      const isHeldAction = ['turbo', 'reverse', 'slowdown', 'strafeLeft', 'strafeRight', 'descend', 'targetLock', 'gerwalkUp', 'gerwalkDown'].includes(action) || continuousControlActions.includes(action);
      const isTransformAction = action === 'transformPrevious' || action === 'transformNext';
      if (!isHeldAction && !(justTransformCombo && isTransformAction)) handleGamepadActionPress(action);
    }
  }
  gamepadHeldActions = next;
});

let fpsFrames = 0;
let fpsTime = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();
  const delta = (isPaused || !isGameStarted || window.gameControls.isOptionsOpen()) ? 0 : Math.min(rawDelta, 0.05);

  if (typeof updateDayNightCycle === 'function') {
    updateDayNightCycle(scene, ambientLight, hemiLight, dirLight, manualHourOffset, timeOfDayMode);
  }

  if (!isGameStarted) {
    const safeDelta = Math.min(rawDelta, 0.05);
    if (typeof updateEnvironment === 'function') updateEnvironment(safeDelta);
    introOrbitAngle += 0.25 * safeDelta;
    const camDist = 3.2;
    camera.position.set(
      playerContainer.position.x + Math.sin(introOrbitAngle) * camDist,
      playerContainer.position.y + 0.85,
      playerContainer.position.z + Math.cos(introOrbitAngle) * camDist
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(playerContainer.position);
    renderer.render(scene, camera);
    return;
  }

  fpsFrames++;
  fpsTime += rawDelta;
  if (fpsTime >= 0.4) {
    const currentFps = Math.round(fpsFrames / fpsTime);
    fpsEl.textContent = 'FPS: ' + currentFps;
    fpsEl.style.color = currentFps >= 50 ? '#4ade80' : (currentFps >= 30 ? '#facc15' : '#f87171');
    fpsFrames = 0;
    fpsTime = 0;
  }

  if (!isPaused) {
    if (typeof updateEnvironment === 'function') updateEnvironment(delta);
    updatePlayerAnimation(delta);
    updateEnemies(delta, playerContainer);
    updateWeapons(delta, scene, camera, playerContainer, velocity, keys);
    updatePlayerPhysics(delta, playerContainer, visualTiltGroup, camera, keys, hudEl);
  }

  const isFullStop = Boolean(keys['KeyX']);
  let closestLockedMissileDist = Infinity;
  if (typeof enemyMissiles !== 'undefined' && enemyMissiles.length > 0) {
    for (let i = 0; i < enemyMissiles.length; i++) {
      const em = enemyMissiles[i];
      if (em.isLockedOn) {
        const d = em.mesh.position.distanceTo(playerContainer.position);
        if (d < closestLockedMissileDist) closestLockedMissileDist = d;
      }
    }
  }

  const isFiringGun = Boolean(keys['ShiftLeft']);
  const hasLockedTargets = (typeof lockedEnemies !== 'undefined' && lockedEnemies.length > 0);

  if (typeof updateEngineAudio === 'function') {
    updateEngineAudio(
      delta,
      isPaused,
      isFullStop,
      isAccelerating,
      currentMode,
      throttle,
      velocity.length(),
      closestLockedMissileDist,
      isFiringGun,
      hasLockedTargets
    );
  }

  drawDYRLHud(delta, camera, playerContainer, enemies, isPaused);
  renderer.render(scene, camera);
}
animate();

function resizeGameSurface() {
  const width = Math.round(window.visualViewport?.width || window.innerWidth);
  const height = Math.round(window.visualViewport?.height || window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  resizeHudCanvas();
}
window.addEventListener('resize', resizeGameSurface, { passive: true });
window.addEventListener('orientationchange', resizeGameSurface, { passive: true });
window.visualViewport?.addEventListener('resize', resizeGameSurface, { passive: true });
