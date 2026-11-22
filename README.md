[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/dylikeu/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/dylikeu/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# THE MERIDIAN JOB — a three-room museum heist

A top-down stealth heist in plain Canvas 2D — no libraries, no network, no build step. You are Wren, a thief in the Meridian Museum after dark. Three rooms, one night, one getaway.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080).

- **WASD / arrows** — move
- **Hold SHIFT** — sneak (slower, quieter, harder to spot)
- **E** — grab loot / slip through a vent / hold at the vault door to pick the lock
- **SPACE** — use the selected tool
- **1 / 2** — pick a tool (smoke bomb / EMP)
- **P** — pause · **R** — restart room · **M** — mute

## The job

1. **The Gallery** — lift all 4 paintings, read the patrols, slip out the service door.
2. **The Vault Hall** — pick the vault (keep the needle in the green), dodge the laser grid, take the Meridian Star gem and the gold inside.
3. **The Rooftop** — the alarm is already hot. Grab the Star Sapphire under the searchlight and run for the getaway van.

## Systems

- **Guards with vision cones** — yellow calm, orange suspicious, red chase. A "!" warns you before the chase starts; guards investigate the last place they saw you, then return to patrol.
- **Security cameras** — sweeping cones that feed the alarm. An EMP kills them for 5 seconds.
- **The alarm meter (0–100)** — rises when you are seen, decays while hidden. At 100 the museum locks down for 10 seconds: doors seal, lights go red, an extra guard walks in.
- **Tools at a cost** — smoke bombs (block vision) and EMPs are limited per room and cost loot dollars to restock between rooms.
- **Hiding** — green shadow zones halve detection, display cases block line of sight, vents are one-way fast travel.
- **Noise** — walking sends out a ring guards can hear; sneaking is quiet.
- **Lasers** — the vault corridor's beams blink on and off; cross while they are off.
- **Lives and rank** — caught three times and the job is blown. Finish all three rooms for a rank: Clean Getaway, Smooth Operator, or Loud & Proud.

## Structure

- `game/index.html` — canvas + status line, loads `src/main.js`
- `game/src/main.js` — boot, fixed-step loop, screens, the self-test bot
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — seeded RNG
- `game/src/input.js` — keyboard + mouse
- `game/src/player.js` — Wren: move, sneak, noise, interact
- `game/src/guard.js` — patrol AI, vision cones, suspicion, chase
- `game/src/camera.js` — sweeping cameras and the searchlight
- `game/src/room.js` — the 3 rooms: walls, cover, vents, loot, exits
- `game/src/loot.js` — loot values and totals
- `game/src/alarm.js` — alarm meter, lockdown, extra guard
- `game/src/tools.js` — smoke, EMP, vault lockpick, restock
- `game/src/render.js` — canvas drawing: floor, cones, loot glow, lighting
- `game/src/hud.js` — HUD, minimap, menus, win/lose screens
- `game/src/audio.js` — WebAudio bleeps only (no audio files)
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/path.js` — grid A* so the self-test bot walks around walls

## Screenshots

`?shot=cover|vault|getaway|shadows&seed=1` stages a deterministic frame from the real game code (frozen world, real render) for each of the four screenshots in `screenshots/`.

## Hand-in

`main.ts` copies `game/` and `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `/output/dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.

Built for the make.fun bounty [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559).
