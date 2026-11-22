// The three rooms of the Meridian Museum, plus the geometry every
// moving thing shares: circle-vs-wall sliding and line-of-sight.

import { LOOT_VALUES } from './config.js';

// --- geometry -------------------------------------------------------

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function circleHitsRect(cx, cy, radius, r) {
  const nearestX = Math.max(r.x, Math.min(cx, r.x + r.w));
  const nearestY = Math.max(r.y, Math.min(cy, r.y + r.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

// Move a circle by (dx, dy) one axis at a time so it slides along
// walls instead of sticking in corners. Walls are rects; the play
// area itself is a hard border.
export function moveCircle(pos, radius, dx, dy, walls, bounds) {
  let x = pos.x + dx;
  let y = pos.y;
  x = Math.max(bounds.left + radius, Math.min(bounds.right - radius, x));
  for (const w of walls) {
    if (circleHitsRect(x, y, radius, w)) {
      if (dx > 0) x = w.x - radius;
      else if (dx < 0) x = w.x + w.w + radius;
      else x = pos.x;
    }
  }
  y = pos.y + dy;
  y = Math.max(bounds.top + radius, Math.min(bounds.bottom - radius, y));
  for (const w of walls) {
    if (circleHitsRect(x, y, radius, w)) {
      if (dy > 0) y = w.y - radius;
      else if (dy < 0) y = w.y + w.h + radius;
      else y = pos.y;
    }
  }
  return { x, y };
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does the segment cross the rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

// True when nothing solid stands between the two points.
export function hasLineOfSight(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function inShadow(x, y, shadows) {
  for (const s of shadows) {
    if (pointInRect(x, y, s)) return true;
  }
  return false;
}

// --- the rooms ------------------------------------------------------

function loot(x, y, kind, label) {
  return { x, y, kind, label, value: LOOT_VALUES[kind], taken: false };
}

export const ROOM_DEFS = [
  {
    name: 'ROOM 1 — THE GALLERY',
    objective: 'Lift all 4 paintings, then slip out the service door.',
    alarmStart: 0,
    playerStart: { x: 84, y: 706 },
    exit: { x: 1184, y: 64, w: 64, h: 30, label: 'SERVICE DOOR' },
    exitNeeds: 'allLoot',
    walls: [
      { x: 420, y: 64, w: 20, h: 430 },
      { x: 840, y: 280, w: 20, h: 520 },
      { x: 280, y: 190, w: 100, h: 56 },
      { x: 680, y: 170, w: 100, h: 56 },
      { x: 280, y: 600, w: 100, h: 56 },
      { x: 980, y: 600, w: 100, h: 56 },
      { x: 600, y: 420, w: 100, h: 56 },
    ],
    shadows: [
      { x: 56, y: 110, w: 190, h: 130 },
      { x: 1034, y: 110, w: 190, h: 130 },
      { x: 540, y: 640, w: 220, h: 110 },
    ],
    loots: [
      loot(150, 96, 'paintingSmall', 'Study in Blue'),
      loot(1130, 96, 'painting', 'The Gilded Hour'),
      loot(150, 716, 'painting', 'Harbour at Dusk'),
      loot(1130, 716, 'paintingGrand', 'The Meridian Muse'),
    ],
    guards: [
      { waypoints: [[200, 300], [200, 680], [400, 680], [400, 300]], pause: 1.2 },
      { waypoints: [[900, 200], [1120, 200], [1120, 680], [900, 680]], pause: 1.2 },
    ],
    cameras: [
      { x: 640, y: 76, baseAngle: Math.PI / 2, amp: 0.7, period: 5 },
    ],
    vents: [
      { x: 92, y: 756, toX: 1188, toY: 300, label: 'VENT' },
      { x: 1188, y: 300, toX: 92, toY: 756, label: 'VENT' },
    ],
    lasers: [],
    vault: null,
    searchlight: null,
  },
  {
    name: 'ROOM 2 — THE VAULT HALL',
    objective: 'Pick the vault, take the Meridian Star, reach the door.',
    alarmStart: 0,
    playerStart: { x: 84, y: 116 },
    exit: { x: 900, y: 758, w: 64, h: 26, label: 'SERVICE DOOR' },
    exitNeeds: 'gem',
    walls: [
      { x: 500, y: 280, w: 20, h: 300 },
      { x: 760, y: 280, w: 20, h: 300 },
      { x: 200, y: 64, w: 20, h: 300 },
      { x: 540, y: 80, w: 200, h: 110 },
      { x: 1060, y: 440, w: 20, h: 360 },
      { x: 280, y: 420, w: 100, h: 56 },
      { x: 900, y: 420, w: 100, h: 56 },
      { x: 280, y: 640, w: 100, h: 56 },
      { x: 900, y: 640, w: 100, h: 56 },
    ],
    shadows: [
      { x: 56, y: 560, w: 200, h: 140 },
      { x: 1024, y: 120, w: 200, h: 140 },
      { x: 560, y: 700, w: 160, h: 80 },
    ],
    loots: [
      loot(150, 96, 'painting', 'Portrait of a Thief'),
      loot(1130, 96, 'paintingGrand', 'The Long Night'),
      loot(640, 640, 'gem', 'THE MERIDIAN STAR'),
    ],
    vaultLoot: [
      loot(580, 215, 'goldBar', 'Gold bar'),
      loot(640, 215, 'goldBar', 'Gold bar'),
      loot(700, 215, 'goldBar', 'Gold bar'),
    ],
    guards: [
      { waypoints: [[380, 240], [900, 240]], pause: 2.2 },
      { waypoints: [[560, 560], [720, 560], [720, 720], [560, 720]], pause: 1.0 },
      { waypoints: [[140, 400], [400, 400], [400, 700], [140, 700]], pause: 1.4 },
    ],
    cameras: [
      { x: 220, y: 76, baseAngle: Math.PI / 2, amp: 0.6, period: 4.5 },
      { x: 1060, y: 76, baseAngle: Math.PI / 2, amp: 0.6, period: 5.5 },
    ],
    vents: [
      { x: 92, y: 116, toX: 1188, toY: 620, label: 'VENT' },
      { x: 1188, y: 620, toX: 92, toY: 116, label: 'VENT' },
    ],
    lasers: [
      { x1: 520, y1: 340, x2: 780, y2: 340 },
      { x1: 520, y1: 430, x2: 780, y2: 430 },
      { x1: 520, y1: 520, x2: 780, y2: 520 },
    ],
    vault: { x: 540, y: 80, w: 200, h: 110, doorX: 640, doorY: 196 },
    searchlight: null,
  },
  {
    name: 'ROOM 3 — THE ROOFTOP',
    objective: 'Grab the Star Sapphire and run for the getaway van.',
    alarmStart: 40,
    playerStart: { x: 84, y: 706 },
    exit: { x: 900, y: 758, w: 64, h: 26, label: 'GETAWAY VAN' },
    exitNeeds: 'sapphire',
    walls: [
      { x: 300, y: 200, w: 120, h: 70 },
      { x: 860, y: 200, w: 120, h: 70 },
      { x: 300, y: 560, w: 120, h: 70 },
      { x: 860, y: 560, w: 120, h: 70 },
      { x: 120, y: 120, w: 160, h: 120 },
      { x: 1000, y: 560, w: 160, h: 120 },
    ],
    shadows: [
      { x: 56, y: 300, w: 180, h: 160 },
      { x: 1044, y: 300, w: 180, h: 160 },
      { x: 520, y: 640, w: 240, h: 110 },
    ],
    loots: [
      loot(640, 420, 'sapphire', 'THE STAR SAPPHIRE'),
      loot(300, 420, 'cashCrate', 'Cash crate'),
      loot(980, 420, 'cashCrate', 'Cash crate'),
      loot(420, 700, 'supplyCrate', 'Supply crate'),
    ],
    guards: [
      { waypoints: [[220, 300], [220, 660], [460, 660], [460, 300]], pause: 0.8 },
      { waypoints: [[820, 300], [1180, 300], [1180, 720], [820, 720]], pause: 0.8 },
      { waypoints: [[640, 220], [640, 520]], pause: 0.6, speedFactor: 1.35 },
    ],
    cameras: [
      { x: 200, y: 76, baseAngle: Math.PI / 2, amp: 0.55, period: 4 },
    ],
    vents: [
      { x: 120, y: 300, toX: 1160, toY: 500, label: 'STAIRWELL' },
      { x: 1160, y: 500, toX: 120, toY: 300, label: 'STAIRWELL' },
    ],
    lasers: [],
    vault: null,
    searchlight: { x: 640, y: 86, baseAngle: Math.PI / 2, amp: 0.9, period: 6 },
  },
];

// Build a fresh, mutable room state from a definition. Loot and
// guards are copied so a restart never mutates the definition.
export function buildRoom(index) {
  const def = ROOM_DEFS[index];
  const room = JSON.parse(JSON.stringify(def));
  room.index = index;
  room.loots = def.loots.map((l) => ({ ...l }));
  if (def.vaultLoot) room.vaultLoot = def.vaultLoot.map((l) => ({ ...l }));
  room.guards = def.guards.map((g) => ({
    waypoints: g.waypoints.map((w) => ({ x: w[0], y: w[1] })),
    pause: g.pause,
    speedFactor: g.speedFactor || 1,
  }));
  room.cameras = def.cameras.map((c) => ({ ...c }));
  room.vents = def.vents.map((v) => ({ ...v }));
  return room;
}
