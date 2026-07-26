# DartMasters UI Consistency Audit — Phase 1

Read-only audit. No code was modified. Scope: every file under `src/screens/`
(31 screens incl. `src/screens/game/`) and every shared component under
`src/components/`. `CameraScoringScreen.tsx` was noted but not inspected for
internal drift — it is a documented intentional exception with its own local
design tokens.

## Design system, in brief (for the next agent — don't re-derive this)

"Charcoal & Ember": an elevation ladder of 5 warm-charcoal surfaces
(`COLORS.bg → surface → card → card2 → raised`) lit by a 1px top-edge
highlight (`COLORS.edge` as `borderTopColor`) and black-only shadows
(`shadow.soft/deep/key`) — never gradients, never colored glow, never
Android `elevation`. One ember accent (`accent #C13620`, `accentHot
#E85C3F` for small text/icons, `accentDeep` for pressed/borders). Bebas
Neue (`fonts.display`) for score-like numbers, Inter weights for UI text.
Motion vocabulary is 4 springs (`SPRING_PRESS/SNAPPY/BOUNCY/GENTLE`),
`PRESS_SCALE.key/button/row`, `STAGGER_MS=45` for list entrances via
Reanimated `entering=` (except `MountReveal`, required for anything
mounted on the initial route — `HomeScreen` only). Every tappable surface
should be `PressableScale`, never bare `Pressable`.

## Per-screen findings

Only screens with actual findings are listed. Everything else read as clean
against the system (uses `Header`/`Card`/`Screen`/`PressableScale`/theme
tokens exclusively): **HomeScreen, GameSetupScreen, TournamentSetupScreen,
TournamentBracketScreen, SettingsScreen, StatsScreen, PlayersListScreen,
BackupRestoreScreen, HeadToHeadScreen, SearchScreen, RulesScreen,
GameScreen (dispatcher), ModeSelectScreen, BullOffScreen, MatchDetailScreen,
GameSummaryScreen, PlayerEditScreen, PlayerProfileScreen**.

