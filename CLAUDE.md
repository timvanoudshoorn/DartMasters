@AGENTS.md

# DartMasters

React Native (Expo SDK 54) darts scoring app. TypeScript, React Navigation
(native-stack), Reanimated 4, expo-av for sound, expo-haptics, AsyncStorage
for persistence. No backend.

- Type-check: `npx tsc --noEmit` (the only automated check; there are no tests)
- Run: `npm start` (Expo dev server)

## Design system — "Charcoal & Ember"

The app's visual identity: warm charcoal surfaces, one ember orange-red
accent, Bebas Neue for anything score-like, Inter for UI. Premium and
tactile, **never** neon, **never** gradients, **never** colored glow.

### Color (`src/theme/colors.ts`)

Depth comes from the **elevation ladder** — surfaces lighten as they rise:
`bg #0C0B0A → surface #131211 → card #181716 → card2 #1E1D1B → raised #252422`.
Raised elements also get a 1px **top-edge highlight** (`COLORS.edge`,
applied as `borderTopColor`) so they read as lit from above, plus soft
**black** shadows (iOS only — Android elevation is deliberately never used
because it breaks sibling touch handling; Android depth reads from the
ladder + edges alone).

Accent family: `accent #C13620` (the brand ember — fills and large shapes
only), `accentHot #E85C3F` (small text/icons on dark, for contrast),
`accentDeep #8E2716` (pressed/border of filled elements). Text is warm:
`text #F4F1EE`, `textSub #928E88`, `textFaint`, `textDim`. Positive green
`#57A05F` (checkout paths), bust red `#D93A2E`.

`src/theme/index.ts` re-exports semantic aliases (`colors.primaryHot`,
`bgRaised`, `textFaint`, `edge`, …) plus `spacing`, `radius`, `typography`
(includes `overline` — the letterspaced section-label style), and `shadow`
(`soft` / `deep` / `key` — all black; `shadow.glow` no longer exists).

### Motion (`src/theme/motion.ts`)

Four springs used everywhere: `SPRING_PRESS` (key travel), `SPRING_SNAPPY`
(selection thumbs/state), `SPRING_BOUNCY` (celebratory pops), `SPRING_GENTLE`
(sheets/large surfaces). `PRESS_SCALE` (key .93 / button .96 / row .98),
`STAGGER_MS = 45` for list entrances (Reanimated `FadeInDown.delay(i * STAGGER_MS)`).
Screen transitions live in `RootNavigator`: default `slide_from_right`;
BullOff/Game/GameSummary **fade** (entering the arena), with swipe-back
disabled during play and on the win screen.

### Haptics & sound (`src/sound/`)

`haptics.ts` is the single haptic vocabulary: `haptic.tick/light/medium/
heavy/rigid/soft/success/warning/error` plus multi-pulse `hapticPattern`s:
`dartHit(multiplier)` (single=light, double=medium, triple=rigid),
`bust`, `checkout`, `oneEighty`, `legWon`, `win` (rolling thunder, paced to
the win screen), `becomeKiller`, `eliminated`. **Rule: physical weight
tracks the dart; sound tracks the outcome.** `useSoundEffects` fires
sound + haptic signature together; game screens that already deliver a
contact haptic call `playSound()` directly to avoid double-firing.

### Interaction primitives (`src/components/primitives/`)

- `PressableScale` — the universal tactile surface: spring scale on
  contact, haptic on press-in, optional sound. **A bare `Pressable` in UI
  chrome is a design bug** (the self-contained CameraScoringScreen is the
  one exception).
- `CountUp` — eased count-up for stat reveals (win screen).

### Components

`Button` (solid ember primary w/ lit top edge, secondary/danger/outline/ghost),
`Card` (card surface + edge, `elevated` adds black shadow), `Screen`
(safe-area root; renders faint off-canvas **dartboard rings** top-right —
the app's backdrop texture; opt out with `texture={false}`), `Header`,
`Sheet` (bottom sheet w/ grabber, springs up), `SwitchRow` (custom animated
toggle — never the RN `Switch`), `OptionRow`/`SegmentButton`/`MultiplierSelector`
(sliding-thumb segmented control; arming double/triple turns the thumb
ember and clicks harder), `DartSlots`, `CheckoutBanner` (green wash +
breathing dot), `StatPill`, `EmptyState`, `PlayerAvatar`, `BotThinkingBadge`
(animated dots, no emoji), `effects/` (`Confetti` — ember-palette tumbling
pieces, two waves; `ScreenFlash`; `useShake`; `EventStinger` — full-screen
Bebas slam for ONE EIGHTY / 100+ finishes / BIG FISH).

Emoji are allowed as player avatar *content*, never as UI chrome (icons
come from `components/icons/Icon.tsx`).

### The win moment (`GameSummaryScreen`)

A staged ceremony, timed by the `REVEAL` constants: mode overline → winner
avatar zooms in with expanding pulse rings + trophy badge (haptic thump) →
CHAMPION name slam (success haptic) → stat cards stagger in with `CountUp`
numbers → actions rise last. Confetti runs throughout. Winner card leads
and is elevated; losers are dimmed.

## Screens

Home, ModeSelect, GameSetup, BullOff, Game (dispatcher) → game screens
(X01 for 501/301/201, Practice170, Cricket, AroundTheClock, Killer,
Shanghai, Bobs27), GameSummary, Stats, MatchDetail, PlayersList,
PlayerProfile, PlayerEdit, Challenges, Leaderboard, Settings,
CameraScoring.

The X01 screen is where players spend ~90% of their time: scoreboard
"stage" on top, raised input "tray" (`deck`) below with rounded top
corners and an upward shadow. Number keys are `PressableScale` with
weight-scaled haptics; the grid tints ember while a multiplier is armed.

## Hard rules

- **Do not touch** `CameraScoringScreen.tsx` or camera/vision logic — it
  keeps its own local design tokens on purpose.
- **Do not change** game logic (`src/logic/`) when doing visual work, and
  never alter AsyncStorage data shapes (`src/storage/`, `src/types/`).
- No gradients (`expo-linear-gradient` is installed but intentionally
  unused), no neon, no colored glow shadows, no default-looking RN
  controls, no Android `elevation`.
