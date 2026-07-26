# DartMasters Design System — Phase 2 (confirmation, not reinvention)

Per the audit (Phase 1), the app already has a coherent, actively-enforced
design system ("Charcoal & Ember") and no visual-direction problem. This
phase is a **confirmation + small closing of named gaps**, not a new
palette or component language. Colors are staying as-is per explicit
instruction.

## Source of truth (unchanged)

`src/theme/colors.ts` (`COLORS`, `RADIUS`, `FONT`) + `src/theme/index.ts`
(semantic aliases, `spacing`, `typography`, `shadow`) + `src/theme/motion.ts`
(springs, `PRESS_SCALE`, `STAGGER_MS`). Every screen must consume these —
no new tokens files, no competing scale.

## Token additions (closing audit gaps only — 3 named constants)

These are values *already in use* in the codebase today, just not named
anywhere shared. Naming them stops the duplication the audit found; it
does not change how anything currently looks.

| New token | Value | Replaces hardcoded hex in |
|---|---|---|
| `COLORS.onFill` | `#0A0A0A` | `AchievementsScreen.tsx` + `ChallengesScreen.tsx` checkmark badge glyph color |
| `COLORS.killer` | `#9B6BFF` | `KillerGameScreen.tsx` (3 occurrences of the skull/killer-status color) |
| `COLORS.gold` / `COLORS.silver` / `COLORS.bronze` | existing `RANK_COLORS` values from `LeaderboardScreen.tsx` | `LeaderboardScreen.tsx`'s local `RANK_COLORS` + `rankTextTop` (reuses `onFill`) |

No other palette, radius, spacing, or type-scale changes. `RADIUS`/`spacing`
scale stays exactly as defined — Phase 4 makes `X01GameScreen` consume it,
it doesn't change its values.

## Judgment calls (deciding now so Phase 3/4 don't re-litigate)

- **`Sheet.tsx`'s backdrop-dismiss `Pressable`**: keeping as bare
  `Pressable`. It's an invisible full-screen dismiss layer, not tactile
  chrome — no visual/haptic feedback is expected for tapping outside a
  sheet to close it. The "no bare Pressable" rule is about visible touch
  targets; this isn't one.
- **`DartPad` vs. `X01GameScreen`'s bespoke input pad**: extend `DartPad`
  with two optional props (`primeSegments?: number[]` for the prime-number
  highlight X01 uses, `variant?: 'default' | 'x01'` for the digit-order
  difference) so X01 adopts the shared component instead of maintaining a
  silently-diverging fork. Phase 3 implements this.
- **`Alert.alert` usage**: confirmed consistent (destructive confirmations
  only) — not touched.

## Component work for Phase 3 (primitives only, no screen layout yet)

1. **New `GameHud` component** — `{ onExit, centerContent, dartsThisTurn }`.
   Replaces the independently hand-rolled top bar (exit button + round/leg
   pill + dart-count dots) in all 7 non-X01 game screens, plus gives
   `CheckoutTrainerScreen` and `X01GameScreen` a real, shared header instead
   of their own bespoke variants. Highest-impact single change in this
   whole project — it's the most-seen chrome in the app.
2. **Fix `SwitchRow`** — bare `Pressable` → `PressableScale`. One-line-class
   fix, propagates to every screen using it (Settings, GameSetup,
   TournamentSetup).
3. **New `PlayerFilterChips` component** — single-select horizontal chip
   picker, replacing the independent copies in AchievementsScreen,
   HeadToHeadScreen, StatsTrendsScreen.
4. **New `TabBar` (segmented control) primitive** — replaces the two
   independently-built pill-track tab controls in ChallengesScreen
   (solo/multiplayer) and LeaderboardScreen (period selector).
5. **Extend `DartPad`** per the judgment call above.
6. Add the 3 named color tokens from this doc to `src/theme/colors.ts`.

## Screen work for Phase 4 (apply Phase 3 primitives, fix remaining drift)

- Swap all 8 game screens + CheckoutTrainerScreen onto `GameHud`.
- Swap X01GameScreen onto extended `DartPad`; route its remaining layout
  through `radius`/`spacing` tokens instead of magic numbers.
- Swap Achievements/HeadToHead/StatsTrends onto `PlayerFilterChips`.
- Swap Challenges/Leaderboard onto `TabBar`.
- Apply the 3 new color tokens at their hardcoded-hex call sites.
- Normalize `MatchDetailScreen`'s data loading to `useFocusEffect` +
  `useCallback`, matching every other list/detail screen (behavioral
  correctness fix, bundled in since it's small).
- Checkpoint/commit after each screen, as specified.

## Explicitly not doing

- Not proposing a new visual direction, motif, or palette — colors stay.
- Not touching `CameraScoringScreen.tsx`.
- Not touching game logic, scoring math, or data models (nothing in this
  plan requires it — every fix above is presentation-layer only).
- Not adding any new dependency.