| Screen | Finding | Severity |
|---|---|---|
| `game/X01GameScreen.tsx` | The most-visited screen in the app never imports the theme `radius`/`spacing` scale tokens for its layout — every corner radius is a magic number (10, 11, 12, 14, 16, 18, 24…) that happens to coincide with `radius.sm/md/lg/xl` in most places but drifts in at least one spot (`bottomBtn` uses `borderRadius: 11` where `DartPad`'s equivalent bull/miss buttons use `radius.md` = 14). Any future radius-scale change won't propagate here. | High (visibility) |
| `game/X01GameScreen.tsx` | Reimplements the entire number-grid + multiplier + bull/miss input (`numberGrid`, `bottomRow`, etc.) from scratch instead of reusing the shared `DartPad` component, which already renders an equivalent widget and is used as-is in `CheckoutTrainerScreen`. The X01 version adds prime-segment highlighting and a different digit order, but the visual language (tile styling, gaps, bull/miss coloring) has silently diverged from `DartPad`'s. | High |
| `game/HalveItGameScreen.tsx`, `game/Bobs27GameScreen.tsx`, `game/ShanghaiGameScreen.tsx`, `game/AroundTheClockGameScreen.tsx`, `game/KillerGameScreen.tsx`, `game/CricketGameScreen.tsx`, `game/Practice170GameScreen.tsx` | All 7 non-X01 game screens hand-roll the same in-game HUD top bar (36×36 circular exit button + rounded "leg/round" pill + row of dart-thrown dots) independently, each with its own copy of `topBar`/`exitBtn`/`legPill`/`dartsIndicator` styles. Confirmed byte-for-byte similar structure in Halve It and Shanghai; grep confirms the same style-key set in all 7. | High (repeated pattern) |
| `CheckoutTrainerScreen.tsx` | Builds its own bespoke top bar (36×36 circular back button + centered title, `exitBtn`/`title`/`topBarSubtitle`) instead of using the shared `Header` component (used by every other non-game screen) or the in-game HUD pattern above. A third, slightly different variant of the same "exit + title" idea. | Medium |
| `game/KillerGameScreen.tsx` | Hardcodes `"#9B6BFF"` three times (lines ~291, 374, 411) for the "killer" skull icon color instead of a named constant — the value isn't in `COLORS`/`playerPalette` under any exported name, so it can't be reused or retheme safely. | Medium |
| `AchievementsScreen.tsx`, `ChallengesScreen.tsx` | Both hardcode `color="#0A0A0A"` for the checkmark glyph on the "earned"/"completed" badge — same value, same purpose, duplicated rather than centralized. | Low |
| `LeaderboardScreen.tsx` | `RANK_COLORS` (gold/silver/bronze) and `rankTextTop: { color: '#1A1A1A' }` are reasonable one-off medal colors outside the design system's vocabulary, but are hardcoded hex with no shared constant — if another screen ever needs medal colors (e.g. a future "top 3" widget) it will re-invent them. | Low |
| `AchievementsScreen.tsx`, `HeadToHeadScreen.tsx`, `StatsTrendsScreen.tsx` | Each independently implements a "pick a player" horizontal chip scroller (avatar + name, active state via `color + '14'`/`'1F'` background) with near-identical markup and styles but no shared component — see "repeated pattern" section below. | High (repeated pattern) |
| `LeaderboardScreen.tsx`, `ChallengesScreen.tsx` | Each independently implements a pill-track segmented tab control (`periodRow`/`tabRow`, 4px padding, `colors.primary` fill on the active pill) rather than reusing `OptionRow` or extracting a `SegmentedControl` primitive. Visually close but not pixel-identical (padding, chip radius, font size all differ slightly between the two). | Medium (repeated pattern) |
| `components/SwitchRow.tsx` | The shared toggle component itself uses a bare RN `Pressable` (line 2 import, line 50 usage) instead of `PressableScale` — a violation of the explicit "bare Pressable is a design bug" rule, and because it's a shared component the drift silently propagates to every screen that renders a `SwitchRow` (Settings, GameSetup, TournamentSetup). | High (root-cause, low occurrence count but systemic) |
| `components/Sheet.tsx` | Uses a bare `Pressable` for the backdrop-dismiss tap layer (line 26). Arguably acceptable since it's an invisible full-screen dismiss target, not a piece of visible tactile chrome — flagging for the next agent to make a call on, not asserting it's wrong. | Low (judgment call) |
| `MatchDetailScreen.tsx` | Loads its data in a plain `useEffect` instead of the `useFocusEffect(useCallback(...))` pattern every other list/detail screen uses. Not a visual bug, but means editing a match's underlying player elsewhere and returning here won't refresh — an inconsistency in a very consistently-applied pattern everywhere else. | Low (behavioral, not visual) |
| `components/icons/Icon.tsx` | Default `color` prop is the raw hex `'#FFFFFF'` rather than a theme token; harmless since every call site passes an explicit color, but it's the one place in the icon system not sourced from `COLORS`. | Low |
| Various (`AchievementsScreen`, `HeadToHeadScreen`, `TournamentSetupScreen`, etc.) | Widespread but consistent idiom: `color + '14'`, `+ '1F'`, `+ '26'`, `+ '40'`, `+ '55'` alpha-hex suffixes appended to dynamic (per-player/per-mode) colors for tinted backgrounds/borders. This is not drift — it's used the same way everywhere — but it's worth the next agent knowing it's a deliberate, repeated idiom rather than something to "fix" into a token, since the colors involved are runtime-dynamic (player/mode colors), not static theme colors. | Info only |

## Repeated pattern, no shared component

These are UI patterns built more than once, independently, by what look like
different parallel agents — the single highest-value category to fix before
further screens compound it.

1. **In-game HUD top bar** (exit button + round/leg pill + dart-count dots).
   Independently implemented in all 7 non-X01 game screens (`HalveIt`,
   `Bobs27`, `Shanghai`, `AroundTheClock`, `Killer`, `Cricket`,
   `Practice170`) plus a variant in `CheckoutTrainerScreen`. X01 has its own
   more elaborate top bar too. Candidate: a `GameHud`/`GameTopBar`
   component taking `{ onExit, centerContent, dartsThisTurn }`.
2. **"Pick a player" filter chip row** (horizontal scroll, avatar + name,
   active tint via `color + 'NN'`). Independently built in
   `AchievementsScreen`, `HeadToHeadScreen`, `StatsTrendsScreen`. Distinct
   from the existing `PlayerSelectGrid` (which is multi-select, wraps, and
   shows order-number badges — a different job). Candidate: extract a
   `PlayerFilterChips` component for the single-select "which player's data
   am I viewing" use case.
3. **Pill-track segmented tab control** (`ChallengesScreen`'s solo/multiplayer
   tabs, `LeaderboardScreen`'s period selector). Both reimplement the same
   "rounded track, 4px padding, active pill filled `colors.primary`" idea
   from scratch with slightly different constants. `OptionRow` almost
   covers this but is chip-wrap styled with a label, not a tab bar.
   Candidate: a lightweight `TabBar`/`SegmentedControl` primitive.
4. **Dart-scoring input pad** (multiplier selector + number grid + bull/miss).
   Shared `DartPad` component exists and is used as-is by
   `CheckoutTrainerScreen`, but `X01GameScreen` reimplements the same
   concept with its own styles rather than extending `DartPad` (e.g. with a
   `variant`/`primeSegments` prop). Worth deciding: extend `DartPad` to
   cover X01's extra needs, or accept the two as deliberately different and
   document why.

## Top 10 prioritized fixes

Ordered by (a) how visible/common the pattern is to users, (b) how many
screens it touches.

1. **Unify the in-game HUD top bar** across all 8 game screens (X01 +
   the 7 others) into one shared component. Every match, every mode, every
   turn — the single most-seen piece of chrome in the app, currently
   copy-pasted 7-8 times with drift.
2. **Route `X01GameScreen`'s layout through `radius`/`spacing` theme tokens**
   instead of magic numbers. It's the screen players spend ~90% of their
   time in per CLAUDE.md, and it's the one screen that never imports the
   scale it visually matches.
3. **Fix `SwitchRow` to use `PressableScale` instead of bare `Pressable`.**
   Small diff, but it's a shared component so the fix propagates instantly
   to Settings/GameSetup/TournamentSetup, and it directly violates the
   documented hard rule.
4. **Extract a `PlayerFilterChips` component** for the single-select
   "which player" picker duplicated in Achievements/HeadToHead/StatsTrends —
   these are all newer screens most likely to keep growing and re-diverging.
5. **Decide `DartPad` vs. X01's bespoke input pad**: either extend `DartPad`
   with the prime-highlight/ordering X01 needs, or explicitly document them
   as intentionally different. Currently just silent duplication.
6. **Give `CheckoutTrainerScreen` a real top bar** — either the shared
   `Header` (if it can accommodate a centered title) or the new shared game
   HUD from #1, instead of its own third variant.
7. **Extract a shared `TabBar`/segmented-tab primitive** for
   Challenges' solo/multiplayer switch and Leaderboard's period switch.
8. **Centralize the "earned/completed" checkmark badge color** (`#0A0A0A`,
   duplicated in Achievements + Challenges) as a named token or prop default.
9. **Name the Killer skull-icon purple** (`#9B6BFF`, used 3× in one file) as
   a constant, or fold it into `playerPalette`/`COLORS` if it's meant to be
   reused.
10. **Normalize `MatchDetailScreen`'s data-loading** to the
    `useFocusEffect`/`useCallback` pattern used everywhere else, so it
    refreshes after edits like every other detail screen does.

## Notes for the next phase

- `Alert.alert` usage is actually consistent across the app (destructive
  confirmations: delete match, remove player, clear history, restore
  overwrite) — this is not drift, don't "fix" it into sheets without a
  specific reason.
- No gradients, no `LinearGradient` usage, no Android `elevation` anywhere
  in `src/`. Clean on both explicitly-forbidden items.
- No screen other than the ones using Reanimated `entering=` on a
  non-launch route violates the launch-path rule; `HomeScreen` correctly
  uses only `MountReveal`.
- `CameraScoringScreen.tsx` was left untouched per instructions (bare
  `Pressable`/hex colors there are expected and out of scope).
