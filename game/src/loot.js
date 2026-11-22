// Loot: the glowing gold targets of the job. Every item carries a
// dollar value, a name, and a sparkle the render pass draws.

export function lootRemaining(room) {
  return room.loots.filter((l) => !l.taken).length;
}

export function lootTotal(room) {
  return room.loots.reduce((sum, l) => sum + (l.taken ? 0 : l.value), 0);
}

export function roomLootValue(room) {
  return room.loots.reduce((sum, l) => sum + l.value, 0);
}

export function formatDollars(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
