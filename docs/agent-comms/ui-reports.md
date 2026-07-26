# UI Agent Reports

## Round: Stats/Achievements/HeadToHead design-consistency sweep

Scope: `src/screens/StatsScreen.tsx`, `src/screens/StatsTrendsScreen.tsx`,
`src/screens/AchievementsScreen.tsx`, `src/screens/HeadToHeadScreen.tsx`.

**Result: no code changes.** All four screens are clean — this was a genuine
"already ship-as-is" pass, not a case of under-searching. `npx tsc --noEmit`
was clean before and after (no changes made, so trivially still clean).

### Audit findings, screen by screen

**`StatsScreen.tsx`** — Clean. `<Screen scroll={matches.length > 0}>` present
(line 50). No hardcoded hex, no bare `Pressable` (uses `PressableScale`
throughout, lines 70, 102), no gradients, no Android `elevation`. Fonts route
through `fonts.*` from theme. `CountUp` used for the matches/streak counters
(lines 56, 65) consistent with `HomeScreen`/`GameSummaryScreen` usage.
`FadeInDown.delay(Math.min(i, 8) * STAGGER_MS)` used for match-history row
entrance (line 101) — matches the established list-entrance idiom. `EmptyState`
used for the no-matches case (line 88) rather than bare text.

**`StatsTrendsScreen.tsx`** — Clean. `<Screen scroll>` present (line 68).
No hardcoded hex (uses `colors`/`COLORS` from theme throughout, including
`COLORS.card`/`COLORS.border`/`COLORS.edge` for the chart card). Uses the
shared `PlayerFilterChips` component (line 75) — correctly extracted per
audit fix #4. `StatPill` values (lines 105-107) are plain formatted strings,
not wrapped in `CountUp` — checked this against every other `StatPill`
call site in the app (`MatchDetailScreen.tsx`, `PlayerProfileScreen.tsx`):
none of them wrap `StatPill`'s `value` in `CountUp` either, so this is the
established, consistent pattern for `StatPill`, not a missed polish
opportunity — left alone. `FadeInDown`/`STAGGER_MS` used correctly for the
chart card and stat grid entrance (lines 85, 101-102). `EmptyState` used for
both the no-players and not-enough-history cases.

**`AchievementsScreen.tsx`** — Clean. `<Screen scroll={players.length > 0}>`
present (line 58). No hardcoded hex, no bare `Pressable`. Uses shared
`PlayerFilterChips` (line 73). Badge-card entrance uses
`FadeInDown.delay(index * STAGGER_MS)` (line 98) plus a `ZoomIn` pop for the
earned checkmark badge (line 107), consistent with `GameSummaryScreen`'s
staged-reveal idiom. `colors.onFill` used for the earned checkmark (line
110) — matches audit fix #8. Progress bar fill (`ProgressFill`, lines
133-143) sweeps in with `withDelay`/`withTiming` rather than appearing
pre-filled, same pattern as other progress-reveal treatments elsewhere in
the app. `EmptyState` used for both empty cases (lines 66, 76).

