// THE MERIDIAN JOB — boot, fixed-step loop, screens and the rules
// that tie the systems together. Played with keyboard and mouse in
// a desktop browser; no network, no build step, no libraries.

import { VIEW_W, VIEW_H, HUD_H, PLAY_TOP, PLAY_BOTTOM, START_LIVES, LASER_ON_SECONDS, LASER_OFF_SECONDS, LASER_ALARM_HIT, TIME_BONUS_PER_SECOND } from './config.js';
import { buildRoom, hasLineOfSight } from './room.js';
import { createInput, attachInput, endFrame } from './input.js';
import { createPlayer, updatePlayer, pressInteract, holdInteract, exitOpen, onExit } from './player.js';
import { createGuard, updateGuard } from './guard.js';
import { createCamera, createSearchlight, updateCamera, updateSearchlight } from './camera.js';
import { updateAlarm } from './alarm.js';
import { createTools, createVaultState, updateVault, useSelectedTool, restockTools } from './tools.js';
import { drawWorld } from './render.js';
import { drawHud, drawMinimap, drawTitle, drawPause, drawIntermission, drawCaught, drawGameOver, drawWin } from './hud.js';
import { stageShot } from './shots.js';
import { findPath } from './path.js';
import { setMuted, isMuted, soundClick, soundWin, soundLose, soundCaught, soundAlarm } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const input = createInput();
attachInput(input, canvas);

window.addEventListener('error', (event) => {
  const where = (event.filename || '') + ':' + (event.lineno || '?') + ':' + (event.colno || '?');
  document.title = 'ERR: ' + event.message + ' @ ' + where;
  const el = document.getElementById('test-result');
  if (el) el.textContent = 'ERR: ' + event.message + ' @ ' + where;
});

export function createGameState(roomIndex) {
  const room = buildRoom(roomIndex);
  const state = {
    room,
    roomIndex,
    screen: 'title',
    time: 0,
    elapsed: 0,
    player: createPlayer(room.playerStart),
    guards: room.guards.map(createGuard),
    cameras: room.cameras.map(createCamera),
    searchlight: createSearchlight(room.searchlight),
    vault: createVaultState(),
    tools: createTools(),
    smokeClouds: [],
    alarm: room.alarmStart,
    maxAlarm: room.alarmStart,
    lockdownT: 0,
    cameraSpotted: false,
    lives: START_LIVES,
    bankedLoot: 0,
    roomLoot: 0,
    lootTaken: 0,
    message: '',
    messageT: 0,
    caught: false,
    caughtFlashT: 0,
    caughtT: 0,
    exitReady: false,
    laserHitCooldown: 0,
    restockLines: [],
    rank: '',
    rankNote: '',
    timeBonus: 0,
    shotMode: false,
    botInput: null,
    testMode: null,
    testFrames: 0,
    testDone: false,
  };
  return state;
}

function resetRoom(state) {
  const banked = state.bankedLoot;
  const lives = state.lives;
  const elapsed = state.elapsed;
  const testMode = state.testMode;
  const fresh = createGameState(state.roomIndex);
  fresh.bankedLoot = banked;
  fresh.lives = lives;
  fresh.elapsed = elapsed;
  fresh.screen = 'play';
  fresh.testMode = testMode;
  Object.assign(state, fresh);
}

function startRun() {
  const testMode = game.testMode;
  const fresh = createGameState(0);
  fresh.screen = 'play';
  fresh.testMode = testMode;
  Object.assign(game, fresh);
}

