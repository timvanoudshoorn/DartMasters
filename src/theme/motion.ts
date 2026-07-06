// ── Motion vocabulary ───────────────────────────────────────────────────────
// Every animation in the app draws from these four springs and three
// durations so motion feels like one material throughout.

/** Key/button press response — fast in, no wobble. */
export const SPRING_PRESS = { damping: 20, stiffness: 420, mass: 0.6 };

/** State changes that should feel decisive (selection thumbs, active cards). */
export const SPRING_SNAPPY = { damping: 18, stiffness: 280 };

/** Celebratory pops — trophy, stingers, score slams. One clean overshoot. */
export const SPRING_BOUNCY = { damping: 12, stiffness: 190 };

/** Large surfaces settling — sheets, screen blocks. */
export const SPRING_GENTLE = { damping: 22, stiffness: 150 };

export const DURATION = {
  fast: 120,
  base: 220,
  slow: 340,
};

/** Press-scale targets by element size: small keys dip more than big rows. */
export const PRESS_SCALE = {
  key: 0.93,
  button: 0.96,
  row: 0.98,
};

/** Per-index delay for staggered list entrances. */
export const STAGGER_MS = 45;
