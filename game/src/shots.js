// Deterministic screenshot staging. Each shot builds a real room
// from the real room definitions, then places the thief, the guards
// and the cameras exactly where the frame needs them and freezes the
// world — the render pass then draws that state untouched, so the
// PNG is a true render of the game's own code.

import { createGuard } from './guard.js';
import { createCamera, createSearchlight } from './camera.js';

function baseState(state, opts) {
  state.screen = 'play';
  state.shotMode = true;
  state.time = opts.time;
  state.alarm = opts.alarm;
  state.bankedLoot = opts.bankedLoot;
  state.roomLoot = opts.roomLoot;
  state.lootTaken = opts.lootTaken;
  state.lives = 3;
  state.tools.smoke = opts.smoke;
  state.tools.emp = opts.emp;
  state.tools.selected = opts.selected || 1;
  state.message = opts.message || '';
  state.messageT = opts.message ? 99 : 0;
  state.lockdownT = 0;
}

function placeGuard(state, index, x, y, angle, suspicion, guardState) {
  const g = state.guards[index];
  g.x = x;
  g.y = y;
  g.angle = angle;
  g.suspicion = suspicion;
  g.state = guardState || 'patrol';
  g.warned = suspicion >= 58;
  if (suspicion >= 100) g.lastSeen = { x: state.player.x, y: state.player.y };
}

export function stageShot(name, state) {
  if (name === 'cover') {
    baseState(state, {
      time: 12.5, alarm: 35, bankedLoot: 0, roomLoot: 450,
      lootTaken: 1, smoke: 2, emp: 1, message: '',
    });
    state.room.loots[0].taken = true;
    state.player.x = 700;
    state.player.y = 252;
    state.player.sneaking = true;
    state.player.moving = false;
    state.player.facing = -2.4;
    state.player.hidden = false;
    placeGuard(state, 0, 600, 330, -1.9, 45, 'patrol');
    placeGuard(state, 1, 920, 300, 2.6, 10, 'patrol');
    state.cameras[0].angle = 1.35;
  } else if (name === 'vault') {
    baseState(state, {
      time: 1.0, alarm: 55, bankedLoot: 0, roomLoot: 650,
      lootTaken: 1, smoke: 1, emp: 1, message: 'The vault swings open — gold inside!',
    });
    state.vault.open = true;
    for (const bar of state.room.vaultLoot || []) state.room.loots.push(bar);
    state.room.loots[0].taken = true;
    state.player.x = 640;
    state.player.y = 320;
    state.player.sneaking = true;
    state.player.moving = true;
    state.player.facing = Math.PI / 2;
    placeGuard(state, 0, 430, 300, 0.5, 20, 'patrol');
    placeGuard(state, 1, 700, 580, -1.2, 55, 'investigate');
    placeGuard(state, 2, 200, 500, 0.9, 5, 'patrol');
    state.guards[1].lastSeen = { x: 640, y: 420 };
    state.cameras[0].angle = 1.2;
    state.cameras[1].angle = 1.8;
  } else if (name === 'getaway') {
    baseState(state, {
      time: 20, alarm: 85, bankedLoot: 10600, roomLoot: 9000,
      lootTaken: 3, smoke: 0, emp: 0, selected: 1,
      message: 'SPOTTED — RUN!',
    });
    state.room.loots[0].taken = true;
    state.room.loots[1].taken = true;
    state.room.loots[2].taken = true;
    state.player.x = 1000;
    state.player.y = 600;
    state.player.sneaking = false;
    state.player.moving = true;
    state.player.facing = 1.95;
    state.smokeClouds.push({ x: 940, y: 560, radius: 112, t: 3 });
    placeGuard(state, 0, 880, 480, 0.7, 100, 'chase');
    placeGuard(state, 1, 1120, 380, 1.9, 100, 'chase');
    placeGuard(state, 2, 640, 560, 0.5, 70, 'investigate');
    state.guards[2].lastSeen = { x: 900, y: 560 };
    if (state.searchlight) state.searchlight.angle = 1.1;
    state.cameras[0].angle = 1.5;
  } else if (name === 'shadows') {
    baseState(state, {
      time: 8.0, alarm: 12, bankedLoot: 0, roomLoot: 0,
      lootTaken: 0, smoke: 2, emp: 1, message: '',
    });
    state.player.x = 150;
    state.player.y = 180;
    state.player.sneaking = true;
    state.player.moving = false;
    state.player.facing = 0;
    state.player.hidden = true;
    placeGuard(state, 0, 320, 320, -1.1, 30, 'patrol');
    placeGuard(state, 1, 520, 260, 2.8, 15, 'patrol');
    state.cameras[0].angle = 1.9;
  } else {
    return false;
  }
  state.exitReady = name === 'getaway';
  return true;
}
