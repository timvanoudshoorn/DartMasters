// ── Reduced motion preference ────────────────────────────────────────────────
// Mirrors the module-level flag pattern used by src/sound/haptics.ts
// (setHapticsEnabled / gated) and src/sound/soundManager.ts (setSoundEnabled):
// a plain boolean set once at launch from AppSettings.reducedMotionEnabled
// and again whenever the user flips the "Reduce motion" toggle in Settings.
// Defaults off (motion is on by default) so screens behave normally before
// settings load.
//
// Contract for what "reduced" means in this app (implementation is the
// Animation Agent's job, not this module's):
//   - Reanimated `entering=`/`exiting=` layout animations (FadeInDown, ZoomIn,
//     FadeIn, etc.) used across src/screens/ and src/components/ should render
//     instantly, or with a near-zero duration, instead of animating in. This
//     includes staggered list entrances driven by STAGGER_MS delays — the
//     delay should collapse to 0 too, not just the animation duration.
//   - Celebratory/decorative effects — Confetti, EventStinger, ScreenFlash,
//     and similar non-essential flourishes (pulse rings, "shake" effects from
//     useShake, etc.) — should be skipped entirely or fast-forwarded to their
//     end state, rather than played at full length.
//   - Functional motion that communicates state (e.g. spring feedback on
//     PressableScale press, SwitchRow thumb slide, checkout banner) is NOT
//     required to be gated by this flag — reduced motion here targets
//     ambient/decorative animation and screen-entrance choreography, not
//     core tactile feedback. (Animation Agent should use judgment; this
//     module only exposes the flag.)
//
// This module intentionally does not import Reanimated or touch any
// component — it is just the flag other modules read.

let reducedMotionEnabled = false;

export function setReducedMotionEnabled(enabled: boolean) {
  reducedMotionEnabled = enabled;
}

export function isReducedMotionEnabled(): boolean {
  return reducedMotionEnabled;
}