function roomClear(state) {
  state.bankedLoot += state.roomLoot;
  state.roomLoot = 0;
  state.restockLines = restockTools(state);
  if (state.roomIndex >= 2) {
    state.timeBonus = Math.max(0, Math.round((900 - state.elapsed) * TIME_BONUS_PER_SECOND));
    const total = state.bankedLoot + state.timeBonus;
    if (state.lives === 3 && state.maxAlarm < 100) {
      state.rank = 'S — CLEAN GETAWAY';
      state.rankNote = 'Never caught, never locked down. The museum never knew you were there.';
    } else if (state.lives >= 2) {
      state.rank = 'A — SMOOTH OPERATOR';
      state.rankNote = 'A few close calls, but the take is yours.';
    } else {
      state.rank = 'B — LOUD & PROUD';
      state.rankNote = 'Alarms, lockdowns, narrow escapes — and still out the door.';
    }
    state.screen = 'win';
    soundWin();
  } else {
    state.screen = 'intermission';
    soundClick();
  }
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function checkLasers(state) {
  if (!state.room.lasers.length || state.laserHitCooldown > 0) return;
  const cycle = LASER_ON_SECONDS + LASER_OFF_SECONDS;
  const on = (state.time % cycle) < LASER_ON_SECONDS;
  if (!on) return;
  for (const l of state.room.lasers) {
    const d = pointToSegmentDistance(state.player.x, state.player.y, l.x1, l.y1, l.x2, l.y2);
    if (d < state.player.radius + 3) {
      state.alarm = Math.min(100, state.alarm + LASER_ALARM_HIT);
      state.laserHitCooldown = 1;
      state.message = 'Laser tripped! The alarm spikes.';
      state.messageT = 2;
      soundAlarm();
      return;
    }
  }
}

function updatePlay(state, dt) {
  state.time += dt;
  state.elapsed += dt;
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  if (state.messageT > 0) state.messageT -= dt;
  if (state.caughtFlashT > 0) state.caughtFlashT -= dt;
  if (state.laserHitCooldown > 0) state.laserHitCooldown -= dt;

  // Tools.
  if (input.pressed.tool1) state.tools.selected = 1;
  if (input.pressed.tool2) state.tools.selected = 2;
  if (input.pressed.tool) useSelectedTool(state);

  // Interaction.
  if (input.held.interact) holdInteract(state, dt);
  else state.vault.needleActive = false;
  if (input.pressed.interact) pressInteract(state);

  updatePlayer(state, input, dt);
  updateVault(state, dt);
  for (const g of state.guards) updateGuard(g, state, dt);
  for (const c of state.cameras) updateCamera(c, state, dt);
  updateSearchlight(state.searchlight, state, dt);
  updateAlarm(state, dt);
  checkLasers(state);

  // Smoke clouds burn down.
  for (const c of state.smokeClouds) c.t -= dt;
  state.smokeClouds = state.smokeClouds.filter((c) => c.t > 0);

  // Caught: lose a life, reset the room (banked loot stays).
  if (state.caught) {
    state.caught = false;
    state.lives -= 1;
    state.caughtFlashT = 0.7;
    soundCaught();
    if (state.lives <= 0) {
      state.screen = 'gameover';
      soundLose();
    } else {
      state.screen = 'caught';
      state.caughtT = 1.8;
    }
    return;
  }

  state.exitReady = exitOpen(state) && state.lockdownT <= 0;
  if (state.exitReady && onExit(state)) {
    roomClear(state);
  }
}

// --- the self-test bot: plays the real game with synthetic input,
// so a headless run can prove a win and a loss end to end. --------
function botDirection(state, tx, ty) {
  const p = state.player;
  const base = Math.atan2(ty - p.y, tx - p.x);
  const candidates = [0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2, Math.PI];
  let best = null;
  let bestScore = -Infinity;
  for (const off of candidates) {
    const a = base + off;
    const step = 26;
    const nx = p.x + Math.cos(a) * step;
    const ny = p.y + Math.sin(a) * step;
    const blocked = state.room.walls.some(
      (w) => nx > w.x - 10 && nx < w.x + w.w + 10 && ny > w.y - 10 && ny < w.y + w.h + 10,
    );
    if (blocked) continue;
    if (nx < 20 || nx > 1260 || ny < PLAY_TOP + 14 || ny > PLAY_BOTTOM - 14) continue;
    const distAfter = Math.hypot(tx - nx, ty - ny);
    const score = -distAfter - Math.abs(off) * 60;
    if (score > bestScore) { bestScore = score; best = a; }
  }
  if (best === null) return { x: 0, y: 0, sneak: false };
  return { x: Math.cos(best), y: Math.sin(best), sneak: false };
}

function botStep(state) {
  // Reset the synthetic keys every frame.
  input.held.up = false; input.held.down = false;
  input.held.left = false; input.held.right = false;
  input.held.sneak = false; input.held.interact = false;

  if (state.screen === 'title' || state.screen === 'intermission' || state.screen === 'gameover' || state.screen === 'win') {
    input.pressed.confirm = true;
    return;
  }
  if (state.screen === 'caught') return;
  if (state.screen !== 'play') return;

  const p = state.player;
  if (state.testMode === 'loss') {
    // Walk straight at the nearest guard, no sneaking, no tools.
    let nearest = null;
    let nearestD = Infinity;
    for (const g of state.guards) {
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < nearestD) { nearestD = d; nearest = g; }
    }
    if (nearest) {
      // Walk into the guard's path ahead of it — trailing behind a
      // guard is exactly how a thief stays unseen, and this bot is
      // trying to get caught.
      const aheadX = nearest.x + Math.cos(nearest.angle) * 60;
      const aheadY = nearest.y + Math.sin(nearest.angle) * 60;
      const dir = botDirection(state, aheadX, aheadY);
      applyBotMove(dir);
    }
    return;
  }

  // Win bot: vault first, then nearest loot, then the exit.
  let target = null;
  if (state.room.vault && !state.vault.open) {
    target = { x: state.room.vault.doorX, y: state.room.vault.doorY + 24, vault: true };
  } else {
    let nearest = null;
    let nearestD = Infinity;
    for (const l of state.room.loots) {
      if (l.taken) continue;
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < nearestD) { nearestD = d; nearest = l; }
    }
    if (nearest) target = { x: nearest.x, y: nearest.y, loot: nearest };
    else target = { x: state.room.exit.x + state.room.exit.w / 2, y: state.room.exit.y + state.room.exit.h / 2, exit: true };
  }

  const dist = Math.hypot(target.x - p.x, target.y - p.y);
  const anyChase = state.guards.some((g) => g.state === 'chase');
  const nearGuard = state.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 230);
  // At the vault door, a guard closing in means smoke first: the
  // cloud hides the pick for five seconds, so the job goes on.
  let holdingSmoke = false;
  if (target.vault && dist < 56 && state.tools.smoke > 0) {
    const guardNearDoor = state.guards.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 220);
    if (guardNearDoor) {
      state.tools.selected = 1;
      input.pressed.tool = true;
      holdingSmoke = true;
    }
  }
  // Safety net: a guard closing in while suspicious means break off
  // whatever the job is and run for the nearest vent — it drops the
  // thief on the far side of the room and breaks the chase.
  const dangerGuard = state.guards.some(
    (g) => Math.hypot(g.x - p.x, g.y - p.y) < 180
      && (g.suspicion > 25 || g.state === 'chase' || g.state === 'investigate'),
  );
  if (dangerGuard && !holdingSmoke) {
    let nearestVent = null;
    let nearestD = Infinity;
    for (const v of state.room.vents) {
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < nearestD) { nearestD = d; nearestVent = v; }
    }
    if (nearestVent) {
      target = { x: nearestVent.x, y: nearestVent.y, flee: true };
    }
  }
  // Lasers: never walk into a live beam. If a beam lies between the
  // thief and the target and the beams are on, hold still and wait
  // for the off-window, then cross while they are dark.
  const cycle = LASER_ON_SECONDS + LASER_OFF_SECONDS;
  const lasersOn = (state.time % cycle) < LASER_ON_SECONDS;
  let waitForLasers = false;
  if (lasersOn) {
    for (const l of state.room.lasers) {
      const between = (p.y < l.y1 && target.y > l.y1) || (p.y > l.y1 && target.y < l.y1);
      const nearBeam = Math.abs(p.y - l.y1) < 130 || Math.abs(target.y - l.y1) < 130;
      if (between && nearBeam && p.x > l.x1 - 40 && p.x < l.x2 + 40) {
        waitForLasers = true;
        break;
      }
    }
  }
  // Follow an A* path to the target (recomputed when the target
  // changes or every couple of seconds), so the bot walks around
  // walls instead of getting stuck in a corner.
  const targetKey = state.roomIndex + ':' + target.x + ',' + target.y;
  state.botRepathT = (state.botRepathT || 0) - 1 / 60;
  if (targetKey !== state.botTargetKey || !state.botPath || state.botPath.length === 0 || state.botRepathT <= 0) {
    state.botTargetKey = targetKey;
    state.botPath = findPath(p.x, p.y, target.x, target.y, state.room.walls);
    state.botRepathT = 2;
  }
  while (state.botPath.length > 1 && Math.hypot(state.botPath[0].x - p.x, state.botPath[0].y - p.y) < 24) {
    state.botPath.shift();
  }
  const waypoint = state.botPath[0] || target;
  const wdx = waypoint.x - p.x;
  const wdy = waypoint.y - p.y;
  const wlen = Math.hypot(wdx, wdy) || 1;
  const dir = waitForLasers
    ? { x: 0, y: 0, sneak: true }
    : { x: wdx / wlen, y: wdy / wlen, sneak: false };
  dir.sneak = nearGuard && !anyChase && !target.flee;
  applyBotMove(dir);

  if (target.vault && dist < 56) {
    // Pulse the lockpick: hold E only while the needle is in (or
    // just beside) the green zone, release while it sweeps past.
    input.held.interact = Math.abs(state.vault.needle - state.vault.zoneCenter) <= 18;
  }
  if (target.loot && dist < 44) input.pressed.interact = true;
  if (target.flee) {
    const fleeDist = Math.hypot(target.x - p.x, target.y - p.y);
    if (fleeDist < 40) input.pressed.interact = true;
  }
  if (anyChase && state.tools.smoke > 0) {
    state.tools.selected = 1;
    input.pressed.tool = true;
  }

  function applyBotMove(d) {
    if (d.x < -0.05) input.held.left = true;
    if (d.x > 0.05) input.held.right = true;
    if (d.y < -0.05) input.held.up = true;
    if (d.y > 0.05) input.held.down = true;
    input.held.sneak = !!d.sneak;
  }
}

