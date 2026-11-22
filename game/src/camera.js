// Security cameras and the rooftop searchlight: fixed eyes that
// sweep a cone back and forth. Being seen by one feeds the alarm
// directly. An EMP shuts cameras down for a few seconds.

import {
  CAMERA_RANGE, CAMERA_HALF_ANGLE, CAMERA_ALARM_RATE,
  SEARCHLIGHT_RANGE, SEARCHLIGHT_HALF_ANGLE, SEARCHLIGHT_ALARM_RATE,
} from './config.js';
import { hasLineOfSight, angleDifference } from './room.js';

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    amp: def.amp,
    period: def.period,
    angle: def.baseAngle,
    disabledT: 0,
    seeing: false,
  };
}

export function createSearchlight(def) {
  if (!def) return null;
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    amp: def.amp,
    period: def.period,
    angle: def.baseAngle,
    seeing: false,
  };
}

function sweepAngle(eye, t) {
  return eye.baseAngle + eye.amp * Math.sin((t / eye.period) * Math.PI * 2);
}

function eyeSees(eye, range, halfAngle, state) {
  if (eye.disabledT > 0) return false;
  const p = state.player;
  const dx = p.x - eye.x;
  const dy = p.y - eye.y;
  const dist = Math.hypot(dx, dy);
  const effectiveRange = p.hidden ? range * 0.6 : range;
  if (dist > effectiveRange) return false;
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleTo, eye.angle)) > halfAngle) return false;
  if (!hasLineOfSight(eye.x, eye.y, p.x, p.y, state.room.walls)) return false;
  for (const c of state.smokeClouds) {
    if (Math.hypot(p.x - c.x, p.y - c.y) < c.radius) return false;
  }
  return true;
}

export function updateCamera(camera, state, dt) {
  camera.angle = sweepAngle(camera, state.time);
  if (camera.disabledT > 0) camera.disabledT -= dt;
  camera.seeing = eyeSees(camera, CAMERA_RANGE, CAMERA_HALF_ANGLE, state);
  if (camera.seeing) {
    state.alarm = Math.min(100, state.alarm + CAMERA_ALARM_RATE * dt);
    state.cameraSpotted = true;
  }
}

export function updateSearchlight(light, state, dt) {
  if (!light) return;
  light.angle = sweepAngle(light, state.time);
  light.seeing = eyeSees(light, SEARCHLIGHT_RANGE, SEARCHLIGHT_HALF_ANGLE, state);
  if (light.seeing) {
    state.alarm = Math.min(100, state.alarm + SEARCHLIGHT_ALARM_RATE * dt);
    state.cameraSpotted = true;
  }
}
