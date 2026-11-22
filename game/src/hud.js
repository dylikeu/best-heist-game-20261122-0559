// HUD, minimap and the menu screens: title, pause, room clear,
// game over and the win screen with its rank.

import { VIEW_W, VIEW_H, HUD_H, ALARM_MAX } from './config.js';
import { formatDollars } from './loot.js';

function heart(ctx, x, y, filled) {
  ctx.fillStyle = filled ? '#ff5566' : 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.bezierCurveTo(x - 7, y - 2, x - 4, y - 9, x, y - 4);
  ctx.bezierCurveTo(x + 4, y - 9, x + 7, y - 2, x, y + 5);
  ctx.fill();
}

export function drawHud(ctx, state) {
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(VIEW_W, HUD_H); ctx.stroke();

  // Left: title + room.
  ctx.fillStyle = '#f5c542';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE MERIDIAN JOB', 16, 24);
  ctx.fillStyle = '#cdd6e4';
  ctx.font = '13px sans-serif';
  ctx.fillText(state.room.name, 16, 46);

  // Center: alarm meter.
  const ax = 470;
  const aw = 340;
  ctx.fillStyle = state.alarm >= 70 ? '#ff5566' : '#cdd6e4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, 24);
  ctx.fillStyle = '#2a3350';
  ctx.fillRect(ax, 30, aw, 16);
  const alarmColor = state.alarm >= 70 ? '#ff4444' : state.alarm >= 40 ? '#f58c28' : '#ffd24d';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax, 30, aw * (state.alarm / ALARM_MAX), 16);
  ctx.strokeStyle = '#8899bb';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax, 30, aw, 16);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(Math.floor(state.alarm) + '%', ax + aw + 8, 43);
  ctx.fillStyle = '#9fb2d8';
  ctx.font = '12px sans-serif';
  ctx.fillText(state.room.objective, ax, 60);

  // Right: loot, lives, tools, time — laid out right to left so
  // nothing overlaps: time, then hearts, then EMP, then smoke.
  const total = state.bankedLoot + state.roomLoot;
  ctx.fillStyle = GOLD_FILL;
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('TAKE ' + formatDollars(total), VIEW_W - 16, 26);
  const mm = Math.floor(state.elapsed / 60);
  const ss = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
  ctx.fillStyle = '#9fb2d8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(mm + ':' + ss, VIEW_W - 16, 50);
  for (let i = 0; i < 3; i++) {
    heart(ctx, VIEW_W - 84 - i * 20, 44, i < state.lives);
  }
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = state.tools.selected === 2 ? '#ffe9a8' : '#9fb2d8';
  ctx.fillText('[2] EMP x' + state.tools.emp, VIEW_W - 160, 50);
  ctx.fillStyle = state.tools.selected === 1 ? '#ffe9a8' : '#9fb2d8';
  ctx.fillText('[1] SMOKE x' + state.tools.smoke, VIEW_W - 270, 50);
}

const GOLD_FILL = '#f5c542';

export function drawMinimap(ctx, state) {
  const mw = 210;
  const mh = 122;
  const mx = VIEW_W - mw - 14;
  const my = VIEW_H - mh - 14;
  const sx = mw / VIEW_W;
  const sy = mh / (VIEW_H - HUD_H);
  ctx.fillStyle = 'rgba(8, 12, 24, 1)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, my, mw, mh);
  const py = (v) => my + (v - HUD_H) * sy;
  ctx.fillStyle = '#e8dcc3';
  for (const w of state.room.walls) {
    ctx.fillRect(mx + w.x * sx, py(w.y), Math.max(2, w.w * sx), Math.max(2, w.h * sy));
  }
  ctx.fillStyle = GOLD_FILL;
  for (const l of state.room.loots) {
    if (l.taken) continue;
    ctx.beginPath(); ctx.arc(mx + l.x * sx, py(l.y), 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#7dff9a';
  const e = state.room.exit;
  ctx.fillRect(mx + e.x * sx, py(e.y), 8, 5);
  ctx.fillStyle = '#5a8cff';
  for (const g of state.guards) {
    ctx.beginPath(); ctx.arc(mx + g.x * sx, py(g.y), 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffd24d';
  for (const c of state.cameras) {
    ctx.beginPath(); ctx.arc(mx + c.x * sx, py(c.y), 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx + state.player.x * sx, py(state.player.y), 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(mx + state.player.x * sx, py(state.player.y), 6, 0, Math.PI * 2); ctx.stroke();
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 9, 20, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 760;
  const h = 150 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = '#101a33';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent || GOLD_FILL;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = accent || GOLD_FILL;
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, y + 58);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, y + 104 + i * 30);
  });
  return { x, y, w, h };
}

export function drawTitle(ctx, state) {
  drawHud(ctx, state);
  const lines = [
    'One night. Three rooms. One getaway.',
    'You are Wren, a thief in the Meridian Museum after dark.',
    'Lift the loot, read the cones, mind the alarm — and get out.',
    '',
    'WASD / arrows — move    SHIFT — sneak (slow, quiet, hard to spot)',
    'E — grab loot / use vent / hold at the vault    SPACE — use tool',
    '1 / 2 — pick tool (smoke / EMP)    P — pause    R — restart room    M — mute',
    '',
    'Press ENTER or click to start the job.',
  ];
  panel(ctx, 'THE MERIDIAN JOB', lines, GOLD_FILL);
}

export function drawPause(ctx) {
  panel(ctx, 'PAUSED', [
    'The museum waits. The guards do not.',
    '',
    'P / Esc — resume    R — restart room    M — mute',
  ]);
}

export function drawIntermission(ctx, state) {
  const lines = [
    `Room clear — ${formatDollars(state.roomLoot)} lifted this room.`,
    `Banked take so far: ${formatDollars(state.bankedLoot)}.`,
    '',
    ...state.restockLines,
    '',
    'Press ENTER for the next room.',
  ];
  panel(ctx, 'ROOM CLEAR', lines, '#7dff9a');
}

export function drawCaught(ctx, state) {
  panel(ctx, 'CAUGHT!', [
    'A guard got hands on you. The room resets —',
    'loot from finished rooms stays banked.',
    '',
    `Lives left: ${state.lives}`,
  ], '#ff5566');
}

export function drawGameOver(ctx, state) {
  panel(ctx, 'THE JOB IS BLOWN', [
    'Three strikes — the museum wins tonight.',
    `You banked ${formatDollars(state.bankedLoot)} before it fell apart.`,
    '',
    'Press ENTER to try the job again.',
  ], '#ff5566');
}

export function drawWin(ctx, state) {
  const lines = [
    `Total take: ${formatDollars(state.bankedLoot + state.roomLoot)}`,
    `Time: ${Math.floor(state.elapsed / 60)}:${Math.floor(state.elapsed % 60).toString().padStart(2, '0')}  ·  Time bonus: ${formatDollars(state.timeBonus)}`,
    `Final score: ${formatDollars(state.bankedLoot + state.roomLoot + state.timeBonus)}`,
    '',
    `Rank: ${state.rank}`,
    state.rankNote,
    '',
    'Press ENTER to run it back.',
  ];
  panel(ctx, 'CLEAN GETAWAY', lines, GOLD_FILL);
}