**`HeadToHeadScreen.tsx`** — Clean. Both return paths render `<Screen>`
(lines 65, 77). No hardcoded hex, no bare `Pressable`, uses
`typography.overline` directly for section titles (line 310) rather than a
hand-rolled duplicate (see note below). This screen's own two-player
order-tracked chip picker (lines 81-106) does **not** use the shared
`PlayerFilterChips` component — confirmed this is a documented, deliberate
exception from the Phase 5 QA report (`docs/ui-redesign/qa-report.md`,
audit fix #4: "structurally different from the single-select contract").
Left untouched per that existing decision. `CountUp` used for the H2H
record score and per-stat comparison rows (lines 160-171, 293-303) —
consistent with how `GameSummaryScreen`/`PlayerProfileScreen` reveal stat
numbers. `FadeInDown`/`STAGGER_MS` used for shared-match-history rows (line
245), matching `StatsScreen`'s identical row-entrance pattern.

### Deliberately left alone

- `LeaderboardScreen.tsx`'s hardcoded `rankTextTop` color — out of scope
  (not one of the four files) and already a documented exception per the
  Phase 5 QA report; noting only for completeness.
- `HeadToHeadScreen.tsx`'s independent player-chip implementation — see
  above, documented exception, not drift.
- `StatPill`'s plain-string (non-`CountUp`) values in `StatsTrendsScreen.tsx`
  — matches every other call site of `StatPill` app-wide, not an omission.

### Flag for Head Agent (pattern observation, not a bug in scope)

Not a defect in any of the four files, but worth a decision: there's a
repo-wide duplicated `sectionTitle` style (`fontFamily: fonts.bodyBold,
fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase'`) hand-rolled
independently in at least `StatsScreen.tsx` (line 168), `BackupRestoreScreen.tsx`
(line 129), `SettingsScreen.tsx` (line 180), `PlayerProfileScreen.tsx` (line
436, with `letterSpacing: 0.8`), and `TournamentSetupScreen.tsx` (line 287,
`fontSize: 13`) — while `theme/index.ts` already exports a semantically
identical `typography.overline` token (`fontSize: 10, letterSpacing: 2`,
used correctly by `HeadToHeadScreen.tsx` line 310). The duplicated versions
use a different size/letterspacing than `typography.overline`, so this
isn't simply "some screens forgot to import it" — it looks like
`typography.overline` was introduced after several screens already had
their own section-title style, and nobody went back to consolidate. Since
consolidating would mean touching 5+ files across multiple agents' owned
screens (including `SettingsScreen.tsx`, off-limits to me this cycle), I'm
flagging it rather than fixing it: recommend Head Agent/Roadmap decide
whether to do a dedicated repo-wide pass to unify all `sectionTitle` styles
onto `typography.overline` (which would be a visible size/letterspacing
change on those screens, so worth a deliberate call, not a drive-by fix).

No commits made this round — nothing needed a code change.

## Round: Roadmap proposals #5/#6/#7 (HeadToHead chips, StatsTrends records, Search empty-state)

Three independent, Head-Agent-approved tasks. `npx tsc --noEmit` clean after
each task and at the end. Note: this round overlapped in real time with the
Animation agent's `STAGGER_MS` → `staggerDelay`/`reducedMs` migration, which
touches `SearchScreen.tsx` and `PlayerProfileScreen.tsx` among others (visible
as a pre-existing uncommitted diff before I started). I left that migration
alone in the files I touched except where it briefly put `SearchScreen.tsx`
into a broken intermediate state mid-edit (see note under Task 3) — by the
time I re-ran `tsc`, the Animation agent had finished its pass on that file
and everything compiled clean together. `HeadToHeadScreen.tsx` and
`StatsTrendsScreen.tsx` still use the plain `STAGGER_MS` constant (unmigrated)
— not touched, since that migration belongs to the Animation agent, not this
task set, and `STAGGER_MS` is still a valid export.

### Task 1: HeadToHead picker → shared chip component variant

Built `src/components/PlayerPairChips.tsx`, a sibling to
`PlayerFilterChips.tsx` sharing its exact chip shape/spacing/border/edge
treatment and `PressableScale` haptics (`haptic="tick"`, `scaleTo={0.94}`),
but with ordered-pair (`pickedIds: string[]`, `onToggle`) semantics instead
of single-select. Went with a sibling component rather than a
`mode="ordered-pair"` prop on `PlayerFilterChips` because the prop shapes
don't unify: `PlayerFilterChips` is `selectedId: string | null` +
`onSelect`, while the pair picker needs an ordered array + toggle callback
— forcing both contracts onto one component's props would need a bunch of
conditional/optional props on every call site. This mirrors the same
judgment call already documented in `docs/ui-redesign/qa-report.md` item 4.

Wired into `src/screens/HeadToHeadScreen.tsx`: replaced the bespoke
`styles.grid`/`styles.chip` block (previously lines 80-106) with
`<PlayerPairChips players={players} pickedIds={pickedIds} onToggle={togglePick} avatarSize={32} />`.
Removed the now-dead `grid`, `chip`, `chipName`, `chipBadge`, `chipBadgeText`
styles from that file.

**Behavior preserved (verified against the old implementation before
removing it):**
- First tap on an unpicked player fills slot A; second tap on a different
  player fills slot B — `togglePick`'s existing state logic in
  `HeadToHeadScreen.tsx` (`setPickedIds`) is untouched, only the chip
  rendering moved into the new component.
- Tapping an already-picked chip again deselects it (`prev.filter((x) => x !== id)`
  branch, untouched).
- Tapping a third player while both slots are full evicts slot A and shifts
  slot B up (`[prev[1], id]` — oldest-out), untouched.
- Slot A vs slot B visual distinction: preserved via the numbered badge
  (`orderIndex + 1`) in the player's own color, same as the original
  `chipBadge`/`chipBadgeText` — `PlayerPairChips` renders this identically,
  just restyled to sit inline in the chip rather than as the original's
  separate circular badge element (visually smaller/simpler badge, but same
  "which slot" information).
- Selected-state color: original used `p.color`-derived border/background
  per player; `PlayerPairChips` keeps this exact same per-player-color
  selected style rather than switching to the generic ember `active` style
  `PlayerFilterChips` uses, since losing per-player color would regress the
  "tell A from B at a glance" requirement.

Files: `src/components/PlayerPairChips.tsx` (new),
`src/screens/HeadToHeadScreen.tsx`.

### Task 2: StatsTrends — surface personal-bests records

`computePersonalBests(matches, playerId)` (from `src/logic/personalBests.ts`)
was already fully general and already consumed by
`src/screens/PlayerProfileScreen.tsx` (line 117) — no logic changes needed.

Added a compact "RECORDS" strip to `src/screens/StatsTrendsScreen.tsx`,
directly under the existing `PlayerFilterChips` row and above the trend
chart/empty-state block, so it's independent of whether there's enough
history to chart a trend. Reuses `StatPill` (matching how `PlayerProfileScreen`
uses `StatPill` elsewhere, e.g. its `overallGrid`) rather than duplicating
`PlayerProfileScreen`'s bespoke `PersonalBestTile` component (that one adds
its own icon/press/tap-through machinery, which felt like more than
"records" needed for a secondary screen; flagging this choice below).
Entrance uses the same `FadeInDown.delay(i * STAGGER_MS).duration(240)`
pattern already established on this screen's other list entrances. Section
is only rendered when at least one record has a non-null value (guards the
brand-new-player case where all six records are still "—").

