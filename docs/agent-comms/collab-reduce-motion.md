# Collab spec: Reduce Motion toggle

Feature: an accessibility toggle (mirrors the just-shipped Haptics toggle)
that lets a user turn off/tone down Reanimated `entering=` layout
animations and the celebratory stinger/confetti effects, while keeping
haptics and sound untouched (those are separate toggles already).

## Sequencing

1. **Logic/Systems Agent writes this section first** — the state shape
   and persistence contract. UI/Animation build against what's written
   here, not against assumptions.
2. **Animation Agent reads this file, then implements**, appending its
   own section below with what it actually did and any deviation from
   the plan (with reasoning).
3. **QA/Integration Agent reviews the finished collab as a whole** once
   both sections are filled in — not each piece separately.

---

## Logic/Systems Agent — state shape (fill in below)

**Persisted setting** — `src/storage/storage.ts`
- `AppSettings.reducedMotionEnabled: boolean`, default `false` (motion is on
  by default; this is an opt-in reduction). Added to `DEFAULT_SETTINGS`.
  Purely additive — `SettingsStorage.get()` already merges
  `{...DEFAULT_SETTINGS, ...stored}`, so old persisted settings blobs
  without this field get `false` automatically. No migration needed.
- `src/logic/backup.ts` needs no changes — it round-trips `AppSettings`
  generically via spread (`exportAllData()` pulls the whole object from
  `SettingsStorage.get()`, `importAllData()` writes it back via
  `SettingsStorage.save({...SettingsStorage.defaults, ...data.settings})`).
  Verified, not touched.

**Runtime flag module** — `src/theme/motionPreference.ts` (new file)
Mirrors the module-level-flag pattern from `src/sound/haptics.ts`
(`setHapticsEnabled`/gated) and `soundManager.ts` (`setSoundEnabled`), but
with no async permission gating — just a boolean other modules read
synchronously:
```ts
export function setReducedMotionEnabled(enabled: boolean): void;
export function isReducedMotionEnabled(): boolean;
```
Module-level flag defaults to `false`. Does not import Reanimated or touch
any component — it is only the flag.

**Init wiring**
- `App.tsx`: in the existing `useEffect` that calls `SettingsStorage.get().then(s => {...})`
  (alongside `setSoundEnabled(s.soundEnabled)` / `setHapticsEnabled(s.hapticsEnabled)`),
  added `setReducedMotionEnabled(s.reducedMotionEnabled)`.
- `src/screens/SettingsScreen.tsx`: added a `SwitchRow` labeled "Reduce motion"
  directly under the existing "Haptics" row, wired to
  `update({ reducedMotionEnabled: v })`. The screen's `update()` function
  (which patches state + persists + syncs runtime flags) now also calls
  `setReducedMotionEnabled(patch.reducedMotionEnabled)` when that key is
  present in the patch, matching how `soundEnabled`/`hapticsEnabled` are
  handled there.

**Contract for Animation Agent — what "reduced" means and what to gate**
(This is intent/scope, not prescribed code — implementation approach is
yours to own.)

1. **Screen-entrance choreography**: every Reanimated `entering={FadeInDown...}`
   / `ZoomIn` / `FadeIn` / etc. prop across `src/screens/` and
   `src/components/` should, when `isReducedMotionEnabled()` is true, either
   be omitted entirely (content just appears) or use a near-zero-duration
   variant. This includes staggered entrances driven by `STAGGER_MS` delays
   (e.g. `FadeInDown.delay(i * STAGGER_MS)`) — the delay should collapse to
   0 too, not just the animation duration, otherwise list items still visibly
   cascade in one at a time.
2. **Celebratory/decorative effects**: `Confetti`, `EventStinger`,
   `ScreenFlash`, and similar non-essential flourishes (pulse rings on the
   win screen, `useShake` shake effects, etc.) should be skipped outright or
   fast-forwarded to their end state rather than played at full length.
