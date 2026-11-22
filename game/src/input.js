// Keyboard and mouse input. Tracks held keys, edge-pressed keys
// (true for exactly one frame) and the mouse position on the canvas.

const KEY_ALIASES = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
  KeyE: 'interact',
  Space: 'tool',
  Digit1: 'tool1',
  Digit2: 'tool2',
  Digit3: 'tool3',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
  Enter: 'confirm',
  Escape: 'escape',
};

export function createInput() {
  return {
    held: Object.create(null),
    pressed: Object.create(null),
    mouseX: 640,
    mouseY: 400,
    mouseClicked: false,
    anyKey: false,
  };
}

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    const name = KEY_ALIASES[event.code];
    if (!name) return;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) {
      event.preventDefault();
    }
    if (!input.held[name]) input.pressed[name] = true;
    input.held[name] = true;
    input.anyKey = true;
  });
  window.addEventListener('keyup', (event) => {
    const name = KEY_ALIASES[event.code];
    if (!name) return;
    input.held[name] = false;
  });
  window.addEventListener('blur', () => {
    input.held = Object.create(null);
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.mouseClicked = true;
    input.anyKey = true;
  });
}

export function endFrame(input) {
  input.pressed = Object.create(null);
  input.mouseClicked = false;
  input.anyKey = false;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.held.left) x -= 1;
  if (input.held.right) x += 1;
  if (input.held.up) y -= 1;
  if (input.held.down) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.sqrt(2);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}
