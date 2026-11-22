// Tools: the smoke bomb, the EMP and the vault lockpick. Tools are
// limited per room and cost loot dollars to restock between rooms —
// spending the take is part of the job.

import {
  SMOKE_RADIUS, SMOKE_SECONDS, SMOKE_RESTOCK_COST,
  EMP_SECONDS, EMP_RESTOCK_COST,
  VAULT_NEEDLE_SPEED, VAULT_PROGRESS_IN_ZONE, VAULT_PROGRESS_OUT_ZONE,
  VAULT_ZONE_HALF_WIDTH, SMOKE_START_COUNT, EMP_START_COUNT,
} from './config.js';
import { soundSmoke, soundEmp, soundVaultTick, soundVaultOpen } from './audio.js';

export function createTools() {
  return {
    smoke: SMOKE_START_COUNT,
    emp: EMP_START_COUNT,
    selected: 1, // 1 = smoke, 2 = EMP
  };
}

// Between rooms, top the tools back up — paid for out of the banked
// take. Returns a line describing what was bought, for the
// intermission screen.
export function restockTools(state) {
  const lines = [];
  while (state.tools.smoke < SMOKE_START_COUNT && state.bankedLoot >= SMOKE_RESTOCK_COST) {
    state.bankedLoot -= SMOKE_RESTOCK_COST;
    state.tools.smoke += 1;
    lines.push(`Smoke bomb restocked (−$${SMOKE_RESTOCK_COST})`);
  }
  while (state.tools.emp < EMP_START_COUNT && state.bankedLoot >= EMP_RESTOCK_COST) {
    state.bankedLoot -= EMP_RESTOCK_COST;
    state.tools.emp += 1;
    lines.push(`EMP restocked (−$${EMP_RESTOCK_COST})`);
  }
  if (lines.length === 0) lines.push('No restock — tools full or take too low.');
  return lines;
}

export function useSelectedTool(state) {
  if (state.tools.selected === 1) return useSmoke(state);
  if (state.tools.selected === 2) return useEmp(state);
  return false;
}

export function useSmoke(state) {
  if (state.tools.smoke <= 0) {
    state.message = 'No smoke bombs left.';
    state.messageT = 1.4;
    return false;
  }
  state.tools.smoke -= 1;
  state.smokeClouds.push({
    x: state.player.x,
    y: state.player.y,
    radius: SMOKE_RADIUS,
    t: SMOKE_SECONDS,
  });
  state.message = 'Smoke out — they can’t see through it.';
  state.messageT = 1.6;
  soundSmoke();
  return true;
}

export function useEmp(state) {
  if (state.tools.emp <= 0) {
    state.message = 'No EMP left.';
    state.messageT = 1.4;
    return false;
  }
  state.tools.emp -= 1;
  for (const c of state.cameras) c.disabledT = EMP_SECONDS;
  state.message = 'EMP fired — cameras dark for 5 seconds.';
  state.messageT = 1.8;
  soundEmp();
  return true;
}

// The vault lockpick: hold E at the vault door and keep the needle
// inside the green zone. In the zone progress climbs, outside it
// falls. Completing it swings the vault open and reveals gold bars.
export function createVaultState() {
  return {
    open: false,
    progress: 0,
    needle: 50,
    needleDir: 1,
    zoneCenter: 50,
    zoneDrift: 0,
    needleActive: false,
  };
}

export function updateVault(state, dt) {
  const v = state.vault;
  if (v.open || !state.room.vault) return;
  v.needle += v.needleDir * VAULT_NEEDLE_SPEED * dt;
  if (v.needle > 98) { v.needle = 98; v.needleDir = -1; }
  if (v.needle < 2) { v.needle = 2; v.needleDir = 1; }
  v.zoneDrift += dt * 0.35;
  v.zoneCenter = 50 + Math.sin(v.zoneDrift) * 22;
  if (!v.needleActive) return;
  const inZone = Math.abs(v.needle - v.zoneCenter) <= VAULT_ZONE_HALF_WIDTH;
  if (inZone) {
    v.progress = Math.min(100, v.progress + VAULT_PROGRESS_IN_ZONE * dt);
    if (Math.random() < dt * 6) soundVaultTick();
  } else {
    v.progress = Math.max(0, v.progress - VAULT_PROGRESS_OUT_ZONE * dt);
  }
  if (v.progress >= 100) {
    v.open = true;
    state.message = 'The vault swings open — gold inside!';
    state.messageT = 2.5;
    soundVaultOpen();
    for (const bar of state.room.vaultLoot || []) {
      state.room.loots.push(bar);
    }
  }
}
