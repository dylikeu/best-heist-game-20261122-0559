// Guards: patrol waypoints, vision cones, suspicion, investigation
// and chase. A guard only ever reacts to what it can actually see:
// range, cone angle, line of sight, shadow and smoke all matter.

import {
  GUARD_RADIUS, GUARD_PATROL_SPEED, GUARD_INVESTIGATE_SPEED,
  GUARD_CHASE_SPEED, GUARD_VISION_RANGE, GUARD_VISION_HALF_ANGLE,
  GUARD_SUSPICION_FILL, GUARD_SUSPICION_DECAY, GUARD_WARN_AT,
  GUARD_CHASE_AT, GUARD_LOSE_SIGHT_TIME, GUARD_CATCH_RANGE,
  GUARD_SHADOW_RANGE_FACTOR, GUARD_SHADOW_FILL_FACTOR,
  PLAY_TOP, PLAY_BOTTOM,
} from './config.js';
import { moveCircle, hasLineOfSight, angleDifference, inShadow } from './room.js';
import { soundSpotted, soundCaught } from './audio.js';

export function createGuard(def) {
  const first = def.waypoints[0];
  return {
    x: first.x,
    y: first.y,
    radius: GUARD_RADIUS,
    waypoints: def.waypoints,
    waypointIndex: 1 % def.waypoints.length,
    pause: def.pause,
    pauseT: 0,
    speedFactor: def.speedFactor || 1,
    angle: 0,
    state: 'patrol', // patrol | investigate | chase | return
    suspicion: 0,
    lastSeen: null,
    loseSightT: 0,
    warned: false,
    extra: false,
  };
}

// Can this guard see the player right now? Smoke and shadow shrink
// the effective cone; walls block the view outright.
export function guardSeesPlayer(guard, state) {
  const p = state.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = GUARD_VISION_RANGE;
  let fill = GUARD_SUSPICION_FILL;
  if (p.hidden) {
    range *= GUARD_SHADOW_RANGE_FACTOR;
    fill *= GUARD_SHADOW_FILL_FACTOR;
  }
  if (dist > range) return { sees: false, fill: 0 };
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleTo, guard.angle)) > GUARD_VISION_HALF_ANGLE) {
    return { sees: false, fill: 0 };
  }
  if (!hasLineOfSight(guard.x, guard.y, p.x, p.y, state.room.walls)) {
    return { sees: false, fill: 0 };
  }
  for (const c of state.smokeClouds) {
    if (Math.hypot(p.x - c.x, p.y - c.y) < c.radius) return { sees: false, fill: 0 };
    if (segmentCrossesCircle(guard.x, guard.y, p.x, p.y, c.x, c.y, c.radius)) {
      return { sees: false, fill: 0 };
    }
  }
  const closeness = 1 - dist / range;
  return { sees: true, fill: fill * (0.55 + 0.9 * closeness) };
}

function segmentCrossesCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((cx - x1) * dx + (cy - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = x1 + t * dx;
  const py = y1 + t * dy;
  return Math.hypot(px - cx, py - cy) < r;
}

function stepToward(guard, tx, ty, speed, state, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const nx = dx / dist;
  const ny = dy / dist;
  guard.angle = Math.atan2(ny, nx);
  const moved = moveCircle(
    guard, guard.radius, nx * speed * dt, ny * speed * dt,
    state.room.walls,
    { left: 0, right: 1280, top: PLAY_TOP, bottom: PLAY_BOTTOM },
  );
  guard.x = moved.x;
  guard.y = moved.y;
  return dist < 6;
}

export function updateGuard(guard, state, dt) {
  // A guard that cannot make progress toward its target for a
  // while is stuck on something: skip to its next waypoint (or
  // head home) instead of standing frozen against a wall forever.
  const beforeX = guard.x;
  const beforeY = guard.y;
  updateGuardInner(guard, state, dt);
  const moved = Math.hypot(guard.x - beforeX, guard.y - beforeY);
  const wantSpeed = guard.state === 'chase' ? GUARD_CHASE_SPEED
    : guard.state === 'investigate' ? GUARD_INVESTIGATE_SPEED
    : GUARD_PATROL_SPEED;
  if (guard.pauseT > 0 || moved > wantSpeed * dt * 0.3) {
    guard.stuckT = 0;
  } else {
    guard.stuckT = (guard.stuckT || 0) + dt;
    if (guard.stuckT > 1.5) {
      guard.stuckT = 0;
      if (guard.state === 'patrol') {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      } else {
        guard.state = 'return';
        guard.lastSeen = null;
      }
    }
  }
}

function updateGuardInner(guard, state, dt) {
  const seen = guardSeesPlayer(guard, state);
  const p = state.player;

  if (seen.sees) {
    guard.suspicion = Math.min(100, guard.suspicion + seen.fill * dt);
    guard.lastSeen = { x: p.x, y: p.y };
    guard.loseSightT = 0;
    if (guard.suspicion >= GUARD_WARN_AT && !guard.warned) {
      guard.warned = true;
      soundSpotted();
      state.message = 'A guard is onto you!';
      state.messageT = 1.6;
    }
    if (guard.suspicion >= GUARD_CHASE_AT && guard.state !== 'chase') {
      guard.state = 'chase';
      state.message = 'SPOTTED — RUN!';
      state.messageT = 1.6;
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_DECAY * dt);
    if (guard.suspicion < GUARD_WARN_AT) guard.warned = false;
    if (guard.state === 'chase') {
      guard.loseSightT += dt;
      if (guard.loseSightT > GUARD_LOSE_SIGHT_TIME) {
        guard.state = guard.lastSeen ? 'investigate' : 'return';
        guard.loseSightT = 0;
      }
    }
  }

  if (guard.state === 'patrol') {
    if (guard.pauseT > 0) {
      guard.pauseT -= dt;
      guard.angle += dt * 0.4;
      return;
    }
    const target = guard.waypoints[guard.waypointIndex];
    const arrived = stepToward(guard, target.x, target.y, GUARD_PATROL_SPEED * guard.speedFactor, state, dt);
    if (arrived) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseT = guard.pause;
    }
  } else if (guard.state === 'investigate') {
    if (!guard.lastSeen) {
      guard.state = 'return';
      return;
    }
    const arrived = stepToward(guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_INVESTIGATE_SPEED, state, dt);
    if (arrived) {
      guard.pauseT = 1.2;
      guard.state = 'return';
      guard.lastSeen = null;
    }
  } else if (guard.state === 'chase') {
    const target = guard.lastSeen || { x: p.x, y: p.y };
    stepToward(guard, target.x, target.y, GUARD_CHASE_SPEED, state, dt);
    const d = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (d < GUARD_CATCH_RANGE) {
      state.caught = true;
      soundCaught();
    }
  } else if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the patrol.
    let best = 0;
    let bestD = Infinity;
    guard.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - guard.x, w.y - guard.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    const target = guard.waypoints[best];
    const arrived = stepToward(guard, target.x, target.y, GUARD_PATROL_SPEED, state, dt);
    if (arrived) {
      guard.waypointIndex = (best + 1) % guard.waypoints.length;
      guard.state = 'patrol';
    }
  }
}
