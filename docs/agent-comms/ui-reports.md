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

## Round: Roadmap proposals #4/#8 (SegmentButton soundTrigger cleanup, BackupRestore last-backup timestamp)

Two independent Head-Agent-approved tasks. Stayed entirely out of
`GameSummaryScreen.tsx`, `GameSetupScreen.tsx`, and `src/navigation/types.ts`
per instructions — those show as modified in `git status` from the
concurrent Rematch-feature work, not from anything in this round; only
committed the specific files listed below. `npx tsc --noEmit` clean after
each task.

### Task 1: `SegmentButton`'s dead `soundTrigger` prop

Read `src/components/SegmentButton.tsx` fully first: it always forwarded
`sound={soundTrigger}` (defaulting to `'buttonTap'`) into
`PressableScale`'s `sound` prop, which calls `playSound(sound)` on release.
Confirmed via F14/Roadmap Agent reaffirmation that `buttonTap`/`miss` have
no audio assets and stay silent by design permanently — so this was pure
dead weight.

Grepped the whole live `src/` tree (not the stale `.claude/worktrees/*`
copies, which are other agents' isolated worktrees and not part of the
working tree) for every `SegmentButton` call site:
`CricketGameScreen.tsx`, `ShanghaiGameScreen.tsx`,
`AroundTheClockGameScreen.tsx`, `HalveItGameScreen.tsx`,
`KillerGameScreen.tsx`, `Bobs27GameScreen.tsx`. **None of them pass
`soundTrigger` explicitly** — every call site relies on the (dead) default,
so no call-site edits were needed or made. Confirmed via targeted grep of
`soundTrigger` across `src/` (only match was the component itself before
the edit).

Removed the `soundTrigger` prop from `SegmentButtonProps`, its destructured
default, and the `sound={soundTrigger}` pass-through in the component body.
Left the `haptic` prop (the real, load-bearing F7 fix) completely untouched.

Files: `src/components/SegmentButton.tsx`. Commit `2cb433d`.

### Task 2: BackupRestoreScreen — last-backup timestamp

Read `src/screens/BackupRestoreScreen.tsx` fully, including `handleExport`
(untouched aside from capturing the same `Date.now()` into local state so
the UI updates immediately after a successful export, without a second
storage read). Grepped `src/` for any existing relative-time / "X ago"
helper (`ago|formatRelative|relativeTime|daysAgo`) — none exists anywhere;
every other screen that shows a date (e.g. `MatchDetailScreen.tsx`'s
`new Date(match.date).toLocaleString()`) just prints the full timestamp.
Per the brief, wrote a small one-off `formatLastBackup(lastBackupAt)`
helper local to this file only (minutes → hours → "yesterday" → days →
weeks → months tiers), not a new shared util module.

