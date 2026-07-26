# DartMasters UI Consistency — Phase 5 (Final QA)

Read-only verification pass over Phases 1-4. No code was modified. Every
finding below was checked against the current state of the repo directly
(not taken from prior phase reports) — file paths and line numbers are
cited so they can be re-checked.

## Verdict

**Ship as-is.** The redesign holds together. All three new shared
components (`GameHud`, `PlayerFilterChips`, `TabBar`) and the extended
`DartPad` consume theme tokens exclusively, are wired up consistently
across every screen they target, and no dead code or double-fired
sound/haptic regressions were found. The two open items from the
original audit that remain unresolved were deliberately deferred with
documented reasoning in Phase 3/4, not silently dropped — see items 4
and (partially) 2 in the table below. Nothing found in this pass rises
above "low" severity.

## Top-10 audit fixes — pass/fail

| # | Fix | Status | Evidence |
|---|---|---|---|
| 1 | Unify in-game HUD top bar across all 8 game screens | **Resolved** | `src/components/GameHud.tsx` created; all 9 screens (X01, Practice170, CheckoutTrainer, HalveIt, Bobs27, Shanghai, AroundTheClock, Killer ×3 phases, Cricket) render `<GameHud onExit centerContent dartsThisTurn? />`. Grepped every game screen — no leftover `topBar`/`exitBtn`/`dartsIndicator` style keys remain (checked all 8 game screens + CheckoutTrainerScreen); `legPill`/`titlePill` style names that still appear are the *content* passed into `centerContent`, not the old wrapper — correctly retained. |
| 2 | Route X01GameScreen's layout through `radius`/`spacing` tokens | **Resolved** (for the flagged bug) | `bottomBtn`'s radius-11-vs-14 drift is gone because X01 now renders bull/miss via `DartPad`, which uses `radius.md` uniformly (`src/components/DartPad.tsx` lines 178-199). Some one-off magic numbers (8, 12, 13, 16) remain in `X01GameScreen.tsx`'s stylesheet by design (documented in phase4-game-screens.md as deliberate one-offs, not drift) — verified these don't coincide with scale values, so leaving them isn't a bug. |
| 3 | Fix `SwitchRow` to use `PressableScale` | **Resolved** | `src/components/SwitchRow.tsx` line 9 imports `PressableScale`, line 50 uses it with `haptic="tick"`; no bare `Pressable` import remains in the file. |
| 4 | Extract `PlayerFilterChips` for Achievements/HeadToHead/StatsTrends | **Partially resolved (documented)** | `src/components/PlayerFilterChips.tsx` created and wired into `AchievementsScreen.tsx` (line 73) and `StatsTrendsScreen.tsx` (line 75). `HeadToHeadScreen.tsx` was deliberately left untouched — its picker is a two-player order-tracked multi-select, structurally different from the single-select contract. This is a documented judgment call, not an oversight; confirmed `HeadToHeadScreen.tsx` still has its own independent chip implementation. |
| 5 | Decide `DartPad` vs. X01's bespoke pad | **Resolved** | `DartPad.tsx` extended with `variant`/`primeSegments` props; `X01GameScreen.tsx` line 661 now calls `<DartPad onDart={tapDart} disabled={inputDisabled} variant="x01" primeSegments={PRIME_SEGMENTS} />`. Old `numberGrid`/`bottomRow`/`tapSegment`/`multiplier` state fully removed — grepped for all of these, zero remaining references in X01GameScreen.tsx. |
| 6 | Give `CheckoutTrainerScreen` a real top bar | **Resolved** | Uses `<GameHud>` (line 155), same as every game screen. |
| 7 | Extract shared `TabBar` for Challenges/Leaderboard | **Resolved** | `src/components/TabBar.tsx` created; wired into `ChallengesScreen.tsx` (line 53) and `LeaderboardScreen.tsx` (line 177). |
| 8 | Centralize "earned/completed" checkmark badge color | **Resolved** | `colors.onFill` applied at both call sites: `AchievementsScreen.tsx:110`, `ChallengesScreen.tsx:90`. |
| 9 | Name the Killer skull-icon purple | **Resolved** | `colors.killer` (`#9B6BFF`) defined in `src/theme/colors.ts`/`index.ts`; all 3 former hardcoded occurrences in `KillerGameScreen.tsx` now reference `colors.killer` (lines 291, 373/374/409-ish — all 3 `GameHud` centerContent instances for claim/bullOff/play phases). Grepped repo-wide for `9B6BFF` — zero hits outside the token definition. |
| 10 | Normalize `MatchDetailScreen`'s data loading | **Resolved** | `src/screens/MatchDetailScreen.tsx` lines 28-43 now use `useFocusEffect(useCallback(...))`, matching `StatsScreen`/`PlayersListScreen`. |

## New issues found this phase

No new critical or high-severity issues found. Two pre-existing, low-severity
items are worth a note (neither is a regression introduced by Phases 3-4):

1. **(Low, informational) `LeaderboardScreen.tsx:326` still hardcodes `color: '#1A1A1A'`** for `rankTextTop` (dark text on the gold/silver/bronze badge). This was an explicit, documented decision in Phase 3 (`components.md`) — the value is distinct from `colors.onFill` (`#0A0A0A`) and applying `onFill` would be a visible color change out of scope. Confirmed the reasoning holds; not a drift bug, just flagging that the audit's spirit ("centralize one-off colors") isn't 100% complete here. No action needed unless the team wants to introduce a fourth named token for it.

