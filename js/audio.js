const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const soundBuffers = {};

const AUDIO_SETTINGS_KEY = 'macrossvoxp-audio-settings-v1';
function readAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || 'null');
    return {
      sfx: Number.isFinite(Number(saved?.sfx)) ? Math.max(0, Math.min(100, Number(saved.sfx))) : 50,
      bgm: Number.isFinite(Number(saved?.bgm)) ? Math.max(0, Math.min(100, Number(saved.bgm))) : 50
    };
  } catch (_) {
    return { sfx: 50, bgm: 50 };
  }
}
const storedAudioSettings = readAudioSettings();

let sfxMasterGain = null;
let sfxVolumeLevel = storedAudioSettings.sfx / 100;

let bgmMasterGain = null;
let bgmVolumeLevel = storedAudioSettings.bgm / 100;
let bgmEnabled = true;
let bgmSource = null;

const TITLE_BGM_FILE = './sounds/TitleBGM.ogg';
const TITLE_BGM_VOLUME = 0.28;
let titleAudio = null;
let isTitleMusicActive = true;

let engineSource = null;
let engineGain = null;

let gunpodSource = null;
let gunpodGain = null;

let lockOnSource = null;
let lockOnGain = null;

let warningSource = null;
let warningGain = null;

const SOUND_FILES = {
  bgm: './sounds/DogF.ogg',
  boost: './sounds/Boost.ogg',
  gunpod: './sounds/Gunpod.ogg',
  heavyLaser: './sounds/HeavyLaser.ogg',
  lightLaser: './sounds/LightLaser.ogg',
  lockOn: './sounds/LockOn.ogg',
  missileLaunch: './sounds/MissileLaunch.ogg',
  missileWarning: './sounds/MissileWarning.ogg',
  transform: './sounds/Transform.ogg',
  engine: './sounds/ValkyrieEngine.ogg'
};

function setSFXVolume(percent) {
  sfxVolumeLevel = Math.max(0, Math.min(1, percent / 100));
  if (audioCtx && sfxMasterGain) {
    sfxMasterGain.gain.setTargetAtTime(sfxVolumeLevel, audioCtx.currentTime, 0.04);
  }
  saveAudioSettings();
}

function setBGMVolume(percent) {
  bgmVolumeLevel = Math.max(0, Math.min(1, percent / 100));
  if (audioCtx && bgmMasterGain && bgmEnabled) {
    bgmMasterGain.gain.setTargetAtTime(bgmVolumeLevel, audioCtx.currentTime, 0.04);
  }
  if (titleAudio) updateTitleMusicVolume();
  saveAudioSettings();
}

function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify({
      sfx: Math.round(sfxVolumeLevel * 100),
      bgm: Math.round(bgmVolumeLevel * 100)
    }));
  } catch (_) {}
}

function getAudioSettings() {
  return { sfx: Math.round(sfxVolumeLevel * 100), bgm: Math.round(bgmVolumeLevel * 100) };
}

function updateTitleMusicVolume() {
  if (!titleAudio) return;
  titleAudio.volume = Math.max(0, Math.min(1, TITLE_BGM_VOLUME * bgmVolumeLevel / 0.65));
}

function toggleMusic() {
  bgmEnabled = !bgmEnabled;
}
function initTitleMusic() {
  if (titleAudio) return;
  titleAudio = new Audio(TITLE_BGM_FILE);
  titleAudio.loop = true;
  updateTitleMusicVolume();
}

function playChaffSFX() {
  if (typeof unlockAudio === 'function') unlockAudio();
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;
  const outputNode = sfxMasterGain || audioCtx.destination;

  const sampleRate = audioCtx.sampleRate;
  const noiseLen = Math.floor(sampleRate * 0.28);
  const noiseBuffer = audioCtx.createBuffer(1, noiseLen, sampleRate);
  const channelData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    channelData[i] = Math.random() * 2 - 1;
  }

  for (let p = 0; p < 5; p++) {
    const startTime = now + p * 0.045;

    // 1. Estallido seco de eyección pirotécnica (más grave y con pegada)
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280 + p * 25, startTime);
    osc.frequency.exponentialRampToValueAtTime(55, startTime + 0.08);

    oscGain.gain.setValueAtTime(0.65, startTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.085);

    osc.connect(oscGain);
    oscGain.connect(outputNode);
    osc.start(startTime);
    osc.stop(startTime + 0.09);

    // 2. Chisporroteo brillante de bengala (filtro highpass abierto para máxima claridad)
    const noiseSrc = audioCtx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1400, startTime);

    const nGain = audioCtx.createGain();
    nGain.gain.setValueAtTime(0.75, startTime);
    nGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(outputNode);
    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + 0.25);
  }
}