Display: added a `useFocusEffect` read of `SettingsStorage.get().lastBackupAt`
(re-reads on every screen focus, so returning from a background export via
the OS share sheet reflects the latest state) and a small icon+text row
directly under the EXPORT card's "EXPORT DATA" button — the natural
export-adjacent spot. Icon is `checkmark` (feather `check`) in
`colors.textFaint` when backed up within 14 days; switches to a new
`alertCircle` icon (feather `alert-circle`, added to the shared
`Icon.tsx` registry per that file's own "add a name here" convention) in
`COLORS.accentHot` — the existing "small text/icons on dark" ember variant,
not a new hex — when `lastBackupAt` is `null` ("Never backed up") or 14+
days old. This is a soft color/icon swap only, no alert/modal/badge.

**Layout in words:** the EXPORT card now reads: title "EXPORT" → body copy
→ "EXPORT DATA" button → (new) a small row with a tiny checkmark or
alert-circle icon followed by "Backed up 3 days ago" / "Backed up just now"
/ "Never backed up" in 12px text, sitting just below the button with the
same left inset as the button. Everything else on the screen (IMPORT card,
JSON-privacy note) is unchanged.

Files: `src/screens/BackupRestoreScreen.tsx`,
`src/components/icons/Icon.tsx` (new `alertCircle` icon name). Commit
`6a6f700`.

### Flag for Head Agent

None — both tasks were straightforward reuse of existing patterns/tokens,
no new UI pattern needed.

## Round: sectionTitle → typography.overline consolidation + EventStinger dead-code cleanup

Two independent cleanup tasks this round. Stayed out of `src/logic/` and
`GameSummaryScreen.tsx` per instructions (both showed unrelated concurrent
edits from a Logic/Systems agent this round). `npx tsc --noEmit` clean
after both tasks and at the end.

### Task 1: Consolidate hand-rolled `sectionTitle` onto `typography.overline`

This is the exact drift flagged in the "Stats/Achievements/HeadToHead"
round above — picking it up now that Head Agent has called it in scope.
Confirmed `typography.overline` (`src/theme/index.ts`) carries only
`fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2, textTransform:
'uppercase'` — no color, no margin — so each screen's existing color and
spacing choices needed to be preserved as sibling style properties.

Grepped `letterSpacing: 0.6`/`0.8` + uppercase across `src/screens` beyond
the five named files: also matched `GameSummaryScreen.tsx` (off-limits this
round), `GameSetupScreen.tsx`, `MatchDetailScreen.tsx`,
`game/ShanghaiGameScreen.tsx`, `game/HalveItGameScreen.tsx`,
`game/KillerGameScreen.tsx`, `game/AroundTheClockGameScreen.tsx`,
`game/CricketGameScreen.tsx`, `PlayerEditScreen.tsx`. **Left all of these
untouched** — they weren't in the assigned scope for this round and some
may be mid-edit by other concurrent agents (e.g. game screens under
Logic/Systems territory); flagging them here as candidates for a future
dedicated pass rather than fixing opportunistically.

Per-file results (all five confirmed to genuinely be the "section label
above a content group" role before touching):

- **`StatsScreen.tsx`** (`sectionTitle`, used once for "MATCH HISTORY"):
  before `{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted,
  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.md }`
  → after `{ ...typography.overline, color: colors.textMuted, marginBottom:
  spacing.md }`. Color and margin preserved; font family unchanged
  (`bodyBold` both before/after); size 12→10, letterSpacing 0.6→2.
- **`BackupRestoreScreen.tsx`** (`sectionTitle`, used for "EXPORT"/"IMPORT"):
  identical before/after shape to StatsScreen's — same replacement, same
  preserved color/margin.
- **`SettingsScreen.tsx`** (`sectionTitle`, used for "DEFAULT MATCH RULES"/
  "MANAGE PLAYERS"/"DATA"): identical before/after shape — same replacement.
- **`PlayerProfileScreen.tsx`** (`sectionTitle`, used for "PERSONAL BESTS"/
  "GOALS"/"RECENT MATCHES"): before had `letterSpacing: 0.8` (the one file
  that varied) plus both `marginBottom: spacing.md` and `marginTop:
  spacing.sm` → after `{ ...typography.overline, color: colors.textMuted,
  marginBottom: spacing.md, marginTop: spacing.sm }`. Both margins preserved.
- **`TournamentSetupScreen.tsx`** (`sectionTitle`, used inside a
  `sectionHeader` row alongside a count badge, for "PLAYERS"/"MATCH
  FORMAT"): this was the outlier — before used `fontFamily:
  fonts.bodySemibold` (not `bodyBold` like the other four) and `fontSize:
  13`, no margin at all (layout handled by the parent `sectionHeader` flex
  row). After: `{ ...typography.overline, color: colors.textMuted }` — no
  margin added (none existed before), font family now `bodyBold` via
  `typography.overline` (a real, visible font-weight/size change on this
  screen, consistent with the brief's expectation that this consolidation
  is visibly different, not a no-op).

Removed each dead hand-rolled `sectionTitle` block definition; confirmed
via re-read that nothing else in each file referenced the old literal
values (each screen's own `styles.sectionTitle` was the only user).

Files: `src/screens/StatsScreen.tsx`, `src/screens/BackupRestoreScreen.tsx`,
`src/screens/SettingsScreen.tsx`, `src/screens/PlayerProfileScreen.tsx`,
`src/screens/TournamentSetupScreen.tsx` (added `typography` to each file's
theme import, replaced the `sectionTitle` style entry).

### Task 2: `EventStinger.tsx` dead double `scale.value` assignment

Read the file fully first (confirmed this is the reduce-motion-gated
version — `isReducedMotionEnabled()` branch already present from the prior
Animation agent pass). Found the dead assignment: inside the `useEffect`,
`scale.value = reduced ? 1 : 2.4;` was set, then immediately overwritten a
few lines later (before any render/read in between) by the real animated
assignment:

```
scale.value = reduced
  ? withSequence(withTiming(1, { duration: 40 }), withDelay(hold, withTiming(0.92, { duration: 120 })))
  : withSequence(withSpring(1, SPRING_BOUNCY), withDelay(HOLD_MS, withTiming(0.92, { duration: 260 })));
```

The first assignment's plain-number value (`1` or `2.4`) was never read —
Reanimated's `useAnimatedStyle` only reads `scale.value` on the UI thread
during a frame, and both assignments happen synchronously in the same
effect run before any frame renders, so the first write is pure dead
weight. Removed the `scale.value = reduced ? 1 : 2.4;` line; kept the
surviving `withSequence`/`withSpring` assignment exactly as-is, which
already correctly branches on `reduced` and paces off the same `hold`
variable used for `opacity` — confirmed this preserves the intended
animation (bouncy overshoot to 1 then settle to 0.92 normally; snappier
linear ramp to 1 then settle to 0.92 under reduced motion).

Files: `src/components/effects/EventStinger.tsx`.

### Process note (not a content bug)

A concurrent Logic Agent process was committing `personalBests.ts`/
`collab-pb-celebration.md` changes in this same working directory at the
same moment I ran `git add`/`git commit` for Task 1. The two commits raced
on `.git/index`: my Task-1 commit (`9d32a69`) ended up bundling in the
Logic Agent's already-staged `personalBests.ts`/docs changes alongside my
five screen files, and the Logic Agent's next commit (`22362e5`) ended up
containing only my Task-2 `EventStinger.tsx` change under its own message.
Verified via `git show` that both diffs' actual content is exactly what
each of us intended — nothing lost or corrupted, just commit-message/
attribution boundaries got shuffled by the race. Did not rewrite history
to fix this (would require rebase/amend across another agent's commit,
riskier than the cosmetic attribution issue it fixes). Flagging so Head
Agent is aware shared non-worktree git operations across concurrent agents
can interleave like this.

### Final check

`npx tsc --noEmit` clean after both tasks.

---

## Report: NEW BEST badge on GameSummaryScreen (collab-pb-celebration Stage 2)

**What it looks like:** on the win screen, if the winner set one or more
new personal bests in the match that just finished, the relevant number(s)
in their stat-card grid get a visual "this is a record" treatment: the
cell's background/border switch from the normal dark card tone to a soft
green wash (same green already used elsewhere in the app for "good news,"
e.g. the checkout banner during play), the number itself turns green
instead of its usual white/ember color, a tiny medal icon appears in the
cell's top-right corner, and a small green "NEW BEST" caption appears
under the stat's existing label (e.g. under "Highest CO"). This can
happen to any combination of: 3-Dart Avg, Highest CO, 180s, Best Leg —
whichever numbers were actually records this match, so it could be one
cell or several, never a generic single banner disconnected from a number.

Two record types don't have a matching cell on this screen at all
(longest win streak, and highest single 3-dart visit) — when the winner
sets one of those, a small green pill/chip appears just under their name
and avatar at the top of their card, reading something like "NEW BEST ·
Longest Win Streak 8 wins."

If nothing new was set (true for most wins), nothing changes — the win
screen looks and behaves exactly as it did before this feature.

**Where:** `src/screens/GameSummaryScreen.tsx` only. No new components,
no new colors — reused the app's existing green "positive" tokens and the
existing `medal` icon.

**Flags for Head Agent:**
- This is static visual only, per the Stage-2 scope — no new haptic or
  sound fires when a badge appears, and it has no dedicated entrance
  animation of its own (it just rides along with whatever the parent stat
  cell/card is already doing). That's intentionally left for the
  Animation Agent's Stage 3 pass, per the collab doc.
- Judgment calls (badge all qualifying categories rather than just one;
  chip treatment for the two categories without a home cell) are
  documented with reasoning in `docs/agent-comms/collab-pb-celebration.md`
  under "UI Agent — badge implementation" for review.
- `npx tsc --noEmit` clean.

---

## Round: sectionTitle → typography.overline consolidation, part 2 (GameSetupScreen, MatchDetailScreen, PlayerEditScreen)

Continuing the consolidation flagged in the previous round's candidate list
(`GameSetupScreen.tsx`, `MatchDetailScreen.tsx`, `PlayerEditScreen.tsx` were
named there as unfixed candidates). Stayed out of all `Stats*`/`Achievements`/
`HeadToHead`/`Settings` screens and `src/screens/game/*` per this round's
instructions (Animation Agent's reduced-motion migration territory this
cycle). `npx tsc --noEmit` clean after each file and at the end.

### `GameSetupScreen.tsx` — matched, fixed

`styles.sectionTitle` (used for "PLAYERS" and "MATCH SETTINGS" section
labels, lines 257/325) was hand-rolled as
`{ ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }`
— same look-alike drift as the other five files fixed previously (here
based on `typography.caption` rather than a from-scratch literal, but same
end effect: 13px caption forced uppercase with 0.6 letterspacing instead of
the app's actual overline token). Replaced with
`{ ...typography.overline, color: colors.textMuted }`. No margin existed
before (layout handled by the parent `sectionHeader` row / `Card` spacing),
so none added — matches the precedent set by `TournamentSetupScreen.tsx` in
the prior round. `typography` was already imported in this file. Left
`countBadge`, `guestAddText`, `botDifficultyLabel`/`botDifficultySub` alone —
these are chip/button labels, not section headers above a content group,
despite superficially sharing small-uppercase-bold styling with
`sectionTitle`.

### `MatchDetailScreen.tsx` — nothing matched, left alone

Read the file fully. The only candidate with any property overlap is
`winnerTag` (`fontFamily: fonts.bodyExtraBold, fontSize: 10, letterSpacing: 0.6`,
no uppercase transform — text is already the literal string `'WINNER'`).
This is an inline badge sitting next to a player's name inside their stat
card, not a label sitting above a group of content — structurally the same
kind of exception the previous round correctly left alone in
`StatsScreen.tsx`'s `overviewLabel`. No hand-rolled section-title style
exists anywhere else in this file (its only other headings are inline
`playerName`/`Header` title/subtitle). No changes made.

### `PlayerEditScreen.tsx` — matched, fixed

`styles.label` (used for "PHOTO", "AVATAR", "COLOR" section labels above
the photo picker, avatar grid, and color grid — lines 146/159/195) was
`{ color: colors.textMuted, fontFamily: fonts.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.md }`
— textbook match for the drift pattern. Replaced with
`{ ...typography.overline, color: colors.textMuted, marginBottom: spacing.md }`.
Added `typography` to this file's theme import (previously only
`colors, fonts, radius, spacing`). Confirmed `styles.label` was the only
reference to those old literal values before removing them.

### Final check

`npx tsc --noEmit` run after each of the three files' edits and once more
at the end of the round — clean throughout.

Files changed: `src/screens/GameSetupScreen.tsx`,
`src/screens/PlayerEditScreen.tsx`. `src/screens/MatchDetailScreen.tsx` was
read but not modified (no matching role found).

---

## Round: Tournament resume/abandon — "Continue Tournament" banner + Abandon action

Head-Agent-approved scope: smaller option (a `HomeScreen` banner), not a
dedicated tournament list screen. `npx tsc --noEmit` clean after each part
and at the end.

### Read first

`src/storage/tournament.ts` (`TournamentStorage.getAll/get/save/remove`,
`PendingTournamentMatchStorage`), the `Tournament`/`TournamentMatchup`/
`TournamentStatus` types in `src/types/index.ts` (confirmed `status:
'inProgress' | 'completed'` is the authoritative in-progress signal — no
need to infer it from matchup winners), `HomeScreen.tsx`'s existing
"Continue Match" banner in full (`continueMatchInfo` memo, its
`useFocusEffect` data load, JSX/styles), `TournamentBracketScreen.tsx` in
full, `src/logic/tournament.ts` (`findNextPlayableMatchup`,
`recordMatchResult`), and `src/storage/activeMatch.ts`
(`ActiveMatchPointer.tournamentContext`).

### Banner: sourcing and rendering

`HomeScreen.tsx`'s `useFocusEffect` now also calls `TournamentStorage.getAll()`
alongside the existing player/match/active-match loads, and stores
`activeTournament = tournaments.find(t => t.status === 'inProgress') ?? null`
in new state. A `continueTournamentInfo` memo mirrors `continueMatchInfo`'s
shape: it calls `findNextPlayableMatchup(activeTournament)` to get the next
playable pairing, resolves both players' display names via
`resolvePlayerDisplay` for the subtitle (falls back to a "Round X of Y"
string if the next matchup isn't fully decided yet — e.g. still waiting on
a prior round). The card itself is a byte-for-byte structural copy of the
existing `continueCard`/`continueRail`/`continuePlayBtn` styles (same
`Card`-adjacent look, same left accent rail, same trailing circular icon
button — just swapped `play` for `crown` in the icon, since `crown` is
already the app's tournament icon used on `HomeScreen`'s own nav grid tile).
Tapping it calls `navigation.navigate('TournamentBracket', { tournamentId })`
— confirmed against `RootStackParamList` in `src/navigation/types.ts`
(`TournamentBracket: { tournamentId: string }`).

Reworked the `MountReveal` stagger delays below the banners from the old
`continueMatchInfo ? STAGGER_MS * n : STAGGER_MS * (n-1)` ternary chain to a
`bannerCount = (continueMatchInfo?1:0) + (continueTournamentInfo?1:0)` plus
`STAGGER_MS * (bannerCount + k)` per section — generalizes cleanly to
0/1/2 banners instead of hardcoding a binary case, and produces the exact
same delays as before when only the match banner is present (bannerCount=1
reproduces every existing `* n`/`* (n-1)` value unchanged).

### Reasoning: could both banners show at once?

Concluded no, by design, and encoded it directly in the memo rather than
just as a comment. `TournamentBracketScreen.playMatchup` hands a tournament
matchup off to the exact same `Game` route / `ActiveMatchStorage` flow as a
casual match (with `tournamentContext: { tournamentId, roundIndex,
matchupIndex }` attached) — so while a tournament matchup is actually being
played, `ActiveMatchStorage.get()` already returns it and the existing
"Continue Match" banner already covers it (with the correct "resume this
specific match" action). The new banner is for the *other* in-progress
tournament state: bracket exists, `status === 'inProgress'`, but nothing is
currently being played (idle between rounds/matches, or the app was closed
before starting the next matchup). So `continueTournamentInfo` explicitly
returns `null` whenever `activeMatch?.tournamentContext?.tournamentId ===
activeTournament.id` — i.e. whenever the live match belongs to this same
tournament, defer entirely to the match banner. The one remaining edge case
this doesn't fully collapse: a casual (non-tournament) match is active at
the same time an unrelated tournament sits idle — then both banners are
legitimately relevant to two different things and both show, stacked, which
is correct rather than a bug (they're not both about the same tournament).

### Abandon action

Added to `TournamentBracketScreen.tsx`'s `Header` via its existing `right`
slot (`Header` already supported `right?: React.ReactNode`, not previously
used by this screen) — a single icon-only `PressableScale` button styled
identically to `HomeScreen`'s `iconBtn`/`Header`'s own `backBtn` (card
surface, border, top edge), using the existing `delete` icon (feather
`trash-2`). Only rendered when `!isComplete` — abandoning a finished
tournament isn't a meaningful action (nothing left to lose), and champion
reveal screens shouldn't grow a destructive button.

Reused the exact `Alert.alert(title, message, [Cancel, destructive Confirm])`
two-step pattern from `SettingsScreen.tsx`'s "Clear match history"/
"Remove player" actions (`{ text: 'Cancel', style: 'cancel' }` +
`{ text: 'Abandon', style: 'destructive', onPress: ... }`). Confirm handler
calls `TournamentStorage.remove(tournament.id)` (previously dead code, now
wired up) then `navigation.popToTop()` back to Home, matching the screen's
own existing back-button behavior (`onBack={() => navigation.popToTop()}`)
rather than a plain `goBack()`, so the user doesn't land back on a bracket
view for a tournament that no longer exists. Alert body clarifies "Played
matches stay in your match history" since `MatchStorage` records are
untouched by `TournamentStorage.remove` — only the bracket/pairing record
is deleted, not any completed `MatchRecord`s.

### Files changed

`src/screens/HomeScreen.tsx` (banner + data load + stagger rework),
`src/screens/TournamentBracketScreen.tsx` (abandon action + `Header.right`).
No changes to `src/storage/tournament.ts`, `src/types/index.ts`, or
`src/logic/tournament.ts` — all reused as-is.

### Nothing flagged as needing a Head Agent call

The scope decision (banner vs. dedicated list screen) was already made by
Head Agent going in; the "could both banners show" question is reasoned
through above and resolved in code, not left ambiguous. `npx tsc --noEmit`
clean after both parts and at the end.

## Round: CheckoutTrainer player picker + achievement-unlock chips (Stage 2)

### Task 1 — CheckoutTrainerScreen real player picker

Replaced the placeholder "silently default to oldest-created player" logic
in `src/screens/CheckoutTrainerScreen.tsx` with a real picker. Reused
`PlayerFilterChips` (the existing single-select "which player's data" chip
row, already used by `AchievementsScreen`/`StatsTrendsScreen`) rather than
building anything new — this screen's need (pick one saved player to
practice/track streaks as) is the same shape as those screens' "view whose
stats" picker. Chip row only renders when there are 2+ players (a single
player has nothing to pick between); the oldest-created player is still
used as the initial default selection when the screen first loads, but it's
now just a starting selection, not a silent permanent one — the user can
change it.

`CheckoutTrainerStorage.getBest(activePlayerId)` is now (re)loaded in a
`useEffect` keyed on `activePlayerId`, so switching players reloads that
player's best streak; the in-progress `streak` also resets on switch since
an in-flight streak belongs to whoever was throwing, not the newly selected
player. `setBest` calls (on new records) already gated on `activePlayerId`
being non-null were left as-is.

**Zero-players case:** renders `EmptyState` (icon `star`, "No players yet" /
"Add a player profile to track your checkout streak") in place of the whole
trainer UI, matching `AchievementsScreen`'s zero-players treatment exactly.

Files changed: `src/screens/CheckoutTrainerScreen.tsx` only. `npx tsc
--noEmit` clean.

### Task 2 — Achievement-unlock chips on GameSummaryScreen (Stage 2 of 3)

Wired `newAchievementsFromMatch(matches, winnerId, matchId)` (Logic Agent's
Stage 1, `src/logic/achievements.ts`) into `GameSummaryScreen.tsx` alongside
the already-shipped `newBests`/`newPersonalBestsFromMatch` computation —
same data source (`MatchStorage.getAll()`), same winner-only scoping, same
draw-safety (`found?.winnerId ? ... : []`). New state `newAchievements:
AchievementStatus[]`.

Since achievements never correspond to an existing numeric stat cell,
every unlocked achievement renders as a standalone chip — exactly the same
`extraBestChip` component/style already used for `bestVisit`/
`longestWinStreak`, just with the achievement's own `definition.icon`/
`definition.title` in place of a PB's label/value, reading "UNLOCKED ·
<title>" instead of "NEW BEST · <label> <value>". Full detail appended to
`docs/agent-comms/collab-achievement-celebration.md`.

**Combined-pass confirmation:** `extraNewBests` and the new
`extraAchievements` render inside the exact same `styles.extraBestsRow`
`View` — one row, not two sections — so a match that both sets a PB and
unlocks an achievement shows all its chips together automatically, no
special-case merge logic needed, satisfying the Head Agent's "one combined
celebration pass" decision as-is.

**Empty-case confirmed:** with `newAchievements = []` (the common case),
`extraAchievements` is `[]` for every player card and the row's render
condition (`extraNewBests.length > 0 || extraAchievements.length > 0`)
is unaffected when both are empty — identical to pre-change output.

No haptic/motion added here — left for the Animation Agent's Stage 3, same
as the PB work. Files changed: `src/screens/GameSummaryScreen.tsx` only.
`npx tsc --noEmit` clean.

## Round: PressableScale accessibility semantics

Scope: `src/components/primitives/PressableScale.tsx`,
`src/components/SwitchRow.tsx`. Confirmed by reading the file directly:
`PressableScale` wraps `Gesture.Tap()` (react-native-gesture-handler)
around a plain `Animated.View` with zero accessibility props — no
`accessible`, `accessibilityRole`, or `accessibilityLabel`. Because it's
built on Gesture Handler rather than core RN `Pressable`, it does not get
these for free the way `Pressable`/`TouchableOpacity` do.

**Final prop interface added** (all optional, backward-compatible):
```ts
accessibilityLabel?: string;
accessibilityHint?: string;
accessibilityRole?: AccessibilityRole; // defaults to 'button'
accessibilityState?: AccessibilityState;
```
`accessible={true}` is now always set on the rendered `Animated.View`
(unconditional — this component's whole purpose is being a tappable
target). All four props are threaded straight onto that same
`Animated.View` alongside the existing `animStyle`/`style`. No change to
the `Gesture.Tap`/`Gesture.LongPress` construction, spring/scale values,
or haptic/sound firing — purely additive JSX props.

**Backward-compatibility confirmed:** every existing call site (13 files
under `src/components/` plus every screen using `Button`, `Header`,
`SwitchRow`, `SegmentButton`, `MultiplierSelector`, `OptionRow`, `TabBar`,
`DartPad`, `GameHud`, `PlayerSelectGrid`, `PlayerFilterChips`,
`PlayerPairChips`) passes none of the four new props today, so each
resolves to defaults: `accessibilityRole="button"`, `accessible={true}`,
no label/hint/state. That's strictly better than the prior zero-props
state (screen readers now at least announce "button" and can focus the
element) with no visual or behavioral change — `npx tsc --noEmit` is
clean and no other file needed edits to keep compiling.

**`SwitchRow.tsx` updated** as the one call site whose semantic role
genuinely isn't "button": it now passes `accessibilityRole="switch"`,
`accessibilityLabel={label}` (the row's own visible label text — free
since it was already a prop), and `accessibilityState={{ checked: value
}}` through to `PressableScale`. No other call sites were swept this
round per the Roadmap Agent's own phasing recommendation.

**Flagged for a future labeling pass** (not built this round):
- `src/components/Header.tsx` — the back-button `PressableScale`
  (line 21) is icon-only, no `accessibilityLabel`; needs something like
  `accessibilityLabel="Back"`.
- `src/components/DartPad.tsx`, `src/components/GameHud.tsx`,
  `src/components/MultiplierSelector.tsx` — icon/number-only tap targets
  (score keys, multiplier arm buttons) with no spoken label beyond
  whatever their `<Text>` children render, which may not always match
  intended screen-reader phrasing (e.g. "Double" vs a bare "D").
- `src/components/TabBar.tsx`, `src/components/PlayerFilterChips.tsx`,
  `src/components/PlayerPairChips.tsx`, `src/components/PlayerSelectGrid.tsx`
  — selectable chip/tab rows that would benefit from
  `accessibilityState={{ selected }}` in addition to a label, mirroring
  the `SwitchRow` treatment done here.

Files changed: `src/components/primitives/PressableScale.tsx`,
`src/components/SwitchRow.tsx`. `npx tsc --noEmit` clean. Commit:
"UI Agent: add accessibility semantics to PressableScale, wire switch
role in SwitchRow".

## Round: ChallengesScreen player picker + accessibility labeling Phase 2

Two independent tasks this round. `npx tsc --noEmit` clean after each task
and at the end.

### Task 1: ChallengesScreen player picker

Read `src/logic/challengeProgress.ts` first — `computeDailyChallengeReport(selectedPlayerId?: string)`
was already committed by the Logic Agent: if `selectedPlayerId` is provided
and matches an existing player, it's used as the `primaryPlayer`; otherwise
it falls back to the oldest-created player (same as before the param
existed). No changes made to that file.

Added a `PlayerFilterChips` row to `src/screens/ChallengesScreen.tsx`,
following `CheckoutTrainerScreen.tsx`'s established convention exactly:
shown only when `players.length > 1`, and the initial selection defaults to
the oldest-created player (mirrors the `oldestPlayer` fallback already
inside `computeDailyChallengeReport`, so the very first render's report is
identical to before the picker existed). Player list loads via a new
`useFocusEffect` (`PlayerStorage.getAll()`), and a second `useFocusEffect`
keyed on `selectedPlayerId` calls `computeDailyChallengeReport(selectedPlayerId
?? undefined)` to refresh the report whenever the selection changes or the
screen refocuses. Selecting a different player re-fetches and re-renders
the solo/multiplayer challenge lists for that player.

**Zero-players case:** unchanged — the screen still shows the existing
`"Add a player profile to start tracking daily challenges."` hint text
(driven by `report.playerId === null`), no `EmptyState` component existed
here before and none was added.

Files: `src/screens/ChallengesScreen.tsx`. Commit `4a1dc43`.

### Task 2: Accessibility labeling, Phase 2

Read all 7 files named in the brief. All 7 genuinely needed something —
none were already labeled or structured differently than expected.

- **`src/components/Header.tsx`** — added `accessibilityLabel="Go back"`
  to the icon-only back-button `PressableScale`.
- **`src/components/GameHud.tsx`** — added `accessibilityLabel="Exit game"`
  to the icon-only exit button, and `accessibilityLabel="Undo last dart"`
  to `HudUndoButton`'s `PressableScale`.
- **`src/components/DartPad.tsx`** — added a computed
  `` `${multiplierLabel} ${n}` `` label (e.g. "Single 20"/"Double 20"/"Triple 20")
  to each number tile, reflecting the currently-armed multiplier state;
  `"Double bull"`/`"Bull"` on the bull button (matching its own
  `multiplier >= 2` display logic); `"Miss"` on the miss button.
- **`src/components/MultiplierSelector.tsx`** — added `accessibilityLabel`
  (the segment's own `SINGLE`/`DOUBLE`/`TRIPLE` text) and
  `accessibilityState={{ selected }}` to each segment. This one already had
  visible text labels (not strictly icon-only), but the brief named it
  explicitly as a selectable segmented control worth the same treatment.
- **`src/components/TabBar.tsx`** — added `accessibilityLabel={opt.label}`
  and `accessibilityState={{ selected: active }}` to each tab.
- **`src/components/PlayerFilterChips.tsx`** — added
  `accessibilityLabel={p.name}` and `accessibilityState={{ selected: active }}`
  to each chip.
- **`src/components/PlayerPairChips.tsx`** — added
  `accessibilityLabel={p.name}` and `accessibilityState={{ selected }}`
  (slot-picked state) to each chip.
- **`src/components/PlayerSelectGrid.tsx`** — added
  `accessibilityLabel={p.name}` and `accessibilityState={{ selected }}` to
  each player chip (the "Add player" chip at the end was left alone — it's
  an action button, not a selectable item, so no `selected` state applies).

All additions are additive only — no layout/behavior changes. Relied on
`PressableScale`'s existing `accessibilityRole` default (`'button'`) rather
than re-specifying it anywhere.

Files: `src/components/Header.tsx`, `src/components/DartPad.tsx`,
`src/components/GameHud.tsx`, `src/components/MultiplierSelector.tsx`,
`src/components/TabBar.tsx`, `src/components/PlayerFilterChips.tsx`,
`src/components/PlayerPairChips.tsx`, `src/components/PlayerSelectGrid.tsx`.
Commit `6314fda`.

### Final check

`npx tsc --noEmit` clean after both tasks and at the end of the round.

## Round: Under-visited screens audit (RulesScreen, BullOffScreen, PlayerEditScreen, TournamentSetupScreen, PlayersListScreen)

Dedicated design-consistency pass on five screens that had only glancing or
zero attention this cycle (per Head Agent brief: same rigor as the earlier
"clean" verdicts on Stats/Achievements/HeadToHead). Read each file fully,
checked against `CLAUDE.md`'s hard rules and `src/theme/` tokens.

**Verdict: all five are clean. No code changes made, no commits.**

### `src/screens/RulesScreen.tsx`
- Uses `<Screen scroll>`, `PressableScale` throughout (accordion header,
  no bare `Pressable`), `staggerDelay(index)` for the mode-card list
  entrance (`FadeInDown`), `SPRING_GENTLE` for the layout-transition spring.
- `mode.color + '1F'` (icon-circle tint) is not ad-hoc — confirmed via
  grep it's the exact same convention used in `ModeSelectScreen.tsx:71`,
  `HeadToHeadScreen.tsx:230`, `SearchScreen.tsx:157`, `StatsScreen.tsx:108`,
  `MatchDetailScreen.tsx:88` (six sites total). No hardcoded hex anywhere
  in the file (grep confirmed).
- No section-title-style label exists in this file, so nothing to
  consolidate onto `typography.overline`.

### `src/screens/BullOffScreen.tsx`
- `<Screen scroll>` present, `PressableScale` for every tap target (player
  pick tiles), `staggerDelay(i)` for the pick grid, plain `FadeInDown`/
  `ZoomIn` for one-shot reveals (settled rows) — correct, since those
  aren't a cascading list. All colors route through `colors`/`COLORS`
  tokens; no hex literals, no gradients/elevation.
- Only prior touch this cycle was the F17 stagger-delay swap — confirmed
  still correctly wired (`staggerDelay` imported and used at line 139).

### `src/screens/PlayerEditScreen.tsx`
- `label` style already consolidated onto `typography.overline` (prior
  round's claim verified directly, line 237).
- Color/avatar picker, photo picker: all `PressableScale`, no bare
  `Pressable`; swatches use plain `colors.playerPalette`/token backgrounds,
  no hex. Confirmed via grep this is the *only* color/avatar swatch grid
  in the app (no sibling to compare stagger-entrance treatment against),
  so the swatches' lack of per-item entrance animation isn't inconsistent
  with an established pattern — nothing to fix.
- `<Screen scroll>` present, `Button`/`Icon` used correctly, destructive
  delete uses the standard two-step `Alert.alert` confirm pattern.

### `src/screens/TournamentSetupScreen.tsx`
- `sectionTitle` already on `typography.overline` (prior round's
  consolidation verified, line 289).
- Two `Card` sections use `FadeInDown.delay(reducedMs(60))` /
  `reducedMs(140)` rather than `staggerDelay()` — this is correct, not
  drift: it's a fixed two-section reveal (not an indexed list), and
  `reducedMs()` still correctly collapses both delays to 0 under reduced
  motion.
- Guest chips/quick-guest button/switch all use `PressableScale`/
  `SwitchRow` (never bare `Pressable`/RN `Switch`). Dynamic guest-chip
  border color (`g.color`) and `colors.secondary + '55'` alpha tint are
  both applied to actual per-item/token colors, not new hardcoded hex —
  grep confirmed zero raw hex literals in the file.

### `src/screens/PlayersListScreen.tsx`
- Confirmed via `head-log.md`/prior reports this screen had received no
  dedicated attention this cycle — audited fresh.
- Fully clean: `<Screen scroll={players.length > 0}>`, `EmptyState` used
  for the zero-players case, `PressableScale` for every row/header button
  (`PRESS_SCALE.row` for list rows, matching the convention used
  elsewhere), `staggerDelay(Math.min(i, 8))` correctly caps stagger for
  long lists (same capping idiom as other list screens), all colors via
  `colors`/`COLORS` tokens, no hex/gradient/elevation.

### Cross-file checks
- Repo-wide grep across these five files for bare `Pressable` (excluding
  `PressableScale`), raw hex codes, `elevation`, and gradient usage:
  zero hits in all five.
- All five still render `<Screen>` as their safe-area root.

**No flags for the Head Agent.** This was a genuinely clean pass — no
manufactured changes. `npx tsc --noEmit` run at the end: clean (no changes
were made, so this just confirms baseline health).

## Round: Surface `CareerStats.avgFirstNine` on PlayerProfileScreen

Read `src/logic/stats.ts` fully (not touched, per instructions): confirmed
`avgFirstNine: number` on `CareerStats` (line 61) is a weighted average of
each match's `firstNineAvg` (itself darts-weighted per match,
`(firstNineScored / firstNineDarts) * 3`, `stats.ts` lines 15-18/128-136),
defaulting to `0` via `emptyCareer()` when a player has no matches for the
given game-type filter — same "just show 0.0, no dash" convention as the
sibling `avgThreeDart` field, not the "—" convention used by count/best
fields like `highestCheckout`/`bestLegDarts`.

Grepped for an existing label for this exact stat before inventing new
copy: `GameSummaryScreen.tsx:380` already renders it per-match as
`<RevealStat label="First 9" value={r.firstNineAvg || null} format={(n) => n.toFixed(1)} .../>`.
Matched both the label ("First 9") and the formatting (`toFixed(1)`)
exactly for cross-app consistency.

**Placement:** `src/screens/PlayerProfileScreen.tsx`'s `GameTypeStats`
component, inside the `isX01` block — the existing X01 stats already
render two `statsGrid` rows of four `StatPill`s each (3-Dart Avg/Checkout
%/Highest CO/180s, then 100+/140+/Best Leg/Win Rate). Added a third
`statsGrid` row directly below containing a single `StatPill` for
`career.avgFirstNine.toFixed(1)`, labeled "First 9", with the same
`accent={colors.neonCyan}` used on the sibling "3-Dart Avg" pill (both are
per-visit scoring averages, so sharing that accent groups them visually).
Chose a new third row over squeezing a 5th pill into the existing
four-pill row so every pill's flex-basis stays identical to its row
siblings — `StatPill` is `flex: 1` inside a plain row `View`, so a 5-item
row would render visibly narrower pills than the 4-item rows above it.

No changes to `src/logic/stats.ts`, `src/types/`, or any storage/data
shape — purely an additive render change reading an already-computed
field.

`npx tsc --noEmit` clean. Commit `f3d927e`.

Files: `src/screens/PlayerProfileScreen.tsx`.

## Round: Warn before deleting a player who's in an in-progress tournament

Small, additive copy fix flagged jointly by a Logic Agent trace and Roadmap
Agent proposal this cycle: deleting a player mid-tournament is mechanically
safe (`resolvePlayerDisplay`'s `FALLBACK` already covers a dangling id
everywhere), but nothing told the user their deleted player would become an
anonymous "Player" in that bracket going forward. Stayed out of
`PlayerProfileScreen.tsx` per this round's instructions (concurrent UI Agent
work there).

### Read first

`src/screens/PlayerEditScreen.tsx`'s `remove()` (line 113) and
`src/screens/SettingsScreen.tsx`'s `removePlayer()` (line 56) — both use the
same `Alert.alert('<title>', 'Remove <name>? Match history will be kept.',
[Cancel, destructive Confirm])` shape, differing only in title/button
wording ("Delete player"/"Delete" vs "Remove player"/"Remove"). Also read
`src/storage/tournament.ts` (`TournamentStorage.getAll/get/save/remove`) and
the `Tournament`/`TournamentMatchup`/`TournamentStatus` shapes in
`src/types/index.ts`. Confirmed `Tournament.playerIds: string[]` (line 258)
already holds the full participant roster for that tournament — matchups
(`playerAId`/`playerBId`) are just null-able pairings drawn from that same
roster, so checking `playerIds` directly is sufficient and simpler than
walking every round's matchups.

### Implementation

Added `TournamentStorage.isInActiveTournament(playerId): Promise<boolean>`
to `src/storage/tournament.ts` — `all.some(t => t.status === 'inProgress' &&
t.playerIds.includes(playerId))`. Kept it on `TournamentStorage` itself
(storage-layer, async, AsyncStorage-backed) rather than in
`src/logic/tournament.ts`, whose own file header says it's deliberately
pure/no-I/O.

In both screens, made the removal-trigger function `async` and awaited
`TournamentStorage.isInActiveTournament(id)` *before* calling `Alert.alert`,
picking one of two message strings:

- Not in an active tournament (the common case, unchanged copy):
  `` `Remove ${name}? Match history will be kept.` ``
- In an active tournament (new):
  `` `Remove ${name}? Match history will be kept. They're in an in-progress tournament and will show as an unknown player in that bracket.` ``

Both call sites (`Button onPress={remove}` in `PlayerEditScreen.tsx`,
`PressableScale onPress={() => removePlayer(p.id, p.name)}` in
`SettingsScreen.tsx`) already tolerated an async handler with no change
needed — neither awaited a return value or chained anything off the call.

**Removal behavior itself is completely unchanged:** the `Alert`'s
Cancel/Confirm buttons and their `onPress` handlers
(`PlayerStorage.remove(...)`, `navigation.goBack()` /
`setPlayers((prev) => prev.filter(...))`) are untouched — only the message
string shown before the user confirms was made conditional. No new gate,
no blocking, no confirmation step added; this is purely an awareness/copy
change gated on one extra async read that resolves before the `Alert` ever
appears.

### Final check

`npx tsc --noEmit` clean.

Files: `src/storage/tournament.ts` (new `isInActiveTournament` method),
`src/screens/PlayerEditScreen.tsx`, `src/screens/SettingsScreen.tsx`.
