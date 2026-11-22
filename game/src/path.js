// Grid pathfinding for the self-test bot (and any future AI that
// needs to walk the museum). A coarse A* over 40px cells, with a
// line-of-sight shortcut pass so the path does not zig-zag.

import { circleHitsRect, hasLineOfSight } from './room.js';

const CELL = 40;
const COLS = Math.ceil(1280 / CELL);
const ROWS = Math.ceil((800 - 64) / CELL);
const TOP = 64;

function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: TOP + row * CELL + CELL / 2 };
}

function walkable(col, row, walls) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const c = cellCenter(col, row);
  for (const w of walls) {
    if (circleHitsRect(c.x, c.y, 18, w)) return false;
  }
  return true;
}

function toCell(x, y) {
  return {
    col: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))),
    row: Math.max(0, Math.min(ROWS - 1, Math.floor((y - TOP) / CELL))),
  };
}

// The bot can end up pressed against a wall in a cell no circle
// fits in. Snap such a start or goal to the nearest walkable cell.
function nearestWalkable(cell, walls) {
  if (walkable(cell.col, cell.row, walls)) return cell;
  for (let radius = 1; radius <= 4; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const c = { col: cell.col + dc, row: cell.row + dr };
        if (walkable(c.col, c.row, walls)) return c;
      }
    }
  }
  return cell;
}

// Is the straight walk from (x1, y1) to (x2, y2) clear for a
// circle of radius 14? Sampled along the segment, so a shortcut
// never clips a wall corner the thin-line test would allow.
function clearPath(x1, y1, x2, y2, walls) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 10));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    for (const w of walls) {
      if (circleHitsRect(x, y, 14, w)) return false;
    }
  }
  return true;
}

function heuristic(a, b) {
  const dx = Math.abs(a.col - b.col);
  const dy = Math.abs(a.row - b.row);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

// A* from (sx, sy) to (tx, ty). Returns world-space waypoints.
export function findPath(sx, sy, tx, ty, walls) {
  const start = nearestWalkable(toCell(sx, sy), walls);
  const goal = nearestWalkable(toCell(tx, ty), walls);
  const key = (c, r) => c + ',' + r;
  const open = [{ ...start, g: 0, f: heuristic(start, goal), parent: null }];
  const gScore = new Map([[key(start.col, start.row), 0]]);
  const closed = new Set();
  const dirs = [
    [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
  ];
  let goalNode = null;
  let guard = 0;
  while (open.length > 0 && guard < 4000) {
    guard++;
    let best = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[best].f) best = i;
    }
    const current = open.splice(best, 1)[0];
    const ck = key(current.col, current.row);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (current.col === goal.col && current.row === goal.row) {
      goalNode = current;
      break;
    }
    const from = cellCenter(current.col, current.row);
    for (const [dc, dr, cost] of dirs) {
      const nc = current.col + dc;
      const nr = current.row + dr;
      if (!walkable(nc, nr, walls)) continue;
      // No cutting corners through a wall, and no step whose
      // straight line crosses a wall (thin walls can sit between
      // two walkable cell centers).
      if (dc !== 0 && dr !== 0) {
        if (!walkable(current.col + dc, current.row, walls)) continue;
        if (!walkable(current.col, current.row + dr, walls)) continue;
      }
      const to = cellCenter(nc, nr);
      if (!hasLineOfSight(from.x, from.y, to.x, to.y, walls)) continue;
      const nk = key(nc, nr);
      const ng = current.g + cost;
      if (ng < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, ng);
        open.push({ col: nc, row: nr, g: ng, f: ng + heuristic({ col: nc, row: nr }, goal), parent: current });
      }
    }
  }
  if (!goalNode) return [{ x: tx, y: ty }];
  // Rebuild the cell path, then shortcut it with line of sight from
  // the bot's actual position, so every waypoint is reachable by a
  // straight walk from the one before it.
  const cells = [];
  let node = goalNode;
  while (node) {
    cells.unshift(node);
    node = node.parent;
  }
  const points = [{ x: sx, y: sy }];
  for (const c of cells) points.push(cellCenter(c.col, c.row));
  points.push({ x: tx, y: ty });
  const short = [points[0]];
  let i = 0;
  while (i < points.length - 1) {
    let j = points.length - 1;
    while (j > i + 1 && !clearPath(points[i].x, points[i].y, points[j].x, points[j].y, walls)) {
      j--;
    }
    short.push(points[j]);
    i = j;
  }
  return short.slice(1);
}