function reportTest(state, result) {
  if (state.testDone) return;
  state.testDone = true;
  let text = result + ' take=' + Math.round(state.bankedLoot + state.roomLoot)
    + ' time=' + Math.round(state.elapsed) + 's lives=' + state.lives
    + ' frames=' + state.testFrames;
  if (testTrace.length) {
    text += ' | trace: ' + testTrace.slice(-8).join(' ; ');
  }
  document.title = text;
  const el = document.getElementById('test-result');
  if (el) el.textContent = text;
  window.__testDone = true;
  window.__testResult = text;
}

// --- main loop ------------------------------------------------------

let game = createGameState(0);
let testTrace = [];

function render(state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (state.screen === 'title') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawMinimap(ctx, state);
    drawTitle(ctx, state);
  } else if (state.screen === 'play') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawMinimap(ctx, state);
  } else if (state.screen === 'pause') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawMinimap(ctx, state);
    drawPause(ctx);
  } else if (state.screen === 'intermission') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawIntermission(ctx, state);
  } else if (state.screen === 'caught') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawMinimap(ctx, state);
    drawCaught(ctx, state);
  } else if (state.screen === 'gameover') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawGameOver(ctx, state);
  } else if (state.screen === 'win') {
    drawWorld(ctx, state);
    drawHud(ctx, state);
    drawWin(ctx, state);
  }
  if (statusLine) {
    statusLine.textContent = state.screen === 'play'
      ? state.room.name + ' — ' + state.room.objective
      : 'THE MERIDIAN JOB';
  }
}

