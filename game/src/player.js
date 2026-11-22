// Wren, the thief: movement, sneaking, noise, and interacting with
// loot, vents, the vault and the exit.

import {
  PLAYER_RADIUS, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED,
  PLAYER_GRAB_RANGE, PLAYER_INTERACT_RANGE, PLAY_TOP, PLAY_BOTTOM,
} from './config.js';
import { moveCircle, pointInRect, inShadow } from './room.js';
import { soundGrab, soundVaultOpen } from './audio.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    sneaking: false,
    moving: false,
    noiseRadius: 0,
    facing: 0,
    ventCooldown: 0,
    hidden: false,
  };
}

export function updatePlayer(state, input, dt) {
  const p = state.player;
  const vec = state.botInput || null;
  const mx = vec ? vec.x : (input.held.left ? -1 : 0) + (input.held.right ? 1 : 0);
  const my = vec ? vec.y : (input.held.up ? -1 : 0) + (input.held.down ? 1 : 0);
  p.sneaking = vec ? !!vec.sneak : !!input.held.sneak;
  const len = Math.hypot(mx, my);
  p.moving = len > 0;
  const speed = p.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  if (len > 0) {
    const nx = mx / len;
    const ny = my / len;
    p.facing = Math.atan2(ny, nx);
    const moved = moveCircle(
      p, p.radius, nx * speed * dt, ny * speed * dt,
      state.room.walls,
      { left: 0, right: 1280, top: PLAY_TOP, bottom: PLAY_BOTTOM },
    );
    p.x = moved.x;
    p.y = moved.y;
  }
  p.noiseRadius = p.moving
    ? (p.sneaking ? 26 : 96)
    : 0;
  if (p.ventCooldown > 0) p.ventCooldown -= dt;
  p.hidden = inShadow(p.x, p.y, state.room.shadows) || state.smokeClouds.some(
    (c) => Math.hypot(p.x - c.x, p.y - c.y) < c.radius,
  );
}

// What can the player interact with right now? Returns an object
// describing the nearest usable thing, or null.
export function nearestInteractable(state) {
  const p = state.player;
  const room = state.room;
  for (const l of room.loots) {
    if (!l.taken && Math.hypot(p.x - l.x, p.y - l.y) < PLAYER_GRAB_RANGE) {
      return { kind: 'loot', loot: l };
    }
  }
  if (room.vault && !state.vault.open) {
    const d = Math.hypot(p.x - room.vault.doorX, p.y - room.vault.doorY);
    if (d < PLAYER_INTERACT_RANGE) return { kind: 'vault' };
  }
  if (p.ventCooldown <= 0) {
    for (const v of room.vents) {
      if (Math.hypot(p.x - v.x, p.y - v.y) < PLAYER_INTERACT_RANGE) {
        return { kind: 'vent', vent: v };
      }
    }
  }
  return null;
}

// Hold-to-interact: called every frame while E is held.
export function holdInteract(state, dt) {
  const it = nearestInteractable(state);
  if (!it) {
    state.vault.needleActive = false;
    return;
  }
  if (it.kind === 'vault') {
    state.vault.needleActive = true;
  }
}

// Press-to-interact: called once when E is pressed.
export function pressInteract(state) {
  const it = nearestInteractable(state);
  if (!it) return false;
  if (it.kind === 'loot') {
    it.loot.taken = true;
    state.roomLoot += it.loot.value;
    state.lootTaken += 1;
    state.message = `${it.loot.label} — $${it.loot.value.toLocaleString('en-US')}`;
    state.messageT = 2.2;
    soundGrab();
    return true;
  }
  if (it.kind === 'vent') {
    state.player.x = it.vent.toX;
    state.player.y = it.vent.toY;
    state.player.ventCooldown = 1.5;
    state.message = 'Through the vent…';
    state.messageT = 1.4;
    soundGrab();
    return true;
  }
  return false;
}

// Is the exit open, and is the player standing on it?
export function exitOpen(state) {
  const room = state.room;
  if (room.exitNeeds === 'allLoot') {
    return room.loots.every((l) => l.taken);
  }
  if (room.exitNeeds === 'gem') {
    return room.loots.some((l) => l.kind === 'gem' && l.taken);
  }
  if (room.exitNeeds === 'sapphire') {
    return room.loots.some((l) => l.kind === 'sapphire' && l.taken);
  }
  return true;
}

export function onExit(state) {
  const e = state.room.exit;
  return pointInRect(state.player.x, state.player.y, e);
}