Files: `src/screens/StatsTrendsScreen.tsx` (added `computePersonalBests`
import, `personalBests` memo, the records section + `recordsTitle`/
`recordsGrid`/`recordsPillWrap` styles).

**Flag for Head Agent:** the records strip here uses plain `StatPill` (no
tap-through to `MatchDetail`, no icon), while `PlayerProfileScreen.tsx`'s
`PersonalBestTile` supports both. Deliberately kept it lighter-weight since
this is a secondary trends screen, not the player's dedicated profile — but
if the intent was full parity (tap a record to jump to the match it was set
in), that would mean either extracting `PersonalBestTile` out of
`PlayerProfileScreen.tsx` into a shared component or building a second
bespoke tile here. Didn't do that without a call from Head Agent since it's
a bigger structural change than "surface the data."

### Task 3: Search screen empty-state polish

`src/screens/SearchScreen.tsx` already had a reasonably good pre-query
`EmptyState` hint ("Search DartMasters" / "Find a player by name, or a
match by mode or opponent") — better than the "likely blank" assumption in
the task brief, so the main gap was purely the optional quick-list.

Added a "recent/suggested players" quick-list: first 5 players from the
already-fetched `players` state (no new storage call — `PlayerStorage.getAll()`
was already being loaded in this screen's existing `useFocusEffect`), reusing
the exact same row markup/style (`styles.row`, `PlayerAvatar`,
`PressableScale` → `PlayerProfile` navigation) as the existing search-results
player rows, so it reads as "more of the same list" rather than a new
pattern. Enabled `<Screen scroll>` for this state too (previously only
scrolled when there were query results) so the list isn't clipped.

This required one small extension to the shared `EmptyState` component
(`src/components/EmptyState.tsx`): added an optional `fill?: boolean`
prop (default `true`, preserving every existing call site's behavior
unchanged) so a screen can opt out of `EmptyState`'s `flex: 1` centering
when more content follows below it — without this, `EmptyState`'s `flex: 1`
would have claimed all remaining vertical space and pushed the quick-list
off-screen. `SearchScreen.tsx` passes `fill={suggestedPlayers.length === 0}`.

Mid-edit note: while working on this file, the Animation agent's
`STAGGER_MS` → `staggerDelay` migration was concurrently landing in the same
file (pre-existing/expected git conflict risk of two agents in one file, not
something either side introduced from my task). `tsc` briefly failed on
leftover `STAGGER_MS` references while both edits were interleaved; by the
final check both agents' changes had landed and it compiled clean, so no
action was needed from me beyond re-running `tsc` after the fact.

Files: `src/components/EmptyState.tsx` (new `fill` prop),
`src/screens/SearchScreen.tsx`.

### Final check

`npx tsc --noEmit` clean after all three tasks, run last against the final
state of all touched files (including the concurrently-migrated
`SearchScreen.tsx`).
