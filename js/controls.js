(() => {
  const defaults = {
    moveForward: 'KeyW', moveBack: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD',
    turnLeft: 'ArrowLeft', turnRight: 'ArrowRight', verticalUp: 'ArrowUp', verticalDown: 'ArrowDown',
    fighter: 'KeyF', gerwalk: 'KeyG', battroid: 'KeyB',
    gunpod: 'ShiftLeft', melee: 'KeyE', missiles: 'Space',
    turbo: 'KeyT', reverse: 'KeyR', tracking: 'KeyN', brake: 'KeyX',
    pause: 'KeyP', music: 'KeyM', advanceTime: 'KeyH',
    startMission: 'Enter', returnMenu: 'Escape', restartAfterDefeat: 'KeyY', menuAfterDefeat: 'KeyN'
  };
  const gamepadDefaults = {
    moveForward: 'button12', moveBack: 'button13', moveLeft: 'axis2-', moveRight: 'axis2+',
    turnLeft: 'axis0-', turnRight: 'axis0+', verticalUp: 'axis1+', verticalDown: 'axis1-',
    gerwalkUp: 'axis3-', gerwalkDown: 'axis3+',
    transformPrevious: 'button14', transformNext: 'button15',
    gunpod: 'button2', missiles: 'button1', targetLock: 'button0', melee: 'button3', chaff: 'button11',
    missileType: 'none', turbo: 'button7', reverse: 'button6', slowdown: 'none', brake: 'none',
    strafeLeft: 'button4', strafeRight: 'button5', descend: 'none',
    cameraMissiles: 'none', cameraEnemy: 'none', cameraLeft: 'none', cameraRight: 'none',
    pause: 'button9',
    startMission: 'button9', returnMenu: 'none', restartAfterDefeat: 'button0', menuAfterDefeat: 'button1'
  };
  const categories = {
    moveForward: 'flight', moveBack: 'flight', moveLeft: 'flight', moveRight: 'flight',
    turnLeft: 'flight', turnRight: 'flight', verticalUp: 'flight', verticalDown: 'flight', gerwalkUp: 'flight', gerwalkDown: 'flight', turbo: 'flight', reverse: 'flight',
    fighter: 'transform', gerwalk: 'transform', battroid: 'transform', transformPrevious: 'transform', transformNext: 'transform',
    gunpod: 'attack', melee: 'attack', missiles: 'attack', tracking: 'attack', targetLock: 'attack', missileType: 'attack',
    brake: 'systems', pause: 'systems', music: 'systems', advanceTime: 'systems', chaff: 'systems', cameraMissiles: 'systems', cameraEnemy: 'systems', cameraLeft: 'systems', cameraRight: 'systems',
    strafeLeft: 'flight', strafeRight: 'flight', descend: 'flight', slowdown: 'flight',
    startMission: 'menu', returnMenu: 'menu', restartAfterDefeat: 'menu', menuAfterDefeat: 'menu'
  };
  const stateKeys = {
    moveForward: 'KeyW', moveBack: 'KeyS', moveLeft: 'KeyA', moveRight: 'KeyD',
    turnLeft: 'ArrowLeft', turnRight: 'ArrowRight', verticalUp: 'ArrowUp', verticalDown: 'ArrowDown',
    gunpod: 'ShiftLeft', missiles: 'Space', brake: 'KeyX', slowdown: 'GamepadSlowdown'
  };
  const storageKey = 'macrossvoxp-keyboard-controls-v1';
  const gamepadStorageKey = 'macrossvoxp-gamepad-controls-v4';
  const actionNames = Object.keys(defaults);
  const gamepadActionNames = Object.keys(gamepadDefaults);
  const gamepadDiagramObjects = {
    xbox: document.getElementById('gamepadDiagramXbox'),
    ps2: document.getElementById('gamepadDiagramPs2')
  };
  const gamepadDiagramPaths = {
    xbox: {
      'axis1-': ['path129', 'path128'], 'axis1+': ['path117', 'path116'],
      'axis0-': ['path121', 'path120'], 'axis0+': ['path123', 'path122'],
      'axis3-': ['path131', 'path130'], 'axis3+': ['path115', 'path114'],
      'axis2-': ['path125', 'path124'], 'axis2+': ['path127', 'path126'],
      button0: ['path133', 'path132'], button1: ['path139', 'path138'],
      button2: ['path137', 'path136'], button3: ['path153', 'path152'],
      button4: ['path113', 'path112'], button5: ['path111', 'path110'],
      button6: ['path109', 'path108'], button7: ['path107', 'path106'],
      button8: ['path141', 'path140'], button9: ['path143', 'path142'],
      button10: ['path145', 'path144'],
      button11: ['path119', 'path118'],
      button12: ['path151', 'path150'], button13: ['path135', 'path134'],
      button14: ['path147', 'path146'], button15: ['path149', 'path148']
    },
    ps2: {
      'axis1-': ['path46', 'path45'], 'axis1+': ['path30', 'path29'],
      'axis0-': ['path38', 'path37'], 'axis0+': ['path40', 'path39'],
      'axis3-': ['path48', 'path47'], 'axis3+': ['path32', 'path31'],
      'axis2-': ['path42', 'path41'], 'axis2+': ['path44', 'path43'],
      button0: ['path50', 'path49'], button1: ['path56', 'path55'],
      button2: ['path54', 'path53'], button3: ['path69', 'path68'],
      button4: ['path26', 'path25'], button5: ['path28', 'path27'],
      button6: ['path22', 'path21'], button7: ['path24', 'path23'],
      button8: ['path64', 'path63'], button9: ['path62', 'path61'],
      button10: ['path34', 'path33'], button11: ['path36', 'path35'],
      button12: ['path66', 'path65'], button13: ['path52', 'path51'],
      button14: ['path58', 'path57'], button15: ['path60', 'path59']
    }
  };
  const gamepadDiagramColors = {
    flight: '#38bdf8', transform: '#f59e0b', attack: '#f87171',
    systems: '#22c55e', menu: '#94a3b8', neutral: '#163d56'
  };
  let activeGamepadDiagram = 'xbox';
  let lastDetectedGamepadDiagram = null;
  let gamepadMissingSince = null;
  const labelMap = {
    KeyW: 'W', KeyS: 'S', KeyA: 'A', KeyD: 'D', KeyF: 'F', KeyG: 'G', KeyB: 'B', KeyE: 'E',
    KeyT: 'T', KeyR: 'R', KeyN: 'N', KeyX: 'X', KeyP: 'P', KeyM: 'M', KeyH: 'H', KeyY: 'Y',
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'SHIFT IZQ.', ShiftRight: 'SHIFT DER.',
    Space: 'ESPACIO', Escape: 'ESC', Enter: 'ENTER', NumpadEnter: 'NUM ENTER', NumpadAdd: 'NUM +',
    NumpadSubtract: 'NUM −', NumpadMultiply: 'NUM ×', NumpadDivide: 'NUM ÷', NumpadDecimal: 'NUM .', NumLock: 'NUM LOCK',
    ControlLeft: 'CTRL IZQ.', ControlRight: 'CTRL DER.', AltLeft: 'ALT IZQ.', AltRight: 'ALT GR', MetaLeft: 'WIN'
  };
  const padButtonNames = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'SELEC. / ATRÁS', 9: 'INICIO', 10: 'L3 · CLIC', 11: 'R3 · CLIC',
    12: 'CRUCETA ↑', 13: 'CRUCETA ↓', 14: 'CRUCETA ←', 15: 'CRUCETA →'
  };
  const flightModes = ['FIGHTER', 'GERWALK', 'BATTROID'];
  const actionContexts = {
    startMission: ['TITLE'],
    returnMenu: flightModes,
    restartAfterDefeat: ['DEFEAT'],
    menuAfterDefeat: ['DEFEAT'],
    tracking: ['BATTROID'],
    targetLock: ['BATTROID'],
    reverse: ['GERWALK'],
    moveLeft: ['GERWALK'], moveRight: ['GERWALK'],
    turnLeft: ['FIGHTER', 'BATTROID'], turnRight: ['FIGHTER', 'BATTROID'],
    gerwalkUp: ['GERWALK'],
    gerwalkDown: ['GERWALK'],
    strafeLeft: ['GERWALK', 'BATTROID'],
    strafeRight: ['GERWALK', 'BATTROID'],
    descend: ['GERWALK', 'BATTROID'],
    slowdown: ['FIGHTER', 'GERWALK'],
    transformPrevious: ['FIGHTER', 'GERWALK'],
    cameraMissiles: flightModes,
    cameraEnemy: flightModes,
    cameraLeft: flightModes,
    cameraRight: flightModes
  };
  const actionScopeLabels = {
    moveForward: 'FIGHTER: ACELERAR · OTROS: AVANZAR', moveBack: 'FIGHTER: FRENAR · OTROS: RETROCEDER',
    moveLeft: 'FIGHTER: GUIÑADA · OTROS: GIRO', moveRight: 'FIGHTER: GUIÑADA · OTROS: GIRO',
    turnLeft: 'FIGHTER: ALABEO · OTROS: GIRO', turnRight: 'FIGHTER: ALABEO · OTROS: GIRO',
    verticalUp: 'FIGHTER: CABECEO · OTROS: ASCENSO', verticalDown: 'FIGHTER: CABECEO · OTROS: DESCENSO',
    turbo: 'IMPULSO / PROPULSORES', reverse: 'SOLO GERWALK', tracking: 'SOLO BATTROID',
    targetLock: 'SOLO BATTROID · MANTENER', strafeLeft: 'GERWALK · BATTROID', strafeRight: 'GERWALK · BATTROID',
    descend: 'GERWALK · BATTROID', slowdown: 'FIGHTER · GERWALK',
    transformPrevious: 'SECUENCIA DE MODOS', transformNext: 'SECUENCIA DE MODOS',
    gunpod: 'DURANTE LA PARTIDA · TODOS LOS MODOS', missiles: 'DURANTE LA PARTIDA · TODOS LOS MODOS',
    missileType: 'DURANTE LA PARTIDA', brake: 'DURANTE LA PARTIDA',
    startMission: 'MENÚ INICIAL', returnMenu: 'DURANTE LA PARTIDA',
    restartAfterDefeat: 'TRAS DERROTA', menuAfterDefeat: 'TRAS DERROTA',
    pause: 'DURANTE LA PARTIDA', music: 'DURANTE LA PARTIDA', advanceTime: 'DURANTE LA PARTIDA'
  };
  const gamepadScopeLabels = {
    moveForward: 'CRUCETA ↑ · EMPUJE / AVANCE', moveBack: 'CRUCETA ↓ · REDUCIR / RETROCEDER',
    moveLeft: 'GERWALK: GIRO IZQUIERDO', moveRight: 'GERWALK: GIRO DERECHO',
    turnLeft: 'FIGHTER: ALABEO · BATTROID: GIRO IZQ.', turnRight: 'FIGHTER: ALABEO · BATTROID: GIRO DER.',
    verticalUp: 'STICK IZQ. ↓ · SUBIR NARIZ', verticalDown: 'STICK IZQ. ↑ · BAJAR NARIZ',
    gerwalkUp: 'STICK DER. ↑ · SUBIR EN GERWALK', gerwalkDown: 'STICK DER. ↓ · BAJAR EN GERWALK',
    turbo: 'RT · MANTENER TURBO', reverse: 'LT · MANTENER REVERSA GERWALK',
    slowdown: 'SIN ASIGNAR',
    strafeLeft: 'FIGHTER: GIRO CERRADO · OTROS: LATERAL',
    strafeRight: 'FIGHTER: GIRO CERRADO · OTROS: LATERAL',
    descend: 'SIN ASIGNAR', chaff: 'R3 · CHAFF / FLARES'
  };
  const continuousActions = ['moveForward', 'moveBack', 'moveLeft', 'moveRight', 'turnLeft', 'turnRight', 'verticalUp', 'verticalDown', 'gunpod', 'missiles', 'brake'];

  const optionsScreen = document.getElementById('optionsScreen');
  const statusEl = document.getElementById('bindingStatus');
  const startOptionsButton = document.getElementById('btnOptions');
  const optionsButtons = [startOptionsButton, document.getElementById('btnOptionsHud')].filter(Boolean);
  const closeButtons = [document.getElementById('btnCloseOptions'), document.getElementById('btnBackOptions')].filter(Boolean);
  const tabs = [...document.querySelectorAll('[data-options-tab]')];
  const categoryTabs = [...document.querySelectorAll('[data-options-category]')];
  let optionsOpen = false;
  let pauseOptionsOpen = false;
  let listeningAction = null;
  let listeningPadAction = null;
  let optionsTrigger = startOptionsButton;
  let previousPadSnapshot = { buttons: [], axes: [] };
  let previousPadActions = new Set();
  let previousMenuAccept = false;
  let previousMenuBack = false;
  let lastMenuDirection = null;
  let lastMenuDirectionAt = 0;
  let bindings = readMap(storageKey, defaults);
  let gamepadBindings = readMap(gamepadStorageKey, gamepadDefaults);

  function readMap(key, fallback) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      const candidate = { ...fallback };
      Object.keys(fallback).forEach(action => {
        if (saved && typeof saved[action] === 'string') candidate[action] = saved[action];
      });
      return candidate;
    } catch (_) {
      return { ...fallback };
    }
  }

  function validCode(code) {
    return typeof code === 'string' && /^[A-Za-z][A-Za-z0-9]{0,23}$/.test(code);
  }

  function keyLabel(code) {
    if (labelMap[code]) return labelMap[code];
    if (code.startsWith('Numpad')) return `NUM ${code.slice(6).toUpperCase()}`;
    return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Arrow/, '').toUpperCase();
  }

  function padLabel(input) {
    if (!input || input === 'none') return 'SIN ASIGNAR';
    if (input.startsWith('button')) return padButtonNames[input.slice(6)] || `BOTÓN ${Number(input.slice(6)) + 1}`;
    const match = input.match(/^axis([0-3])([+-])$/);
    if (!match) return input.toUpperCase();
    const labels = [
      ['STICK IZQ. ←', 'STICK IZQ. →'], ['STICK IZQ. ↑', 'STICK IZQ. ↓'],
      ['STICK DER. ←', 'STICK DER. →'], ['STICK DER. ↑', 'STICK DER. ↓']
    ];
    return labels[Number(match[1])][match[2] === '-' ? 0 : 1];
  }

  function contextsFor(action, device) {
    if (actionContexts[action]) return actionContexts[action];
    if (action === 'startMission') return ['TITLE'];
    if (action === 'restartAfterDefeat' || action === 'menuAfterDefeat') return ['DEFEAT'];
    return flightModes;
  }

  function mayShare(first, second, device) {
    if (device === 'gamepad' && ((first === 'missiles' && second === 'targetLock') || (first === 'targetLock' && second === 'missiles'))) return true;
    const firstContexts = contextsFor(first, device);
    const secondContexts = contextsFor(second, device);
    return !firstContexts.some(context => secondContexts.includes(context));
  }

  function conflictsFor(map, device) {
    const conflicts = new Set();
    const names = device === 'gamepad' ? gamepadActionNames : actionNames;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i];
        const b = names[j];
        if (!map[a] || map[a] === 'none' || map[a] !== map[b] || mayShare(a, b, device)) continue;
        conflicts.add(a);
        conflicts.add(b);
      }
    }
    return conflicts;
  }

  function allConflicts() {
    return { keyboard: conflictsFor(bindings, 'keyboard'), gamepad: conflictsFor(gamepadBindings, 'gamepad') };
  }

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('error', isError);
  }

  function shakePanel() {
    const panel = document.querySelector('.options-panel');
    if (!panel) return;
    panel.classList.remove('is-shaking');
    void panel.offsetWidth;
    panel.classList.add('is-shaking');
    setTimeout(() => panel.classList.remove('is-shaking'), 360);
  }

  function updateConflictUI() {
    const conflicts = allConflicts();
    document.querySelectorAll('.binding-row[data-action]').forEach(row => {
      const conflict = conflicts.keyboard.has(row.dataset.action);
      row.classList.toggle('has-conflict', conflict);
      row.querySelector('.binding-value').classList.toggle('has-conflict', conflict);
    });
    document.querySelectorAll('.gamepad-binding-row[data-pad-action]').forEach(row => {
      const conflict = conflicts.gamepad.has(row.dataset.padAction);
      row.classList.toggle('has-conflict', conflict);
      row.querySelector('.pad-binding-value').classList.toggle('has-conflict', conflict);
    });
    document.querySelectorAll('.keyboard-key[data-key-code]').forEach(button => {
      button.classList.toggle('has-conflict', [...conflicts.keyboard].some(action => bindings[action] === button.dataset.keyCode));
    });
    const activeCategory = document.querySelector('[data-options-category].active')?.dataset.optionsCategory;
    const activeDevice = document.querySelector('[data-options-tab].active')?.dataset.optionsTab;
    let visibleConflicts = new Set();
    let visibleName = '';
    if (optionsOpen && activeCategory === 'controlsOptions') {
      if (activeDevice === 'gamepadPane') {
        visibleConflicts = conflicts.gamepad;
        visibleName = 'mando';
      } else {
        visibleConflicts = conflicts.keyboard;
        visibleName = 'teclado';
      }
    }
    if (visibleConflicts.size) {
      setStatus(`Hay ${visibleConflicts.size} asignaciones del ${visibleName} en conflicto. Están marcadas en rojo; corrígelas para guardar o salir.`, true);
    } else if (statusEl?.classList.contains('error')) {
      setStatus('');
    }
    return conflicts;
  }

  function hasAnyConflict() {
    const conflicts = allConflicts();
    return conflicts.keyboard.size > 0 || conflicts.gamepad.size > 0;
  }

  function revealConflictTab() {
    const conflicts = allConflicts();
    if (conflicts.gamepad.size) {
      const tab = categoryTabs.find(button => button.dataset.optionsCategory === 'controlsOptions');
      if (tab && !tab.classList.contains('active')) openCategory(tab);
      const deviceTab = tabs.find(button => button.dataset.optionsTab === 'gamepadPane');
      if (deviceTab && !deviceTab.classList.contains('active')) openTab(deviceTab);
    } else if (conflicts.keyboard.size) {
      const tab = categoryTabs.find(button => button.dataset.optionsCategory === 'controlsOptions');
      if (tab && !tab.classList.contains('active')) openCategory(tab);
      const deviceTab = tabs.find(button => button.dataset.optionsTab === 'keyboardPane');
      if (deviceTab && !deviceTab.classList.contains('active')) openTab(deviceTab);
    }
    updateConflictUI();
    shakePanel();
  }

  function actionsForCode(code) {
    return actionNames.filter(action => bindings[action] === code);
  }

  function actionsForPadInput(input) {
    return gamepadActionNames.filter(action => gamepadBindings[action] === input && input !== 'none');
  }

  function renderGamepadDiagram() {
    const controller = gamepadDiagramObjects[activeGamepadDiagram];
    const svgDocument = controller?.contentDocument;
    if (!svgDocument) return;
    const base = svgDocument.getElementById('path1');
    if (base) base.style.fill = gamepadDiagramColors.flight;
    // These are the uncolored, combined control traces left beneath the pieces
    // separated in the supplied SVG. The separate pieces below are the only
    // elements whose colors follow the player's bindings.
    const combinedXboxTrace = svgDocument.getElementById('path105');
    if (combinedXboxTrace) combinedXboxTrace.style.display = 'none';
    const traceSpeck = svgDocument.getElementById(activeGamepadDiagram === 'xbox' ? 'path105-6' : 'path67');
    if (traceSpeck) traceSpeck.style.display = 'none';

    svgDocument.querySelectorAll('path').forEach(zone => {
      if (zone === base || zone === combinedXboxTrace || zone === traceSpeck) return;
      zone.style.fill = gamepadDiagramColors.neutral;
      zone.style.fillOpacity = '0.4';
    });

    const pathsByInput = gamepadDiagramPaths[activeGamepadDiagram];
    Object.entries(pathsByInput).forEach(([input, ids]) => {
      const actions = actionsForPadInput(input);
      const action = actions[0];
      const color = action ? gamepadDiagramColors[categories[action]] : gamepadDiagramColors.neutral;
      ids.forEach(id => {
        const zone = svgDocument.getElementById(id);
        if (!zone) return;
        zone.style.fill = color;
        zone.style.fillOpacity = action ? '0.88' : '0.4';
      });
    });
  }

  function renderHelp() {
    const help = document.getElementById('controlsHelp');
    if (!help) return;
    const k = action => keyLabel(bindings[action]);
    help.innerHTML = `<b>BATTROID / GERWALK:</b> ${k('moveForward')}/${k('moveBack')} AVANCE | ${k('moveLeft')}/${k('moveRight')} LATERAL<br>` +
      `<b>FLECHAS:</b> ${k('turnLeft')}/${k('turnRight')} GIRAR | ${k('verticalUp')}/${k('verticalDown')} SUBIR/BAJAR<br>` +
      `<b>FIGHTER:</b> ${k('moveForward')}/${k('moveBack')} THROTTLE | ${k('moveLeft')}/${k('moveRight')} YAW | FLECHAS ROLL/PITCH<br>` +
      `<b>MODOS:</b> ${k('fighter')} FIGHTER | ${k('gerwalk')} GERWALK | ${k('battroid')} BATTROID<br>` +
      `<b>SISTEMAS:</b> ${k('turbo')} TURBO | ${k('reverse')} REVERSA | ${k('brake')} STOP | ${k('pause')} PAUSA | ${k('music')} MÚSICA | ${k('advanceTime')} +2 H<br>` +
      `<b>COMBATE:</b> ${k('gunpod')} GUNPOD | ${k('missiles')} MISILES | ${k('tracking')} RASTREO (B) | ${k('melee')} GOLPE<br>` +
      `<b>MENÚ:</b> ${k('startMission')} INICIAR | ${k('returnMenu')} SALIR | ${k('restartAfterDefeat')}/${k('menuAfterDefeat')} TRAS DERROTA`;
    document.querySelectorAll('[data-binding-label]').forEach(el => { el.textContent = keyLabel(bindings[el.dataset.bindingLabel]); });
  }

  function renderKeyboard() {
    document.querySelectorAll('.keyboard-key[data-key-code]').forEach(button => {
      const code = button.dataset.keyCode;
      const usedActions = actionsForCode(code);
      button.classList.remove('is-bound', 'is-listening', 'category-flight', 'category-transform', 'category-attack', 'category-systems', 'category-menu');
      if (usedActions.length) {
        button.classList.add('is-bound');
        new Set(usedActions.map(action => categories[action])).forEach(category => button.classList.add(`category-${category}`));
      }
      if (listeningAction && bindings[listeningAction] === code) button.classList.add('is-listening');
    });
  }

  function renderBindings() {
    document.querySelectorAll('.binding-row[data-action]').forEach(row => {
      const action = row.dataset.action;
      row.dataset.category = categories[action];
      updateScopeLabel(row, action, false);
      row.querySelector('.binding-value').textContent = keyLabel(bindings[action]);
      row.classList.toggle('is-listening', action === listeningAction);
      row.querySelector('.rebind-button').textContent = action === listeningAction ? 'PULSA TECLA' : 'CAMBIAR';
    });
    document.querySelectorAll('.gamepad-binding-row[data-pad-action]').forEach(row => {
      const action = row.dataset.padAction;
      row.dataset.category = categories[action];
      updateScopeLabel(row, action, true);
      row.querySelector('.pad-binding-value').textContent = padLabel(gamepadBindings[action]);
      row.classList.toggle('is-listening', action === listeningPadAction);
      row.querySelector('.pad-rebind-button').textContent = action === listeningPadAction ? 'PRESIONA' : 'CAMBIAR';
    });
    renderKeyboard();
    renderGamepadDiagram();
    renderHelp();
    updateConflictUI();
  }

  function updateScopeLabel(row, action, isGamepad) {
    const name = row.querySelector(':scope > span');
    const label = isGamepad ? (gamepadScopeLabels[action] || actionScopeLabels[action]) : actionScopeLabels[action];
    if (!name || !label) return;
    let scope = name.querySelector('.binding-scope');
    if (!scope) {
      scope = document.createElement('small');
      scope.className = 'binding-scope';
      name.appendChild(scope);
    }
    scope.textContent = label;
  }

  function persistAll() {
    updateConflictUI();
    if (hasAnyConflict()) {
      revealConflictTab();
      return false;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(bindings));
      localStorage.setItem(gamepadStorageKey, JSON.stringify(gamepadBindings));
      setStatus('Configuración de teclado y mando guardada en este navegador.');
      return true;
    } catch (_) {
      setStatus('No se pudo guardar. El navegador bloqueó el almacenamiento local.', true);
      return false;
    }
  }

  function beginKeyboardListening(action) {
    listeningPadAction = null;
    listeningAction = action;
    const row = document.querySelector(`[data-action="${action}"]`);
    setStatus(`Pulsa una tecla para «${row.firstElementChild.textContent}». ESC cancela.`, false);
    renderBindings();
  }

  function assignKeyboard(action, code) {
    if (!validCode(code)) return false;
    bindings[action] = code;
    listeningAction = null;
    renderBindings();
    if (allConflicts().keyboard.size) return false;
    setStatus(`${keyLabel(code)} asignada. Guarda los cambios para conservarlos.`, false);
    return true;
  }

  function beginGamepadListening(action) {
    listeningAction = null;
    listeningPadAction = action;
    const pad = getConnectedGamepad();
    previousPadSnapshot = snapshotPad(pad);
    const status = document.getElementById('gamepadStatus');
    if (!pad) status.textContent = 'No se detecta el mando. Conéctalo y luego presiona un botón para asignarlo.';
    else status.textContent = 'Presiona un botón o mueve un stick para asignarlo. ESC cancela.';
    setStatus(`Esperando una entrada para «${document.querySelector(`[data-pad-action="${action}"]`).firstElementChild.textContent}».`, false);
    renderBindings();
  }

  function assignGamepad(action, input) {
    gamepadBindings[action] = input;
    listeningPadAction = null;
    renderBindings();
    if (allConflicts().gamepad.size) return false;
    setStatus(`${padLabel(input)} asignado. Guarda los cambios para conservarlos.`, false);
    return true;
  }

  function openTab(tab) {
    tabs.forEach(button => {
      const active = button === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.options-pane').forEach(pane => {
      const active = pane.id === tab.dataset.optionsTab;
      pane.classList.toggle('active', active);
      pane.hidden = !active;
    });
    listeningAction = null;
    listeningPadAction = null;
    renderBindings();
  }

  function diagramTypeForGamepad(pad) {
    const id = String(pad?.id || '').toLowerCase();
    return /(xbox|xinput|microsoft|045e)/.test(id) ? 'xbox' : 'ps2';
  }

  function syncGamepadDiagram(pad) {
    let nextType;
    if (pad?.connected) {
      gamepadMissingSince = null;
      nextType = diagramTypeForGamepad(pad);
    } else {
      // Browsers can report a new connection event just before getGamepads()
      // refreshes its snapshot. Keep the current diagram briefly during that gap.
      if (lastDetectedGamepadDiagram === null) return;
      if (gamepadMissingSince === null) gamepadMissingSince = performance.now();
      if (performance.now() - gamepadMissingSince < 900) return;
      gamepadMissingSince = null;
      nextType = null;
    }
    if (nextType === lastDetectedGamepadDiagram) return;
    lastDetectedGamepadDiagram = nextType;

    const gamepadTab = tabs.find(tab => tab.dataset.optionsTab === 'gamepadPane');
    if (gamepadTab) gamepadTab.hidden = !nextType;
    if (!nextType) {
      const activeTab = document.querySelector('[data-options-tab].active');
      if (activeTab?.dataset.optionsTab === 'gamepadPane') {
        const keyboardTab = tabs.find(tab => tab.dataset.optionsTab === 'keyboardPane');
        if (keyboardTab) openTab(keyboardTab);
      }
      return;
    }

    activeGamepadDiagram = nextType;
    Object.entries(gamepadDiagramObjects).forEach(([name, controller]) => {
      if (controller) controller.hidden = name !== nextType;
    });
    renderGamepadDiagram();
  }

  function openCategory(tab) {
    categoryTabs.forEach(button => {
      const active = button === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.options-category-panel').forEach(panel => {
      const active = panel.id === tab.dataset.optionsCategory;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    listeningAction = null;
    listeningPadAction = null;
    if (tab.dataset.optionsCategory !== 'audioOptions') {
      const tester = document.getElementById('soundTester');
      if (tester) tester.pause();
    }
    renderBindings();
  }

  function showOptions(trigger, fromPause = false) {
    optionsTrigger = trigger || null;
    pauseOptionsOpen = fromPause;
    optionsOpen = true;
    listeningAction = null;
    listeningPadAction = null;
    optionsScreen.classList.remove('hidden');
    setStatus(fromPause
      ? 'Partida en pausa · los cambios se aplican al instante.'
      : 'Los controles se aplican al instante; los volúmenes se guardan automáticamente.');
    document.getElementById('btnContinueGame').hidden = !fromPause;
    document.getElementById('btnExitToTitle').hidden = !fromPause;
    document.getElementById('btnBackOptions').hidden = fromPause;
    renderBindings();
    window.dispatchEvent(new CustomEvent('macross:clear-inputs'));
    if (fromPause) {
      document.getElementById('btnCloseOptions').setAttribute('aria-label', 'Continuar jugando');
      document.dispatchEvent(new CustomEvent('macross:options-opened', { detail: { pause: true } }));
    } else {
      document.getElementById('btnCloseOptions').setAttribute('aria-label', 'Volver al menú');
      document.getElementById('btnCloseOptions').focus();
    }
  }

  function openOptions(event) {
    showOptions(event.currentTarget, false);
  }

  function openPauseOptions() {
    showOptions(null, true);
  }

  function closeOptions() {
    updateConflictUI();
    if (hasAnyConflict()) {
      revealConflictTab();
      return false;
    }
    const wasPauseMenu = pauseOptionsOpen;
    optionsOpen = false;
    pauseOptionsOpen = false;
    listeningAction = null;
    listeningPadAction = null;
    optionsScreen.classList.add('hidden');
    const tester = document.getElementById('soundTester');
    if (tester) tester.pause();
    setStatus('');
    window.dispatchEvent(new CustomEvent('macross:clear-inputs'));
    if (wasPauseMenu) {
      window.dispatchEvent(new CustomEvent('macross:resume-game'));
      document.activeElement?.blur();
    }
    if (optionsTrigger?.isConnected && !optionsTrigger.closest('.hidden')) optionsTrigger.focus();
    else if (!wasPauseMenu && startOptionsButton) startOptionsButton.focus();
    return true;
  }

  optionsButtons.forEach(button => button.addEventListener('click', openOptions));
  closeButtons.forEach(button => button.addEventListener('click', closeOptions));
  document.getElementById('btnContinueGame')?.addEventListener('click', closeOptions);
  tabs.forEach(tab => tab.addEventListener('click', () => openTab(tab)));
  categoryTabs.forEach(tab => tab.addEventListener('click', () => openCategory(tab)));
  Object.values(gamepadDiagramObjects).filter(Boolean).forEach(controller => controller.addEventListener('load', renderGamepadDiagram));
  window.addEventListener('gamepadconnected', event => syncGamepadDiagram(event.gamepad));
  window.addEventListener('gamepaddisconnected', () => syncGamepadDiagram(getConnectedGamepad()));
  window.addEventListener('focus', () => syncGamepadDiagram(getConnectedGamepad()));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncGamepadDiagram(getConnectedGamepad());
  });
  document.getElementById('btnSaveControls').addEventListener('click', persistAll);
  document.getElementById('btnResetControls').addEventListener('click', () => {
    bindings = { ...defaults };
    gamepadBindings = { ...gamepadDefaults };
    listeningAction = null;
    listeningPadAction = null;
    renderBindings();
    if (persistAll()) setStatus('Controles predeterminados restaurados y guardados.');
  });

  document.querySelectorAll('.rebind-button').forEach(button => button.addEventListener('click', () => beginKeyboardListening(button.closest('.binding-row').dataset.action)));
  document.querySelectorAll('.pad-rebind-button').forEach(button => button.addEventListener('click', () => beginGamepadListening(button.closest('.gamepad-binding-row').dataset.padAction)));
  document.querySelectorAll('.keyboard-key[data-key-code]').forEach(button => button.addEventListener('click', () => {
    if (listeningAction) assignKeyboard(listeningAction, button.dataset.keyCode);
  }));

  window.addEventListener('keydown', event => {
    if (!optionsOpen) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (listeningAction) {
      if (event.code === 'Escape') {
        listeningAction = null;
        setStatus('Cambio de tecla cancelado.');
        renderBindings();
      } else assignKeyboard(listeningAction, event.code);
      return;
    }
    if (listeningPadAction && event.code === 'Escape') {
      listeningPadAction = null;
      setStatus('Cambio de mando cancelado.');
      renderBindings();
      return;
    }
    if (event.code === 'Escape') closeOptions();
  }, true);

  window.addEventListener('keyup', event => {
    if (optionsOpen) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function getConnectedGamepad() {
    if (!navigator.getGamepads) return null;
    return [...navigator.getGamepads()].find(pad => pad && pad.connected) || null;
  }

  function snapshotPad(pad) {
    if (!pad) return { buttons: [], axes: [] };
    return {
      buttons: pad.buttons.map(button => Boolean(button.pressed || button.value > 0.55)),
      axes: pad.axes.map(value => Math.abs(value) > 0.28 ? value : 0)
    };
  }

  function readMenuDirection(pad) {
    if (!pad) return null;
    const dpad = [
      ['up', 12], ['down', 13], ['left', 14], ['right', 15]
    ];
    for (const [direction, index] of dpad) {
      const button = pad.buttons[index];
      if (button && (button.pressed || button.value > 0.55)) return direction;
    }
    const x = pad.axes[0] || 0;
    const y = pad.axes[1] || 0;
    if (Math.max(Math.abs(x), Math.abs(y)) < 0.58) return null;
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
    return y < 0 ? 'up' : 'down';
  }

  function detectNewPadInput(pad) {
    if (!pad) return null;
    const current = snapshotPad(pad);
    for (let i = 0; i < current.buttons.length; i++) {
      if (current.buttons[i] && !previousPadSnapshot.buttons[i]) {
        previousPadSnapshot = current;
        return `button${i}`;
      }
    }
    for (let i = 0; i < pad.axes.length; i++) {
      const value = pad.axes[i];
      const old = previousPadSnapshot.axes[i] || 0;
      if (Math.abs(value) > 0.68 && Math.abs(old) < 0.35) {
        previousPadSnapshot = current;
        return `axis${i}${value < 0 ? '-' : '+'}`;
      }
    }
    previousPadSnapshot = current;
    return null;
  }

  function inputIsDown(pad, input) {
    if (input.startsWith('button')) {
      const button = pad.buttons[Number(input.slice(6))];
      return Boolean(button && (button.pressed || button.value > 0.45));
    }
    const match = input.match(/^axis([0-3])([+-])$/);
    if (!match) return false;
    const value = pad.axes[Number(match[1])] || 0;
    return match[2] === '-' ? value < -0.28 : value > 0.28;
  }

  function pollGamepad() {
    const pad = getConnectedGamepad();
    syncGamepadDiagram(pad);
    const direction = readMenuDirection(pad);
    const now = performance.now();
    let menuDirection = null;
    if (direction) {
      if (direction !== lastMenuDirection || now - lastMenuDirectionAt >= 260) {
        menuDirection = direction;
        lastMenuDirectionAt = now;
      }
      lastMenuDirection = direction;
    } else {
      lastMenuDirection = null;
    }
    const acceptDown = Boolean(pad?.buttons[0] && (pad.buttons[0].pressed || pad.buttons[0].value > 0.55));
    const backDown = Boolean(pad?.buttons[1] && (pad.buttons[1].pressed || pad.buttons[1].value > 0.55));
    const menuAccept = acceptDown && !previousMenuAccept;
    const menuBack = backDown && !previousMenuBack;
    previousMenuAccept = acceptDown;
    previousMenuBack = backDown;
    if (menuDirection || menuAccept || menuBack) {
      window.dispatchEvent(new CustomEvent('macross:gamepad-menu-input', {
        detail: { direction: menuDirection, accept: menuAccept, back: menuBack }
      }));
    }
    const status = document.getElementById('gamepadStatus');
    if (status) {
      const nextStatus = pad ? `Mando conectado · ${pad.id.replace(/\s+/g, ' ').slice(0, 48)}` : 'Mando desconectado · conecta el control para probarlo.';
      if (!listeningPadAction) status.textContent = nextStatus;
    }
    if (optionsOpen && listeningPadAction) {
      const input = detectNewPadInput(pad);
      if (input) assignGamepad(listeningPadAction, input);
    }

    const pressedActions = new Set();
    if (pad && !optionsOpen) {
      gamepadActionNames.forEach(action => {
        const input = gamepadBindings[action];
        if (input && input !== 'none' && inputIsDown(pad, input)) pressedActions.add(action);
      });
    }
    window.dispatchEvent(new CustomEvent('macross:gamepad-frame', { detail: { pressedActions: [...pressedActions] } }));
    previousPadActions = pressedActions;
    requestAnimationFrame(pollGamepad);
  }

  window.gameControls = {
    getBinding: action => bindings[action],
    getActionsForCode: actionsForCode,
    getStateKey: action => stateKeys[action],
    getActionsForGamepadInput: actionsForPadInput,
    getGamepadBinding: action => gamepadBindings[action],
    getGamepadDiagramType: () => lastDetectedGamepadDiagram,
    keyLabel,
    gamepadLabel: padLabel,
    isOptionsOpen: () => optionsOpen,
    isListening: () => Boolean(listeningAction || listeningPadAction),
    openPauseOptions,
    closeOptions
  };

  renderBindings();
  requestAnimationFrame(pollGamepad);
})();
