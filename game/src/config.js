// THE MERIDIAN JOB — tuning constants for the whole heist.
// One place for every number the other files play by, so a balance
// change never means hunting through the game code.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;
export const PLAY_TOP = HUD_H;
export const PLAY_BOTTOM = VIEW_H;
export const PLAY_LEFT = 0;
export const PLAY_RIGHT = VIEW_W;

// The thief, Wren.
export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 178;
export const PLAYER_SNEAK_SPEED = 96;
export const PLAYER_NOISE_WALK = 96;
export const PLAYER_NOISE_SNEAK = 26;
export const PLAYER_GRAB_RANGE = 46;
export const PLAYER_INTERACT_RANGE = 58;

// Guards.
export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_INVESTIGATE_SPEED = 118;
export const GUARD_CHASE_SPEED = 168;
export const GUARD_VISION_RANGE = 272;
export const GUARD_VISION_HALF_ANGLE = 0.62;
export const GUARD_CATCH_RANGE = 26;
export const GUARD_SUSPICION_FILL = 62;
export const GUARD_SUSPICION_DECAY = 34;
export const GUARD_WARN_AT = 58;
export const GUARD_CHASE_AT = 100;
export const GUARD_LOSE_SIGHT_TIME = 2.6;
export const GUARD_SHADOW_RANGE_FACTOR = 0.55;
export const GUARD_SHADOW_FILL_FACTOR = 0.5;

// Security cameras and the rooftop searchlight.
export const CAMERA_RANGE = 305;
export const CAMERA_HALF_ANGLE = 0.5;
export const CAMERA_ALARM_RATE = 30;
export const SEARCHLIGHT_RANGE = 385;
export const SEARCHLIGHT_HALF_ANGLE = 0.42;
export const SEARCHLIGHT_ALARM_RATE = 42;

// The alarm meter.
export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 15;
export const ALARM_DECAY = 7;
export const ALARM_LOCKDOWN_SECONDS = 10;
export const ALARM_AFTER_LOCKDOWN = 55;

// Tools.
export const SMOKE_START_COUNT = 2;
export const SMOKE_RADIUS = 112;
export const SMOKE_SECONDS = 5;
export const SMOKE_RESTOCK_COST = 300;
export const EMP_START_COUNT = 1;
export const EMP_SECONDS = 5;
export const EMP_RESTOCK_COST = 500;

// The vault lockpick (room 2).
export const VAULT_NEEDLE_SPEED = 32; // needle units per second
export const VAULT_PROGRESS_IN_ZONE = 34;
export const VAULT_PROGRESS_OUT_ZONE = 10;
export const VAULT_ZONE_HALF_WIDTH = 16;

// Lasers (room 2 corridor).
export const LASER_ON_SECONDS = 1.7;
export const LASER_OFF_SECONDS = 1.6;
export const LASER_ALARM_HIT = 34;

// Lives and scoring.
export const START_LIVES = 3;
export const TIME_BONUS_PER_SECOND = 12;

// Loot values, in dollars.
export const LOOT_VALUES = {
  paintingSmall: 450,
  painting: 650,
  paintingGrand: 900,
  goldBar: 1200,
  gem: 5000,
  sapphire: 6000,
  cashCrate: 1500,
  supplyCrate: 800,
};