3. **Out of scope / do not gate**: functional motion that *communicates
   state* — spring feedback on `PressableScale` press, `SwitchRow` thumb
   slide, `CheckoutBanner` breathing dot, key press scale-down — is not
   required to be gated by this flag. Reduced motion here targets
   ambient/decorative animation and screen-entrance choreography, not core
   tactile feedback. Use judgment on edge cases (e.g. `CricketMark` pop,
   `LifeDots` collapse) — these lean functional (they convey game state
   changes) but are also flourish-heavy; your call.
4. `MountReveal` (core-RN-Animated launch-safe entrance, used on
   `HomeScreen` and anything visible at app start) is a special case per
   `CLAUDE.md`'s hard rule about Reanimated `entering=` hanging at splash —
   don't swap its mechanism, but it's reasonable to shorten/skip its
   fade+rise when the flag is set, same intent as bullet 1.
5. Read the flag with `isReducedMotionEnabled()` from
   `src/theme/motionPreference.ts` at the point of use (e.g. inside a
   component's render, or when constructing an `entering=` prop) — it's a
   synchronous plain function, no subscription/listener exists. If a
   component needs to react to the setting changing while mounted (e.g.
   SettingsScreen itself, or a currently-visible screen), pull the current
   value fresh; there's no event emitter to subscribe to, by design (matches
   the haptics/sound flag pattern, which has the same limitation).

---

## Animation Agent — implementation (fill in below)

**Shared helpers** — `src/theme/motion.ts` (additive, imports `isReducedMotionEnabled`
from `motionPreference.ts`; no component/Reanimated imports added):
```ts
export function reducedMs(ms: number): number; // 0 when reduced motion is on, else ms unchanged
export function staggerDelay(index: number, step: number = STAGGER_MS): number; // reducedMs(index * step)
```
These are read fresh at the point of use (render / effect), matching the
no-subscription contract.

**Gated at the source (covers every call site automatically, no screen changes needed):**
- `src/components/primitives/MountReveal.tsx` — reads `isReducedMotionEnabled()`
  at mount; when on, delay collapses to 0, distance (rise) collapses to 0,
  duration is capped at 120ms. Mechanism unchanged (still core RN `Animated.timing`,
  still the launch-safe path) — only the numbers it animates toward change.
  This alone makes every `MountReveal` caller (HomeScreen and anything else
  using it) reduced-motion-correct without touching those screens.
- `src/components/effects/Confetti.tsx` — skipped outright (`pieces = []`,
  renders `null`) when reduced motion is on. No "end state" to fast-forward
  to for tumbling confetti, so full skip made more sense than the fast-forward
  option in the contract.
- `src/components/effects/ScreenFlash.tsx` — the wash `withSequence` simply
  doesn't fire when reduced motion is on (pure decoration, no info conveyed).
- `src/components/effects/useShake.ts` — `trigger()` no-ops when reduced
  motion is on (bust already has its own haptic/sound signature; the shake
  added nothing informational).
- `src/components/effects/EventStinger.tsx` — **fast-forwarded, not skipped**
  (deviation from "skip or fast-forward" — I chose fast-forward deliberately):
  it still names the event (ONE EIGHTY, big checkout, etc.), so hiding it
  entirely would remove information. Under reduced motion: no 2.4x oversized
  starting scale/no spring overshoot (starts at scale 1), hold shortened
  900ms → 350ms, fade timings shortened proportionally.
- `src/components/EmptyState.tsx` — its internal title/subtitle/action
  cascade (`delay(80)/(140)/(220)`) now runs through `reducedMs()`, so every
  empty-list screen in the app gets the fix for free.

**GameSummaryScreen** (`src/screens/GameSummaryScreen.tsx`) — judgment call,
did touch it (not on the excluded-files list, and it's the single highest-
visibility staged reveal in the app):
- All `REVEAL.*` delays used in `entering=` (overline, trophy ZoomIn, trophy
  badge ZoomIn, name FadeInDown, draw fallback, per-card stagger, actions
  FadeInUp) now route through a local `R` object built with `reducedMs()`,
  computed once per render. The haptic-echo `setTimeout`s (trophy thump,
  name success buzz) use `reducedMs()` on the same constants so the physical
  feedback still lands in sync with the (now-instant) visual state, instead
  of firing hundreds of ms after the content has already appeared.
