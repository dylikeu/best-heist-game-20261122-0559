// The alarm meter: 0–100, fed by guards and cameras, decaying while
// the thief stays hidden. At 100 the museum locks down for ten
// seconds — doors shut, lights go red, an extra guard walks in.

import {
  ALARM_MAX, ALARM_GUARD_RATE, ALARM_DECAY,
  ALARM_LOCKDOWN_SECONDS, ALARM_AFTER_LOCKDOWN,
} from './config.js';
import { createGuard } from './guard.js';
import { soundAlarm } from './audio.js';

export function updateAlarm(state, dt) {
  if (state.lockdownT > 0) {
    state.lockdownT -= dt;
    state.alarm = ALARM_MAX;
    if (state.lockdownT <= 0) {
      state.alarm = ALARM_AFTER_LOCKDOWN;
      state.message = 'Lockdown lifted — move fast.';
      state.messageT = 2;
    }
    return;
  }
  const anyGuardSeeing = state.guards.some(
    (g) => g.state === 'chase' || (g.suspicion > 30 && g.lastSeen),
  );
  const guardWatching = state.guards.some((g) => g.suspicion > 0 && g.lastSeen);
  if (anyGuardSeeing || state.cameraSpotted) {
    state.alarm = Math.min(ALARM_MAX, state.alarm + ALARM_GUARD_RATE * dt);
  } else if (!guardWatching) {
    state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
  }
  state.cameraSpotted = false;
  if (state.alarm >= ALARM_MAX) {
    startLockdown(state);
  }
}

export function startLockdown(state) {
  state.lockdownT = ALARM_LOCKDOWN_SECONDS;
  state.alarm = ALARM_MAX;
  state.message = 'LOCKDOWN! Doors sealed — an extra guard is coming.';
  state.messageT = 3;
  soundAlarm();
  // One extra guard walks in from the entrance and joins the first
  // guard's patrol loop, so it never has to cross a wall to find it.
  const extra = createGuard({
    waypoints: state.room.guards[0].waypoints,
    pause: 0.8,
  });
  extra.x = state.room.playerStart.x;
  extra.y = state.room.playerStart.y;
  extra.extra = true;
  state.guards.push(extra);
}