2. **(Low) Practice170's relocated Undo button sits absolutely-positioned in the input card's top-right corner** (`Practice170GameScreen.tsx`, `undoBtn` style, lines 394-407) with no label, distinct from X01's Undo (which got a header row next to the camera button, `X01GameScreen.tsx` lines 637-647). Checked for visual collision with `DartSlots` underneath it — none found (DartSlots is centered and narrower than the card, undo sits in the corner clear of it). Both buttons are 32×32 with `hitSlop={8}`, giving a ~48×48 effective hit target (meets the 44×44 minimum). This is a reasonable resolution per Phase 4's own documented reasoning (no camera button to pair with in Practice170), just noting the two screens now use two slightly different Undo placements/treatments rather than one shared idiom — acceptable, not a regression.

## Verification detail by QA checklist item

**1. Animation/transition consistency.** `HomeScreen.tsx` (the only
initial route) uses `MountReveal` exclusively for every entrance
(header, continue-match card, stats band, challenges card, CTA, nav
grid) — grepped the full file, zero `entering=` usage. The only
Reanimated hooks present (`useAnimatedStyle`/`useSharedValue` in
`ProgressTrack`) are plain animated-style hooks, not Layout Animation
`entering=` props, so they don't trigger the splash-hang bug. All other
screens (including the 9 game screens now on `GameHud`) use Reanimated
`entering=`/`FadeIn`/`ZoomIn` freely, which is correct since none of
them mount on the initial route. Confirmed clean.

**2. Haptics/sound on key actions.** Traced `tapDart`/`onDart` in
`X01GameScreen.tsx`, `Practice170GameScreen.tsx`, and
`CheckoutTrainerScreen.tsx` against `DartPad.tsx`'s `tapSegment`/miss
handler. Pattern is consistent and correct in all three: `DartPad`
fires exactly one haptic per tap (`hapticPattern.dartHit(multiplier)`
for scored segments, `hapticPattern.miss()` for the dedicated MISS
button) and **never** calls `playSound` itself (confirmed via full read
of `DartPad.tsx` — no `playSound`/`useSoundEffects` import at all).
Each of the three screens' `tapDart` fires exactly one `playSound`/
`playSfx` call per branch: bust → `playSfx('bust')`/`hapticPattern.bust()+playSound('bust')`,
checkout → `playSfx('checkout')`/equivalent, otherwise exactly one
`playSound(dart.segment === 0 ? 'miss' : 'dartScored')`. No branch fires
two `playSound` calls, no branch fires zero. The previously-fixed
double-miss-sound regression is confirmed correct and does not
reappear. (Contact haptic + a separate multi-pulse outcome haptic
pattern on the same bust/checkout dart is intentional layering per
`haptics.ts`'s own design — "physical weight tracks the dart" plus a
distinct outcome signature — not a bug.)

**3. Dark mode correctness.** `GameHud.tsx`, `PlayerFilterChips.tsx`,
`TabBar.tsx` import only `colors`/`radius`/`spacing` from `../theme` (or
`COLORS` from `../theme/colors`) — zero hardcoded hex in any of the
three files. `DartPad.tsx` likewise theme-token-only. The only
hardcoded-hex hits repo-wide (outside the explicitly-excepted
`CameraScoringScreen.tsx`) are `LeaderboardScreen.tsx`'s
`rankTextTop` (documented, see above) — no regression.

**4. Accessibility.** `GameHud`'s exit button is 36×36 with
`hitSlop={10}` (effective ~56×56) — comfortably over the 44×44
minimum. `TabBar` buttons are `flex: 1` with `paddingVertical: spacing.sm + 2`
(≈12px) plus 12px line height, giving roughly 36-40px height inside a
full-width flex row — acceptable given they're wide, though technically
a hair under 44pt tall; consistent with the original Challenges/
Leaderboard pill heights they replaced, so not a regression. Both
relocated Undo buttons (X01, Practice170) meet 44×44 via `hitSlop={8}`.
Contrast: `colors.killer` (`#9B6BFF`) and `colors.medalGold/Silver/Bronze`
are used only for small icons/badges against dark charcoal surfaces,
consistent with how the pre-existing `accentHot` etc. are used —
no contrast regression identified.

**5. iOS HIG conventions.** Every one of the 30 screens under
`src/screens/` (including all 9 game screens) still renders `<Screen>`
— grepped the full directory, confirmed no screen lost its `Screen`
wrapper when its top bar was swapped for `GameHud`. `Screen.tsx` itself
is unmodified (still applies `insets.top/left/right` padding). Swipe-back
and transition config in `RootNavigator` were not touched by any phase.

**6. Top-10 cross-check.** See table above — 8 of 10 fully resolved, 1
resolved with a narrow documented exception (`rankTextTop`), 1 partially
resolved by explicit, reasoned design choice (HeadToHead).

**7. New dead code / awkward forced-out UI.** Grepped all 8 game
screens + CheckoutTrainerScreen for orphaned style keys from the old
per-screen top bars (`topBar`, `exitBtn`, `dartsIndicator`, `dartDot`) —
none found; they were cleanly deleted, not left dead. Grepped X01 for
`bottomBtn`/`numberBtn`/`tapSegment`/`tapMiss`/the old `multiplier` state
— none found. `HalveItGameScreen.tsx`'s own `numberGrid`/`NUMBER_GRID_ROWS`
is a *different*, legitimate feature (its number-target picker, unrelated
to `DartPad`) and was correctly left alone. Both relocated Undo buttons
(X01, Practice170) are reachable, correctly wired to the same `undo()`
function and `disabled` condition as before, and meet touch-target
minimums — see issue #2 above for the one minor stylistic inconsistency
between the two.

## Notes

- `npx tsc --noEmit` run at the end of this pass: clean, zero errors.
- No gradients, no `LinearGradient` usage, no Android `elevation`
  anywhere in `src/` — still clean.
- `CameraScoringScreen.tsx` and `src/logic/` were not touched by any
  phase and were not touched by this QA pass either, per the hard rules.