function playTitleMusic() {
  isTitleMusicActive = true;
  initTitleMusic();
  if (titleAudio && titleAudio.paused) {
    updateTitleMusicVolume();
    titleAudio.play().catch(() => {});
  }
}

function stopTitleMusic() {
  isTitleMusicActive = false;
  if (titleAudio && !titleAudio.paused) {
    titleAudio.pause();
    titleAudio.currentTime = 0;
  }
}

function handleFirstInteraction() {
  if (isTitleMusicActive) {
    playTitleMusic();
  } else {
    unlockAudio();
  }
}

window.addEventListener('pointerdown', handleFirstInteraction);
window.addEventListener('keydown', handleFirstInteraction);

function startBGMLoop() {
  if (!audioCtx || !soundBuffers.bgm || bgmSource) return;

  bgmSource = audioCtx.createBufferSource();
  bgmSource.buffer = soundBuffers.bgm;
  bgmSource.loop = true;

  bgmSource.connect(bgmMasterGain);
  bgmSource.start(0);
}

function initAudioSystem() {
  if (audioCtx) return;
  audioCtx = new AudioCtx();

  sfxMasterGain = audioCtx.createGain();
  sfxMasterGain.gain.value = sfxVolumeLevel;
  sfxMasterGain.connect(audioCtx.destination);

  bgmMasterGain = audioCtx.createGain();
  bgmMasterGain.gain.value = (bgmEnabled && !isTitleMusicActive) ? bgmVolumeLevel : 0;
  bgmMasterGain.connect(audioCtx.destination);

  for (const key in SOUND_FILES) {
    fetch(SOUND_FILES[key])
      .then((res) => res.arrayBuffer())
      .then((data) => audioCtx.decodeAudioData(data))
      .then((buffer) => {
        soundBuffers[key] = buffer;
        if (key === 'engine') startEngineLoop();
        if (key === 'bgm') startBGMLoop();
      })
      .catch(() => {});
  }
}

function unlockAudio() {
  if (!audioCtx) initAudioSystem();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSFX(name, volume, pitchVariation) {
  if (!audioCtx || !soundBuffers[name]) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const source = audioCtx.createBufferSource();
  source.buffer = soundBuffers[name];

  const gainNode = audioCtx.createGain();
  gainNode.gain.value = volume !== undefined ? volume : 0.75;

  if (pitchVariation) {
    source.playbackRate.value = 1.0 + (Math.random() - 0.5) * pitchVariation;
  }

  source.connect(gainNode);
  gainNode.connect(sfxMasterGain || audioCtx.destination);
  source.start(0);
}
function updateMissileWarningAudio(closestDist) {
  if (!audioCtx || !soundBuffers.missileWarning) return;

  const isThreatActive = (typeof closestDist === 'number' && closestDist < 120);

  if (isThreatActive) {
    const proximity = 1.0 - Math.max(0, Math.min(1, (closestDist - 12) / 108));
    const targetVol = 0.15 + proximity * 0.75;

    if (!warningSource) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      warningSource = audioCtx.createBufferSource();
      warningSource.buffer = soundBuffers.missileWarning;
      warningSource.loop = true;

      warningGain = audioCtx.createGain();
      warningGain.gain.setValueAtTime(targetVol, audioCtx.currentTime);

      warningSource.connect(warningGain);
      warningGain.connect(sfxMasterGain || audioCtx.destination);
      warningSource.start(0);
    } else {
      warningGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.08);
    }
  } else if (warningSource) {
    const srcToStop = warningSource;
    const gainToFade = warningGain;
    warningSource = null;
    warningGain = null;

    const now = audioCtx.currentTime;
    gainToFade.gain.setValueAtTime(gainToFade.gain.value, now);
    gainToFade.gain.linearRampToValueAtTime(0.0, now + 0.06);
    setTimeout(() => {
      try { srcToStop.stop(); } catch (e) {}
    }, 70);
  }
}