- `duration(400)` on the two `FadeIn`/`FadeInDown` calls that had a fixed
  400ms duration (not delay) becomes `reducedMs(400) || 1` — Reanimated gets
  a 1ms floor instead of a literal 0, out of caution around zero-duration
  edge cases in some Reanimated versions; functionally instant either way.
- `PulseRing` (the two hairline rings behind the winner avatar) — pure
  decoration, conveys no information beyond "something is being celebrated"
  — skipped outright (returns `null`, effect no-ops) under reduced motion.
- `CountUp` calls for the stat cards and the mode-label reveal keep counting
  (they convey the actual stat value, so I didn't skip them) but delay/
  duration are cut via `reducedMs()`/a fixed short duration (150ms instead
  of 650ms) so the number still visibly resolves without the multi-second
  roll.
- `Confetti` usage in this screen needed no change — gated at its own source.

**Stagger-cascade call sites** — mechanical `i * STAGGER_MS` → `staggerDelay(i)`
(or `staggerDelay(i, step)` / `reducedMs(fixedMs)` for non-per-index fixed
section delays) swap, one import + a handful of one-line edits per file, in:
`ChallengesScreen.tsx`, `BullOffScreen.tsx`, `AroundTheClockGameScreen.tsx`,
`Bobs27GameScreen.tsx`, `KillerGameScreen.tsx`, `HalveItGameScreen.tsx`,
`ShanghaiGameScreen.tsx`, `MatchDetailScreen.tsx`, `LeaderboardScreen.tsx`,
`PlayerProfileScreen.tsx`, `ModeSelectScreen.tsx`, `PlayersListScreen.tsx`,
`RulesScreen.tsx`, `SearchScreen.tsx`, `TournamentBracketScreen.tsx`,
`GameSetupScreen.tsx`, `TournamentSetupScreen.tsx`. Base `.duration(NNN)`
values on these plain `FadeInDown` list-row entrances were left alone
(un-gated) — a single ~240–280ms fade+slide per row, with all rows now
starting at delay 0 instead of cascading, reads as a fast unified reveal
rather than something that needs further gating; going further felt like
diminishing returns for the added diff size.

**Explicitly left alone (judgment calls / out of scope):**
- `CricketMark` pop and `LifeDots` gain/lose animations — left ungated.
  Both convey an actual state change (a mark just landed, a life was just
  lost/gained) at the moment it happens during live play, not a passive
  screen-entrance cascade — closer to `CheckoutBanner`/`PressableScale`
  than to `Confetti`/`EventStinger` in spirit.
- Per-throw / live-game-state `entering=` in `X01GameScreen.tsx`,
  `CricketGameScreen.tsx`, `GameHud.tsx`, `DartSlots.tsx`,
  `BotThinkingBadge.tsx`, `PlayerSelectGrid.tsx` (dart hit pips, bust
  banner, checkout card, bot-thinking badge, active-tile ZoomIn, etc.) —
  all communicate an in-the-moment game event, not decoration. Left ungated,
  same reasoning as CricketMark/LifeDots.
- `Sheet.tsx`'s `SlideInDown` spring-up — this is an on-demand modal opening
  in response to a user action, not a passive screen-entrance cascade;
  closer to `SwitchRow`'s thumb-slide in spirit. Left ungated; flagging in
  case QA disagrees, this would be a one-line change (gate the entering=
  builder or fall back to plain `FadeIn`).
- `Header.tsx`'s single `FadeInDown.duration(280)` — a single non-cascading
  fade with no delay, negligible motion, left as-is.
- Did not touch `StatsScreen.tsx`, `StatsTrendsScreen.tsx`,
  `AchievementsScreen.tsx`, `HeadToHeadScreen.tsx`, `SettingsScreen.tsx` per
  the no-collision instruction — all five still have un-gated
  `i * STAGGER_MS` / `Math.min(i,8) * STAGGER_MS` entrance delays. Flagging
  for whichever agent owns them next: same one-line `staggerDelay()` swap
  as the fourteen files above would bring them in line.

**Files touched:**
`src/theme/motion.ts`, `src/components/primitives/MountReveal.tsx`,
`src/components/effects/Confetti.tsx`, `EventStinger.tsx`, `ScreenFlash.tsx`,
`useShake.ts`, `src/components/EmptyState.tsx`, `src/screens/GameSummaryScreen.tsx`,
`ChallengesScreen.tsx`, `BullOffScreen.tsx`, `MatchDetailScreen.tsx`,
`LeaderboardScreen.tsx`, `PlayerProfileScreen.tsx`, `ModeSelectScreen.tsx`,
`PlayersListScreen.tsx`, `RulesScreen.tsx`, `SearchScreen.tsx`,
`TournamentBracketScreen.tsx`, `GameSetupScreen.tsx`, `TournamentSetupScreen.tsx`,
`src/screens/game/AroundTheClockGameScreen.tsx`, `Bobs27GameScreen.tsx`,
`KillerGameScreen.tsx`, `HalveItGameScreen.tsx`, `ShanghaiGameScreen.tsx`.

**Flag-on / flag-off trace (for QA):**
- *Confetti, flag off*: `isReducedMotionEnabled()` returns `false` (default) →
  `Confetti({active: true})` builds 90 `PieceConfig`s as before, renders as
  before. No behavior change from pre-existing code.
- *Confetti, flag on*: `setReducedMotionEnabled(true)` called (via Settings
  toggle → `App.tsx`/`SettingsScreen.tsx` wiring already in place) →
  `isReducedMotionEnabled()` returns `true` → `pieces` memo returns `[]` and
  the component's final `if (!active || reduced) return null` short-circuits
  before rendering any `View`/`ConfettiPiece`. Confirmed by reading the
  updated source: both the `useMemo` guard and the render guard check the
  same `reduced` const, so there's no path where pieces are computed but
  still rendered, or vice versa.
- *GameSummaryScreen stagger, flag off*: `R.stats` = `reducedMs(900)` = 900
  (unchanged), `R.statStep` = `reducedMs(110)` = 110 → player cards land
  900ms, 1010ms, 1120ms... after mount, exactly as before.
- *GameSummaryScreen stagger, flag on*: `reducedMs` short-circuits every one
  of those constants to 0 → `delay = 0 + cardIndex * 0 = 0` for every card →
  all `FadeInDown` entrances fire immediately with their base
  `.springify().damping(16)` (no explicit `.duration()`, so Reanimated's
  default spring settle applies — this is the one place duration isn't also
  collapsed, since spring configs don't take a `duration()` call the way
  timing-based builders do; the springs are fast — `damping(16)` on a
  default-stiffness spring settles in well under 300ms — so this reads as
  "cards assemble at once" rather than "cards cascade in one by one", which
  is the actual complaint reduced-motion addresses). `PulseRing` renders
  `null` under the same flag. Confetti (rendered separately above it) is
  also suppressed. I did not have a device to visually confirm, but traced
  every constant feeding these entrances back to `isReducedMotionEnabled()`
  and found no path where a hardcoded literal bypasses the flag.
- *MountReveal, flag on, HomeScreen*: e.g. `<MountReveal delay={STAGGER_MS}>`
  (delay=45 authored) → inside `MountReveal`, `reduced = true` →
  `effectiveDelay = 0`, `effectiveDuration = min(320, 120) = 120`,
  `effectiveDistance = 0` → `Animated.timing` runs a 120ms opacity-only fade
  (translateY interpolation is `[0,1] → [0,0]`, i.e. a no-op) starting
  immediately on mount. HomeScreen itself required zero edits for this to
  be correct.
