# Visual Polish Log

Branch: `visual-polish`, worked from an isolated `git worktree` at
`../DartMasters-visual-polish` (branched from `visual-upgrade-v2`, which
has the most recent visual work — icon system, icon avatars, deeper
game-mode motion, MountReveal launch-safe entrance — ahead of
`bugfix-sweep`/`main`). Isolated because the main working directory is
shared with other concurrent agents actively committing to other
branches (`bugfix-sweep`, `audio-pipeline`, `feature-build`).

## Design system check (start of session)

Checked `src/theme/colors.ts` directly against CLAUDE.md's documented
Charcoal & Ember system: elevation ladder `#0C0B0A → #131211 → #181716 →
#1E1D1B → #252422`, ember accent `#C13620`/`#E85C3F`/`#8E2716`, Bebas
Neue for scores, Inter for UI. **Matches exactly — no discrepancy.**
CLAUDE.md is accurate and current; using it as source of truth.

## Screens

### Home
Already fully polished on `visual-upgrade-v2`: `MountReveal` staggered
entrance (header → continue card → stats band → challenges → CTA → nav
grid), real icons, no bare `Pressable`. No changes needed.

### Mode Select
Already solid: staggered `FadeInDown` row entrance (safe here — not the
launch route), real icons, consistent card styling. No changes needed.

### Game Setup
Found one design-rule violation: `MultiplierSelector` (the sliding-thumb
segmented control used in the X01 scoring tray) used a bare `Pressable`
per segment instead of `PressableScale`, so segments gave no tactile
scale feedback on press — inconsistent with `SegmentButton` and the
"bare Pressable in UI chrome is a design bug" rule. Fixed: segments now
use `PressableScale` with `PRESS_SCALE.key`, `haptic="none"` (the
differentiated tick/medium haptic logic already lived in the ownPress
handler, preserved as-is). Rest of the screen (guest chips, bot
picker, PlayerSelectGrid) already used real primitives correctly.

### Bull Off
Already well-crafted: settled-order rows spring in with staggered
`FadeInDown`, checkmarks zoom in, pick tiles stagger on entry. No
changes needed.

### In-game screens (X01, Cricket, Killer, Shanghai, AroundTheClock,
Bobs27, Practice170)
X01 and Practice170 are already excellent — dart slots, checkout
banner/breathing ring, bust shake + flash, leg-dot zoom-ins, event
stingers. Cricket and Killer already use `CricketMark`/`LifeDots` for
per-mark and per-life animation.

Found one motion inconsistency shared by the four "compact spotlight"
screens (Shanghai, Bob's 27, Around the Clock, Killer's play phase): the
3-dot "darts this turn" indicator just snapped to filled instead of
popping like the equivalent leg dots on X01 — and their score
cards/track rows/claim chips had no mount stagger, unlike every other
list in the app. Fixed all four: dart dots now `ZoomIn.springify()` on
fill (same spring as X01's leg dots), and score cards / target tracks /
claim chips / player tiles now `FadeInDown` stagger on mount at
`STAGGER_MS` cadence. Cricket's dart dots got the same `ZoomIn` fix.

### Win Screen (GameSummary)
Already the full staged ceremony described in CLAUDE.md — pulse rings,
trophy zoom, CHAMPION name slam, staggered `CountUp` stat cards,
confetti throughout. No changes needed.

### Stats
Already solid: `CircularProgress` win-rate ring, `CountUp` overview
tiles, staggered match-history rows, `EmptyState`. No changes needed.

### Players (List / Profile / Edit)
`PlayersListScreen` and `PlayerEditScreen` were already fully
instrumented (staggered rows, real primitives, no bare `Pressable`).
`PlayerProfileScreen` had zero entrance choreography — a flat list of
stat pills, game-type cards, and match rows all appearing instantly,
inconsistent with every other data screen in the app. Added
`FadeInDown` stagger to the profile header, overall stat-pill row,
per-game-type stat cards, and match-history rows.

### Challenges
Already excellent: checkmark zoom-in, progress-bar sweep-in, staggered
cards. No changes needed.

### Settings
Had no entrance animation at all — the only screen in the app where
all content appeared instantly with no motion. Added `FadeInDown`
stagger to the three section cards (match rules, manage players, data)
at `STAGGER_MS` cadence, matching the rest of the app. All primitives
(`SwitchRow`, `OptionRow`, `PressableScale`) were already correct.

## Summary
The app was already close to fully polished — visual-upgrade-v2 had
done the heavy lifting (icon system, deep game-mode motion, launch-safe
Home entrance). This pass found and fixed the remaining gaps: one real
design-rule violation (`MultiplierSelector`'s bare `Pressable`), and a
handful of screens/controls that were functionally correct but missing
the mount-stagger and micro-pop conventions used everywhere else
(Shanghai/Bobs27/AroundTheClock/Killer dart dots and score cards,
PlayerProfileScreen, SettingsScreen). No game logic, scoring math, or
camera/detection code was touched.

## Follow-up session — cross-log check + closing sweep
Checked `BUGLOG.md` (bugfix-sweep/audio-pipeline/audio-pipeline-work),
`FEATURE_LOG.md` (feature-build), and `AUDIO_LOG.md` (bugfix-sweep) on
every branch that has them for anything tagged `@visual:` — found none.
`bugfix-sweep`'s own BUGLOG already independently verified the visual
overhaul touched no game logic or camera code, matching this log's
hard-rule compliance.

Re-verified `visual-upgrade-v2` hasn't moved since branching (still at
`bdd25cd`), so nothing upstream to rebase onto. Ran a final grep sweep
across every screen/component for the remaining violation classes: bare
`Pressable` (only the two known-legitimate exceptions — `Sheet`'s modal
scrim, `SwitchRow`'s own thumb — remain), emoji outside
`CameraScoringScreen`, `expo-linear-gradient` usage, Android
`elevation`, and stock RN `Switch`. All clean. Spot-checked
`QuickAddPlayerSheet` and `Sheet` (both route through `Button`/
`PressableScale` correctly and already have full spring/fade
choreography) — no changes needed.

No new work found. All 10 screens have had a full pass; nothing
outstanding from other agents. Session closed here rather than
manufacturing busywork.

**@bugs:** none found this session.
**@features:** none found this session.
**@audio:** none found this session.