function updateGunpodAudio(isFiring) {
  if (!audioCtx || !soundBuffers.gunpod) return;

  if (isFiring) {
    if (!gunpodSource) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      gunpodSource = audioCtx.createBufferSource();
      gunpodSource.buffer = soundBuffers.gunpod;
      gunpodSource.loop = true;

      gunpodGain = audioCtx.createGain();
      gunpodGain.gain.setValueAtTime(0.55, audioCtx.currentTime);

      gunpodSource.connect(gunpodGain);
      gunpodGain.connect(sfxMasterGain || audioCtx.destination);
      gunpodSource.start(0);
    }
  } else if (gunpodSource) {
    const srcToStop = gunpodSource;
    const gainToFade = gunpodGain;
    gunpodSource = null;
    gunpodGain = null;

    const now = audioCtx.currentTime;
    gainToFade.gain.setValueAtTime(gainToFade.gain.value, now);
    gainToFade.gain.linearRampToValueAtTime(0.0, now + 0.06);
    setTimeout(() => {
      try { srcToStop.stop(); } catch (e) {}
    }, 70);
  }
}

function updateLockOnAudio(hasLock) {
  if (!audioCtx || !soundBuffers.lockOn) return;

  if (hasLock) {
    if (!lockOnSource) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      lockOnSource = audioCtx.createBufferSource();
      lockOnSource.buffer = soundBuffers.lockOn;
      lockOnSource.loop = true;

      lockOnGain = audioCtx.createGain();
      lockOnGain.gain.setValueAtTime(0.65, audioCtx.currentTime);

      lockOnSource.connect(lockOnGain);
      lockOnGain.connect(sfxMasterGain || audioCtx.destination);
      lockOnSource.start(0);
    }
  } else if (lockOnSource) {
    const srcToStop = lockOnSource;
    const gainToFade = lockOnGain;
    lockOnSource = null;
    lockOnGain = null;

    const now = audioCtx.currentTime;
    gainToFade.gain.setValueAtTime(gainToFade.gain.value, now);
    gainToFade.gain.linearRampToValueAtTime(0.0, now + 0.05);
    setTimeout(() => {
      try { srcToStop.stop(); } catch (e) {}
    }, 60);
  }
}

function startEngineLoop() {
  if (!audioCtx || !soundBuffers.engine || engineSource) return;

  engineSource = audioCtx.createBufferSource();
  engineSource.buffer = soundBuffers.engine;
  engineSource.loop = true;

  engineGain = audioCtx.createGain();
  engineGain.gain.value = 0.0;

  engineSource.connect(engineGain);
  engineGain.connect(sfxMasterGain || audioCtx.destination);
  engineSource.start(0);
}

function silenceAllCombatAudio() {
  if (!audioCtx) return;
  if (bgmMasterGain) bgmMasterGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.05);
  if (engineGain) engineGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.05);
  updateGunpodAudio(false);
  updateLockOnAudio(false);
  updateMissileWarningAudio(Infinity);
}

function updateEngineAudio(delta, isPaused, isFullStop, isAccelerating, currentMode, throttle, speed, closestLockedMissileDist, isFiringGun, hasLockedTargets) {
  if (!audioCtx) return;

  if (isTitleMusicActive) {
    silenceAllCombatAudio();
    return;
  }

  const isDead = (typeof isPlayerDying !== 'undefined' && isPlayerDying) || (typeof isGameOver !== 'undefined' && isGameOver);

  if (bgmMasterGain) {
    let targetBgmVol = bgmEnabled ? bgmVolumeLevel : 0.0;
    if (isDead) targetBgmVol = 0.0;
    else if (isPaused) targetBgmVol *= 0.25;
    bgmMasterGain.gain.setTargetAtTime(targetBgmVol, audioCtx.currentTime, 0.1);
  }

  if (isPaused || isDead) {
    if (engineGain) engineGain.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.08);
    updateGunpodAudio(false);
    updateLockOnAudio(false);
    updateMissileWarningAudio(Infinity);
    return;
  }

  updateGunpodAudio(isFiringGun);
  updateLockOnAudio(hasLockedTargets);
  updateMissileWarningAudio(closestLockedMissileDist);

  if (!engineSource || !engineGain) return;

  let targetVol = 0.18;
  let targetPitch = 0.85;

  if (isFullStop) {
    targetVol = 0.05;
    targetPitch = 0.65;
  } else if (isAccelerating) {
    targetVol = 0.42;
    targetPitch = 1.45;
  } else if (currentMode === 'FIGHTER') {
    targetVol = 0.16 + throttle * 0.22;
    targetPitch = 0.85 + throttle * 0.48;
  } else if (currentMode === 'GERWALK') {
    targetVol = 0.24;
    targetPitch = 1.05;
  } else if (currentMode === 'BATTROID') {
    targetVol = speed > 1.0 ? 0.22 : 0.12;
    targetPitch = speed > 1.0 ? 1.0 : 0.8;
  }

  engineGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.1);
  engineSource.playbackRate.setTargetAtTime(targetPitch, audioCtx.currentTime, 0.12);
}

playTitleMusic();
