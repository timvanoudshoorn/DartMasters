import * as Haptics from 'expo-haptics';

// ── Haptic vocabulary ───────────────────────────────────────────────────────
// Single semantic layer over expo-haptics so every interaction in the app
// speaks the same physical language:
//   tick    — selection changes, toggles, multiplier arming
//   light   — ordinary key/button contact
//   medium  — a double, a meaningful landing
//   rigid   — a triple, a sharp premium "click"
//   soft    — a miss, deliberately underwhelming
//   heavy   — big structural moments
// Patterns below sequence these into signatures for game events.

const safe = (p: Promise<unknown>) => p.catch(() => {});

export const haptic = {
  tick: () => safe(Haptics.selectionAsync()),
  light: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  rigid: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  soft: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

type Step = { at: number; play: () => void };

function sequence(steps: Step[]) {
  steps.forEach(({ at, play }) => {
    if (at <= 0) play();
    else setTimeout(play, at);
  });
}

export const hapticPattern = {
  /** Weight scales with the dart: single < double < triple. */
  dartHit: (multiplier: 1 | 2 | 3) => {
    if (multiplier === 3) haptic.rigid();
    else if (multiplier === 2) haptic.medium();
    else haptic.light();
  },

  miss: () => haptic.soft(),

  /** Stumble: error buzz then two dead thuds. Unmistakably wrong. */
  bust: () =>
    sequence([
      { at: 0, play: haptic.error },
      { at: 130, play: haptic.heavy },
      { at: 280, play: haptic.heavy },
    ]),

  /** Two sharp clicks rising into success — the double lands, the leg is done. */
  checkout: () =>
    sequence([
      { at: 0, play: haptic.rigid },
      { at: 100, play: haptic.rigid },
      { at: 220, play: haptic.success },
    ]),

  /** Three rising strikes, one per perfect dart, then the payoff. */
  oneEighty: () =>
    sequence([
      { at: 0, play: haptic.medium },
      { at: 110, play: haptic.rigid },
      { at: 220, play: haptic.heavy },
      { at: 400, play: haptic.success },
    ]),

  legWon: () =>
    sequence([
      { at: 0, play: haptic.medium },
      { at: 140, play: haptic.success },
    ]),

  /** Rolling thunder for the match win — paced to the win screen reveal. */
  win: () =>
    sequence([
      { at: 0, play: haptic.heavy },
      { at: 160, play: haptic.heavy },
      { at: 340, play: haptic.success },
      { at: 560, play: haptic.rigid },
    ]),

  becomeKiller: () =>
    sequence([
      { at: 0, play: haptic.rigid },
      { at: 120, play: haptic.success },
    ]),

  eliminated: () =>
    sequence([
      { at: 0, play: haptic.error },
      { at: 160, play: haptic.heavy },
    ]),
};