let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function tick(dt) {
  if (game.testMode) botStep(game);
  if (game.shotMode) {
    render(game);
    endFrame(input);
    return;
  }

  // Screen-level keys.
  if (input.pressed.mute) setMuted(!isMuted());
  if (input.pressed.pause || input.pressed.escape) {
    if (game.screen === 'play') game.screen = 'pause';
    else if (game.screen === 'pause') game.screen = 'play';
  }
  if (input.pressed.restart && (game.screen === 'play' || game.screen === 'pause')) {
    resetRoom(game);
  }
  if (input.pressed.confirm || input.mouseClicked) {
    if (game.screen === 'title') { startRun(); soundClick(); }
    else if (game.screen === 'intermission') {
      const testMode = game.testMode;
      const next = createGameState(game.roomIndex + 1);
      next.bankedLoot = game.bankedLoot;
      next.lives = game.lives;
      next.elapsed = game.elapsed;
      next.screen = 'play';
      next.testMode = testMode;
      Object.assign(game, next);
      soundClick();
    } else if (game.screen === 'gameover' || game.screen === 'win') {
      startRun();
      soundClick();
    }
  }

  if (game.screen === 'play') {
    acc += dt;
    while (acc >= STEP) {
      updatePlay(game, STEP);
      acc -= STEP;
      if (game.screen !== 'play') break;
    }
  } else if (game.screen === 'caught') {
    game.caughtT -= dt;
    if (game.caughtT <= 0) resetRoom(game);
  }

  // In a headless self-test, skip most renders: the sim is what matters.
  if (!game.testMode || game.testFrames % 600 === 0) render(game);

  if (game.testMode && !game.testDone) {
    game.testFrames += 1;
    if (game.testFrames % 60 === 0) {
      let nearestG = null;
      let nearestD = Infinity;
      for (const g of game.guards) {
        const d = Math.hypot(g.x - game.player.x, g.y - game.player.y);
        if (d < nearestD) { nearestD = d; nearestG = g; }
      }
      testTrace.push(
        Math.round(game.elapsed) + 's r' + game.roomIndex
        + ' (' + Math.round(game.player.x) + ',' + Math.round(game.player.y) + ')'
        + ' take=' + Math.round(game.bankedLoot + game.roomLoot)
        + ' alarm=' + Math.round(game.alarm)
        + ' scr=' + game.screen
        + (nearestG ? ' g=(' + Math.round(nearestG.x) + ',' + Math.round(nearestG.y) + ',' + nearestG.state + ')' : ''),
      );
      if (testTrace.length > 600) testTrace.shift();
    }
    if (game.screen === 'win') reportTest(game, 'WIN');
    else if (game.screen === 'gameover') reportTest(game, 'LOSS');
    else if (game.testFrames > 60 * 300) reportTest(game, 'TIMEOUT screen=' + game.screen + ' room=' + game.roomIndex);
  }
  endFrame(input);
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  tick(dt);
}

// --- boot -----------------------------------------------------------

const shotName = params.get('shot');
const selftest = params.get('selftest');
if (shotName) {
  const roomIndex = shotName === 'vault' ? 1 : shotName === 'getaway' ? 2 : 0;
  const staged = createGameState(roomIndex);
  staged.screen = 'play';
  if (stageShot(shotName, staged)) {
    Object.assign(game, staged);
    game.shotMode = true;
    render(game);
    window.__shotReady = true;
  } else {
    document.title = 'ERR: unknown shot ' + shotName;
  }
} else if (selftest) {
  game.testMode = selftest;
  game.screen = 'play';
  const el = document.getElementById('test-result');
  if (el) el.textContent = 'RUNNING ' + selftest;
  // Fast-forward the whole run synchronously: virtual time does not
  // drive requestAnimationFrame reliably in headless shells, so the
  // bot plays the real update loop step by step right here.
  let guard = 0;
  while (!game.testDone && guard < 60 * 300) {
    tick(STEP);
    guard++;
  }
  if (!game.testDone) reportTest(game, 'TIMEOUT screen=' + game.screen + ' room=' + game.roomIndex);
  render(game);
  window.__testDone = true;
}

requestAnimationFrame(frame);
