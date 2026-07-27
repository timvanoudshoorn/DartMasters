# Roadmap/Feature Agent — Round 1 Report

Proposal-only. No application code touched. `docs/full-audit/plan.md` (F1-F23)
is fully closed per `docs/build-log.md`; nothing below re-proposes any of it.
Candidates are ordered as a recommended build sequence (most value / lowest
risk first). Each entry: what + why, scope, size, risk flags.

---

## 1. "Rematch" — one-tap replay with same players & settings

**What/why:** `GameSummaryScreen`'s "PLAY AGAIN" button
(`src/screens/GameSummaryScreen.tsx` line 280) calls
`navigation.replace('GameSetup', { gameType: match.gameType })` — it drops
back into an *empty* player-picker every time. `RootStackParamList['GameSetup']`
(`src/navigation/types.ts` lines 10/40) only ever carries `{ gameType }`, never
players or rule config. After every single match — the single most common
loop in the app — the user re-taps every player and re-sets legs/sets/out-mode
from scratch, even for a same-group rematch immediately after. This is a real,
high-frequency friction point, not cosmetic.
**Scope:** Add an optional `rematch?: { playerIds, guestPlayers, legsToWin,
setsToWin, outMode, inMode, ... }` param to the `GameSetup` route (mirrors
`GameConfig` shape already in `src/types/index.ts`); `GameSetupScreen.tsx`
pre-populates `selectedIds`/`guests`/rule state from it when present, still
fully editable. `GameSummaryScreen.tsx`'s "PLAY AGAIN" passes `match`'s config
through. Owner: **Logic/Systems** (route param + prefill wiring is state
plumbing, not visual), no Animation needed, UI Agent only if prefilled chips
need a visual "pre-selected" treatment.
**Size:** Medium — 2 files, one param shape, straightforward.
**Risk:** None — purely additive route param, no persisted-storage shape
touched, no `src/logic/` game-rule change (only setup-screen prefill).

---

## 2. Celebrate personal bests and achievement unlocks on the win screen

**What/why:** `src/logic/personalBests.ts` and `src/logic/achievements.ts`
are fully-built, pure derived-data modules — but nothing surfaces them at the
moment they happen. `AchievementsScreen`/player profile only show them
retrospectively, browsed later. A player who just threw their highest-ever
checkout or broke their longest win streak gets the same generic
`GameSummaryScreen` ceremony as any other match — the single moment this data
is most meaningful is silent. This is a real gap given how much of the win
screen's staged reveal (`REVEAL` constants, `CountUp`, `Confetti`) already
exists to *dramatize* numbers.
**Scope:** **Collab, 3 stages, same pattern as the Haptics/Reduce-Motion
toggles:** (1) Logic/Systems — a small pure function (e.g.
`checkNewPersonalBests(matches, playerId, thisMatchId)` in
`src/logic/personalBests.ts` or a new sibling) that diffs the just-finished
match's result against the player's prior-best, returning which PB ids (if
any) were newly set this match; same idea for achievements via
`achievements.ts`. (2) UI — a small "NEW BEST" pill/badge on the relevant
`RevealStat` card in `GameSummaryScreen.tsx`. (3) Animation — a distinct pop
(reuse `SPRING_BOUNCY`) and optionally `hapticPattern` addition, timed into
the existing `REVEAL` stagger rather than a whole new stinger.
**Size:** Medium-to-large — touches a logic module + GameSummaryScreen +
motion; flag for Head Agent scoping on exactly which of PBs vs. achievements
(or both) to include in v1 — recommend PBs only first (cleaner single-owner
data, `personalBests.ts` already computes per-match `matchId`), achievements
as a fast-follow.
**Risk:** No persisted-shape change (purely derived from existing
`MatchRecord[]`); no `src/logic/` *game rule* changes, only new read-only
derived-stat functions alongside existing ones.

---

## 3. Draw-ending polish follow-through — sudden-death option

**What/why:** F12 (already fixed) made draws readable ("DRAW — tied at N")
on `GameSummaryScreen`, but per the audit's own note, the bigger judgment call
— whether Shanghai/Bobs27/HalveIt should offer a sudden-death decider instead
of just accepting the tie — was explicitly deferred. Worth revisiting now as
a scoped decision: does the app want a "Play sudden-death leg" secondary
action on a draw result, or is displaying the draw the permanent design?
**Scope:** If adopted: `src/logic/{shanghai,bobs27,halveIt}.ts` gain a
tie-break entry path (additive function, not a change to existing scoring);
`GameSummaryScreen.tsx` shows a third action button on draw. Owner:
**Logic/Systems** first for the tie-break rule definition, then UI for the
button.
**Size:** Large if built — three game modes' logic plus a new UI branch.
**Flag: needs explicit Head Agent scoping/decision before dispatch** — this
is genuinely a judgment call (some players may prefer draws stay draws;
Shanghai/Bobs27/HalveIt are drill-style modes where a draw is a legitimate
casual outcome). Recommend Head Agent make the keep-or-build call before
any worker touches `src/logic/`.

---

## 4. `SegmentButton`'s dead `soundTrigger` prop cleanup

**What/why:** F14 flagged that `SegmentButton`'s `soundTrigger` prop is
"decorative" — both values it's ever passed resolve to silent triggers
(`miss`/`buttonTap` have no audio assets). The prop still exists in the
component signature and is still passed at every game-screen call site,
which is dead weight future editors will trip over wondering "why does this
silently do nothing." This is a leftover from F7/F14, not a new bug, but it's
a small clarity debt worth closing explicitly now that the sound-asset
question (see final section) has an actual answer.
**Scope:** Remove `soundTrigger` from `SegmentButton.tsx`'s props and every
call site (Cricket/Shanghai/ATC/HalveIt/Killer/Bobs27 game screens), OR keep
it but wire it to real assets if recommendation below is adopted.
**Owner:** UI/Design (prop removal is a component-contract change, not
logic) — trivial diff.
**Size:** Small — single component + grep-driven call-site cleanup.
**Risk:** None — dead prop, no logic or data touched.

---

## 5. HeadToHeadScreen's independent chip picker → shared `PlayerFilterChips`

**What/why:** The UI-redesign QA (`docs/ui-redesign/qa-report.md` item 4)
documented that `HeadToHeadScreen.tsx` was deliberately left off
`PlayerFilterChips` because its picker is a two-player, order-tracked
multi-select — structurally different from the component's single-select
contract. That's a reasonable call for *not forcing* the existing component,
but it leaves `HeadToHeadScreen.tsx` (477 lines — the largest flow screen)
as the one place in the app with a fully bespoke player-picker, which is
exactly the kind of "flow screens had one pass, not two" gap the current
UI/Design Agent sweep (Round 1, per `head-log.md`) is already targeting.
**Scope:** Not "force-fit PlayerFilterChips" — instead extend
`PlayerFilterChips` with an optional `mode="ordered-pair"` (or build a
sibling `PlayerPairChips`) so HeadToHead gets the same tap/press feel,
spacing, and haptics as every other picker without losing its two-slot
semantics.
**Owner:** UI/Design.
**Size:** Medium — one new component variant + one screen's picker swapped.
**Risk:** None — pure UI, no logic/data.

---

## 6. Stats/Trends: surface `personalBests.ts` records outside PlayerProfile

**What/why:** `computePersonalBests` is a fully general, already-built
function, but a scan of call sites shows it's only consumed on
`PlayerProfileScreen.tsx`. `StatsTrendsScreen.tsx` (173 lines, already
flagged in Next Up as due for a polish pass) shows trend charts but no
"records" section, even though the data model already exists and needs zero
new logic — this is a pure surfacing/UI gap, cheap to close during the
already-planned Trends polish pass rather than a separate initiative.
**Scope:** `StatsTrendsScreen.tsx` — add a compact records strip (reuse
`StatPill`) sourced from the existing `computePersonalBests` call, filtered
to the screen's selected player.
**Owner:** UI/Design (fold into the Round-1 Stats/Trends sweep already
dispatched — flag to Head Agent as an addendum to that in-flight task rather
than a separate dispatch, to avoid double-touching the file same cycle).
**Size:** Small.
**Risk:** None — read-only consumption of an existing pure function.

---

## 7. Search screen: no recent/empty-state guidance

**What/why:** `SearchScreen.tsx` (208 lines) is functional but — per a
static read — its `EmptyState` behavior on first entry (before any query is
typed) just shows a blank search bar with no hint of what's searchable
(players? matches? both?) or any "recent searches"/suggested-players
shortcut. For an app with growing match/player history this is a small but
real first-use clarity gap. Lower priority than items above since it's pure
polish on a lightly-used screen.
**Scope:** `SearchScreen.tsx` only — add a pre-query `EmptyState` (component
already exists, reused everywhere else) with a one-line hint, optionally a
"recent players" quick-list sourced from existing `PlayerStorage`.
**Owner:** UI/Design.
**Size:** Small.
**Risk:** None.

---

## 8. BackupRestoreScreen: no last-backup timestamp / staleness nudge

**What/why:** `BackupRestoreScreen.tsx` lets a user export/import but (per a
static read of the 167-line file) doesn't surface *when* they last backed up
— for an app with zero backend and 100% local `AsyncStorage` persistence,
losing a device without ever having exported is a real, silent data-loss risk
users have no visibility into. A one-line "Last backed up: 12 days ago" plus
a soft nudge (not a nag) is proportional given the app's no-backend design.
**Scope:** `SettingsStorage`/a small new additive field (e.g.
`lastBackupAt: number | null` on `AppSettings`, set whenever export succeeds)
+ `BackupRestoreScreen.tsx` displays it.
**Owner:** **Collab, small** — Logic/Systems adds the additive settings field
+ sets it on successful export (`src/logic/backup.ts` / storage), UI displays
it.
**Size:** Small.
**Risk:** Touches persisted `AppSettings` shape — **flag: additive-only**
(new optional field, default `null`, no migration, matches the established
pattern from `hapticsEnabled`/`reducedMotionEnabled`). Not a `src/logic/`
game-rule change.

---

## 9. Killer: no life-loss warning before a possibly-fatal dart

**What/why:** Per the audit's own note, Killer is the one mode where a
mis-tap has irreversible-feeling consequences (elimination), which is why F8
(undo everywhere) called it out by name. Undo now exists as a safety net
after the fact, but there's no *before-the-fact* affordance — e.g. no visual
distinction on the target grid for "this dart would take a life," unlike,
say, X01's bust-risk isn't flagged either, but Killer's stakes are
structurally higher (permanent elimination vs. a recoverable bust). This is
a smaller, more speculative polish idea — flagging it lower priority since
undo already covers the actual risk; a warning affordance is a "nice", not a
gap.
**Scope:** `KillerGameScreen.tsx` — conditional styling/tint on the target
grid when the pending tap would eliminate the opponent at the killer's
current segment.
**Owner:** UI/Design, possibly Animation for the tint transition.
**Size:** Small.
**Risk:** None — visual only, no logic change (elimination rule itself
untouched).

---

## Sound-asset recommendation — `miss` / `buttonTap`

**Keep both permanently silent by design (option a). Do not add audio
assets.** Reasoning: the app's own sound vocabulary already draws a clean,
consistent line — *outcome* moments (score, bust, checkout, 180, killer
elimination/promotion, win) get a distinct audio signature, while routine,
high-frequency, low-stakes taps (a miss, a generic button press) get haptic
feedback only. That split isn't an oversight — F14's own audit language calls
it "by design," and it matches how the rest of the feedback layer is
architected: `haptics.ts`'s own rule is "physical weight tracks the dart;
sound tracks the outcome," and a miss has no outcome weight to track (it's
the *absence* of a scoring event). Adding a real audio clip to `miss` would
mean every non-scoring dart across 8 game modes gets an audible cue alongside
every scoring one, which — given misses are common in casual play and even
more common with weaker bots — would very quickly become the single most
frequently triggered sound in the app, working directly against the
"premium and tactile, never noisy" feel the design system states as a goal.
`buttonTap` is even lower-stakes (chrome navigation, not gameplay), and
constant audible feedback on ordinary UI taps reads as dated/default-Android
rather than premium. If there's later appetite for *some* additional audio
richness, the better target is new *outcome* moments that currently have
none — e.g. `legWon` already has a haptic pattern (F10) but no sound; that
would be a more consistent place to spend a new asset than reversing the
`miss`/`buttonTap` silence.

---

# Round 2 Report — 2026-07-27

Proposal-only, no application code touched. Round 1's low-hanging fruit is
gone (#1/#4/#5/#6/#7/#8 shipped, #3 declined permanently, #9 deferred). This
round required reading actual logic modules and screens rather than
re-surfacing known gaps; findings below are ordered as a recommended build
sequence, most valuable/lowest-risk first.

## 1. Ship the achievements fast-follow to the PB-celebration ceremony

**What/why:** Round 1's proposal #2 shipped PBs-only in v1 and explicitly
named achievements as "a fast-follow candidate, not scheduled." Having now
read both modules side by side, the fast-follow is *easier* than the
original PB work, not harder: `computeAchievements(matches, playerId)`
(`src/logic/achievements.ts` line 186) returns a flat `AchievementStatus[]`
with a plain `earned: boolean` per achievement — a simple threshold crossing,
with no "improvement direction" concept to get right (unlike
`newPersonalBestsFromMatch`'s `LOWER_IS_BETTER` special-casing for
`bestLegDarts` in `src/logic/personalBests.ts` lines 168-171). The exact
same "diff with/without this match" wrapper pattern already proven at
`newPersonalBestsFromMatch` (`personalBests.ts` lines 198-231) drops in
almost verbatim: call `computeAchievements` once with the full match history
and once with `thisMatchId` filtered out, and any achievement that flips
`earned: false → true` is a "just unlocked this match" result — no new logic
in `achievements.ts` itself needs touching, only a new sibling function.
**Scope:** **Collab, 3 stages, same shape as the PB work already shipped and
verified.** (1) Logic/Systems — `newAchievementsFromMatch(matches, playerId,
thisMatchId): AchievementStatus[]` in `achievements.ts`, mirroring
`newPersonalBestsFromMatch`'s structure exactly. (2) UI — an "ACHIEVEMENT
UNLOCKED" badge on `GameSummaryScreen.tsx` reusing the same `RevealStat`/pill
slot the "NEW BEST" badge already occupies (lines ~81, ~322 per the existing
`NEW_BEST_CELL_LABEL` pattern), pulling the achievement's own `icon`/`title`
from `AchievementDefinition`. (3) Animation — same `SPRING_BOUNCY` pop and
haptic accent already timed into the `REVEAL` stagger for PBs; achievements
should land in the same beat, not a new one, to avoid stacking two separate
celebration moments in one ceremony (if both a PB and an achievement land in
the same match, prefer one combined visual pass over two sequential pops —
flag this specific sequencing question for Head Agent scoping before
dispatch, since `GameSummaryScreen.tsx` is a frequently-touched file this
cycle and worth getting the multi-badge layout right in one pass).
**Size:** Medium — smaller than the original PB work since the diff pattern,
badge slot, and animation beat all already exist as a template; the new
surface area is one logic function + one more badge variant on an existing
mechanism.
**Risk:** None — purely derived from existing `MatchRecord[]`, no persisted
shape change, no `src/logic/` game-rule change (a new read-only function
alongside `computeAchievements`, which itself is untouched).
**Recommendation: build this now.** It's the most template-following, lowest
-risk item in this round, and closes an explicitly-flagged open item from
last cycle.

---

## 2. Tournament resume/abandon — a real dead end, not just a rough edge

**What/why:** Investigated per the prompt's tournament-flow question, and
found something more concrete than a UX rough edge: **there is no way back
into an in-progress tournament once you navigate away from
`TournamentBracketScreen`.** `HomeScreen.tsx` only ever offers `navigation
.navigate('TournamentSetup')` (line 264) — there's no "continue tournament"
banner, list, or entry point anywhere else in the app. `TournamentStorage`
(`src/storage/tournament.ts`) has a fully-implemented `getAll()` (line 22)
and `remove()` (line 36), but a repo-wide grep shows `getAll()` is only ever
called from `backup.ts` (export/import), and `remove()` is called **nowhere**
— it's dead code. `TournamentBracketScreen.tsx`'s only exit is `onBack={() =>
navigation.popToTop()}` (line 80), with no delete/abandon action on the
screen itself. Concretely: start a tournament, back out of the app (or just
press back to Home) before it's complete, and the only way to see it again
is knowing to manually navigate — which no UI element offers. The bracket
data isn't lost (it's still in `AsyncStorage`), but from the user's
perspective it's completely inaccessible, which reads as data loss even
though it technically isn't. This is the same flavor of gap as F15
(tournament crash-resume) but one level up: F15 covered losing tournament
context *mid-match*; this covers losing the *entire tournament* between
matches, which F15's fix doesn't touch (confirmed: F15 only threads
`tournamentContext` through `ActiveMatchStorage`/`GameScreen`/`HomeScreen`'s
existing continue-match banner, which only exists while a match is actively
in progress — it says nothing about an idle bracket).
**Scope:** Add a lightweight "Tournaments" entry point — either a new small
list screen (`TournamentsListScreen.tsx`, reusing `Card`/`EmptyState`) reached
from `HomeScreen.tsx`'s existing menu/quick-actions area, or, more minimally,
an extra "continue tournament" banner on `HomeScreen.tsx` sourced from
`TournamentStorage.getAll().find(t => t.status === 'inProgress')` (same
pattern as the existing `continueMatchInfo` banner at lines 123-146).
Whichever shape, also wire `TournamentStorage.remove()` to an actual
"Abandon tournament" action (e.g. on `TournamentBracketScreen.tsx`) so the
already-built delete path stops being dead code. Owner: **UI/Design** for
the screen/banner, **Logic/Systems** only if the list/filter logic needs a
new small selector function (likely inlineable, given `TournamentStorage
.getAll()` already exists).
**Size:** Medium — new list screen is the larger option; the HomeScreen-banner
variant is smaller and more consistent with the existing continue-match
pattern, recommended over a full list screen unless multiple concurrent
tournaments turn out to be a real use case (unlikely — flag for Head Agent
to pick banner-only vs. full-list scope before dispatch).
**Risk:** None on data — no persisted-shape change, `TournamentStorage`
already has every method needed; this is pure UI/navigation surfacing of
data that already exists.

---

## 3. `CheckoutTrainerScreen`'s best-streak is a single global key, not per-player

**What/why:** `CheckoutTrainerStorage` (`src/storage/storage.ts` lines
113-119) persists best streak under one fixed key,
`@dartmasters/checkoutTrainerBest` — there's no player selection on
`CheckoutTrainerScreen.tsx` at all, and the stored best streak is shared
across every profile on the device. This is inconsistent with literally
every other stat in the app (`PlayerProfileScreen`, `computePersonalBests`,
`computeAchievements` are all keyed per-`playerId`), and on a shared-device
app (the design explicitly supports guest players and multiple profiles per
`GameSetupScreen`), two different people practicing checkouts on the same
device silently overwrite each other's best streak with no indication this
is happening. This is the one practice-mode gap that's a real, if small,
correctness issue rather than a missing-feature nice-to-have.
**Scope:** `CheckoutTrainerScreen.tsx` needs a lightweight player-context
(reuse the existing single-player-select pattern from elsewhere, e.g.
`GameSetupScreen`'s single-select affordance, or default silently to the
app's "current"/most-recently-used player if the screen wants to stay
zero-friction) and `CheckoutTrainerStorage`'s key needs to become
per-player: `@dartmasters/checkoutTrainerBest:<playerId>` (or a
`Record<playerId, number>` blob under the existing key). Owner: **Logic/
Systems** for the storage-shape change, **UI/Design** for wherever a player
picker needs to be added to the trainer screen.
**Size:** Small-to-medium depending on whether a player picker needs to be
added to the screen (currently has none) or whether it's acceptable to
silently attribute to whichever player is "active" elsewhere in the app.
Flag for Head Agent scoping on that UX question before dispatch.
**Risk:** Persisted-data-shape change — **flag: additive/migration-safe
approach required** (e.g. keep the old global key as a one-time fallback
value for the first player who has no per-player record yet, rather than
silently resetting everyone's streak to 0). Not a `src/logic/` game-rule
change.

---

## 4. Killer risk affordance — reassessed, still correctly deprioritized

**What/why:** Re-read `KillerGameScreen.tsx` fresh per the prompt's ask.
Nothing has structurally changed since Round 1's deferral: undo (F8) already
covers the actual risk (a mis-tap is one tap to reverse via `HudUndoButton`,
line 451), and the player-tile grid (lines 466-504) has no pre-tap
affordance for "this would eliminate someone." Confirmed the elimination
math itself (`applyKillerThrow` in `src/logic/killer.ts`) is untouched and
out of scope regardless. One new, smaller observation while re-reading: the
tile's `disabled` condition is only `kp.eliminated || isBot(activePlayerId)`
(line 477) — tapping a tile that logically can't score (e.g. tapping your
own number while not yet a killer taps into the "hit your own number to
build lives" path, and tapping *anyone's* tile while not a killer is legal
input per real Killer rules, so this isn't a bug, just confirms the
interaction surface is exactly as permissive as real darts). Nothing here
raises this above "nice, not a gap."
**Recommendation:** Keep deferred, not scheduled. No change to Round 1's
assessment.

---

## Notes on other areas checked, nothing proposed

- **Tournament bracket/setup logic** (`tournament.ts`): `recordMatchResult`'s
  defensive guards (F16) are already in place and correct; `createBracket`'s
  bye-seeding and `propagate()` cascade logic read correctly on a fresh
  trace. No further gaps found beyond item #2 above.
- **Practice170GameScreen.tsx**: reads cleanly — proper `MatchRecord`
  integration via `computeX01PlayerResult`, undo correctly disabled during
  the bust-flash window with a documented reason (line 291-293), leg-won
  haptic beat present. No gaps found.
- **HomeScreen.tsx bell icon** (line 102): `onPress={() => Alert.alert("You're
  all caught up", 'No new notifications.')}` — a permanently-stubbed
  notifications affordance. Minor design debt (an icon that always says
  "nothing here"), not flagged as a proposal since it's cosmetic-only and
  there's no notifications feature elsewhere in the app to wire it to; worth
  a one-line mention only in case Head Agent wants it simplified/removed as
  a trivial cleanup alongside other work, not on its own.

---

# Round 3 Report — 2026-07-27

**Honest headline: there's less here than Round 1 or 2.** Six of the eight
`src/logic/` game-mode modules and every stats/derived-data module named in
the brief read clean on a fresh trace — `shanghai.ts`, `aroundTheClock.ts`,
`halveIt.ts`, `bobs27.ts`, `killer.ts`, `cricket.ts`, `x01.ts`, `trends.ts`,
`headToHead.ts`, `search.ts`, `dailyChallenges.ts`/`challengeProgress.ts`'s
challenge *definitions* — no new edge cases, no dead code, no incorrect
math found in any of them (see "Areas checked, nothing proposed" below for
specifics). What this round actually turned up came from two directions the
brief specifically pointed at that hadn't been read fresh yet: the shared
interaction primitives (accessibility, item 4) and one screen's data-scoping
logic (`ChallengesScreen`/`challengeProgress.ts`, item 2). Two solid,
well-evidenced proposals, ordered by build sequence, plus one item found but
explicitly *not* proposed because building it would break a hard rule.

## 1. `PressableScale` has zero accessibility semantics — every tappable
   surface in the app is invisible to screen readers

**What/why:** `PressableScale` (`src/components/primitives/PressableScale.tsx`)
is, per its own doc comment, "the app's universal tactile surface... a bare
Pressable is a design bug" — every `Button`, `SwitchRow`, `Header` back
button, icon-only action (undo, camera, bell), tab, chip, and game key in the
app routes through it. Reading it fresh: it wraps a `Gesture.Tap()` from
`react-native-gesture-handler` around a plain `Animated.View`
(lines 66-93) — no `accessible`, no `accessibilityRole`, no
`accessibilityLabel`/`accessibilityHint` prop exists on its interface at all
(lines 16-28). This matters concretely, not just in principle: RN's own
`Pressable`/`TouchableOpacity` automatically mark their host view as an
accessible element with `accessibilityRole="button"` for a screen reader;
`Gesture.Tap()` wrapping a bare `Animated.View` does not — confirmed this is
the actual mechanism, not a guess, by reading the component's full
implementation. A repo-wide grep found `accessibilityLabel` used in exactly
2 files, 5 occurrences total (`StatsTrendsScreen.tsx`, one chart), across the
*entire* `src/` tree. Concrete casualties: `Header.tsx`'s back button
(icon-only, no text fallback at all — line 21), `SwitchRow.tsx` (a custom
toggle with no `accessibilityRole="switch"`/`accessibilityState.checked`),
every `GameHud` icon action (undo, camera-scoring shortcut), every tab bar
icon, every X01 number key. `Button.tsx` at least has a `<Text>` label RN can
fall back to reading in isolation, but even there the whole widget isn't
grouped as one accessible "button" element with a role/press-affordance —
confirmed by reading `Button.tsx` end to end (it renders `<PressableScale><View><Text>label</Text></View></PressableScale>`
with nothing accessibility-related added at any layer). This is a
foundational, single-component gap that silently affects the entire app,
not a per-screen issue — genuinely new territory, since no prior round's
brief asked about accessibility beyond haptics/motion.
**Scope:** `PressableScale.tsx` gains `accessible={true}`,
`accessibilityRole="button"` (or a passable `accessibilityRole` prop,
defaulting to `"button"`, so `SwitchRow` can pass `"switch"` +
`accessibilityState={{ checked }}`), and an optional `accessibilityLabel`
prop threaded through. This one component change immediately fixes the
generic "is this a tappable button" problem everywhere. A second, smaller
pass to actually *fill in* meaningful labels at icon-only call sites
(`Header`'s back arrow → "Go back", `GameHud`'s undo/camera icons, tab bar
icons) is the real value-add and should follow once the prop exists —
recommend scoping that as an explicit Phase 2 rather than trying to hit
every call site in one dispatch. Owner: **UI/Design** for the component
change; the labeling pass can be split across UI/Design (flow screens) and
whoever next touches each game screen, since it's additive and non-breaking
per file.
**Size:** Small for the component change itself (one file, additive props,
sensible defaults so nothing regresses if a call site doesn't pass a label);
medium in aggregate if the labeling sweep is done in one pass across every
icon-only call site, but that can be spread across multiple small dispatches
without risk.
**Risk:** None — purely additive props on a UI primitive, default behavior
for every existing call site is `accessibilityRole="button"` with no label
(better than the current "nothing" but not yet a regression risk from
missing per-call-site labels). No `src/logic/` or persisted-shape changes.

---

## 2. `ChallengesScreen` is permanently locked to one player, with no way to
   switch — the same class of bug just fixed for CheckoutTrainer

**What/why:** `computeDailyChallengeReport()` (`src/logic/challengeProgress.ts`
lines 23-47) picks a single `primaryPlayer` — `players.slice().sort((a, b)
=> a.createdAt - b.createdAt)[0]`, i.e. whichever player profile was created
first on the device — and every challenge's progress is computed against
that one player's matches only (line 51: `matches.filter((m) =>
isSameDay(m.date, today) && m.results[primaryPlayer.id])`). `ChallengesScreen.tsx`
has no player picker anywhere (confirmed reading the full file: `tab` state
only toggles Solo/With Friends, there is no player-select UI at all) and no
way to view or track a second profile's daily progress — on a shared-device
app that explicitly supports multiple player profiles and guests
(`GameSetupScreen`'s multi-select), the second, third, etc. player created on
that device can never see their own daily-challenge progress; the feature is
silently and permanently attributed to whoever happened to be created first.
This is the exact same shape of bug Round 2's proposal #3 found in
`CheckoutTrainerStorage` (a single-key, not-per-player stat on a
multi-profile app) — that one was fixed this cycle
(`getBest(playerId)`/`setBest(playerId, best)` + a `PlayerFilterChips`
picker on `CheckoutTrainerScreen.tsx`, per `head-log.md`'s "Both landed,
verified, Stage 3 dispatched" entry) using exactly the pattern this screen
now needs. Confirmed via grep that `primaryPlayer`/"primary player" appears
in exactly 3 files: `LeaderboardScreen.tsx` (cosmetic "YOU" badge only, not
a functional gate — fine as-is), `src/utils/overview.ts` (HomeScreen's own
stat widget, intentionally "the device owner's own headline stats" — also
fine), and `challengeProgress.ts` (the one place this pattern actually
blocks a feature rather than just labeling a stat).
**Scope:** `ChallengesScreen.tsx` adds a `PlayerFilterChips` single-select
(same component `CheckoutTrainerScreen.tsx`/`AchievementsScreen.tsx`/
`StatsTrendsScreen.tsx` already use — no new component needed) shown when
2+ players exist; `computeDailyChallengeReport(playerId?: string)` in
`challengeProgress.ts` takes the selected player id instead of always
deriving `primaryPlayer` internally (small signature change, same shape as
the CheckoutTrainer fix's `getBest(playerId)`). Zero-player case keeps the
existing `EmptyState`-style copy already on the screen. Owner: **Logic/
Systems** for the `challengeProgress.ts` signature change (trivial — it's a
pure function, no persisted data touched), **UI/Design** for wiring
`PlayerFilterChips` into `ChallengesScreen.tsx`, following the exact
CheckoutTrainer precedent (a real template to copy, not a from-scratch
design decision this time).
**Size:** Small — the storage/computation side needs no migration at all
(daily-challenge progress is derived fresh from `MatchRecord[]` every time,
unlike `CheckoutTrainerStorage`'s persisted best-streak, so there's no
"old global key" fallback concern here; this is strictly easier than the
CheckoutTrainer fix was).
**Risk:** None — no persisted-shape change (challenge progress was never
stored, only computed on the fly), no `src/logic/` game-rule change, pure
function-signature + UI wiring following an already-proven pattern.

---

## Found but not proposed: `CameraScoringScreen.tsx`'s `DEBUG_SAVE_FRAMES`
is hardcoded `true` in every build

**What/why:** Per the task brief, `CameraScoringScreen.tsx` internals are
explicitly off-limits, so this is flagged for Head Agent awareness only, not
proposed as buildable work. Reading the file's header (lines 20-24):
`const DEBUG_SAVE_FRAMES = true;` with a comment reading "when true, every
frame sent to the Vision API is also saved to a 'DartMasters Debug' photo
album" — this is not gated behind `__DEV__` or any environment check
anywhere in the file, meaning every real user's camera-scoring session
currently saves every analyzed dartboard frame into a permanent photo
album on their device, in production, indefinitely. This reads as a
debug flag accidentally left on rather than an intentional vision-logic
design choice, and it has a real user-facing consequence (silent photo
library writes, `MediaLibrary` permission consumption, storage growth) that
falls slightly outside "camera/vision logic" in spirit — it's an on/off
switch, not a detection-algorithm change. Not proposing it as a scoped
build item since the file is explicitly hands-off per both `CLAUDE.md` and
this task's own instructions; surfacing it here so the Head Agent can decide
whether a one-line `__DEV__`-gate is worth an explicit, narrow exception to
that rule (this is a judgment call for a human/Head Agent to make, not
something to route around by proposing it as if it were in-scope).

---

## Areas checked, nothing proposed

- **`shanghai.ts`, `aroundTheClock.ts`, `halveIt.ts`, `bobs27.ts`,
  `killer.ts`, `cricket.ts`, `x01.ts`** — all six read cleanly on a fresh
  trace. Specific things checked and confirmed correct, not just skimmed:
  Bob's 27's `applyBobs27Round`/its screen's "HIT DOUBLE"-only button
  matches the app's own documented doubles-only rule in `data/rules.ts`
  (not a bug — a `hits: number` param that looked suspiciously
  multiplier-blind at first read turned out to be exactly right once cross-
  checked against the rule text and the screen's actual button labels);
  Cricket's `getCricketWinner` closing-condition (`score >= maxScore`
  against all players, not just closed ones) matches real Cricket rules;
  Killer's `applyKillerThrow` self-hit/opponent-hit branching and
  `getKillerWinner`'s last-survivor check are both sound; ATC's bull-phase
  handling (`targetIndex >= BULL_INDEX`) correctly blocks skip-ahead past
  the final target; X01's `evaluateDart` bust/checkout/gated-dart branches
  all read correctly against out-mode/in-mode combinations.
- **`trends.ts`, `headToHead.ts`, `search.ts`, `dailyChallenges.ts`'s
  challenge *definitions*** — all read cleanly; spot-checked several
  challenge `progress()` functions against the actual `MatchRecord` fields
  they reference (`missCount`, `outscoredEveryRound`, `doublesHit`) to
  confirm those fields are genuinely populated somewhere in a game screen
  rather than being dead reads — all three checked are populated correctly
  (`AroundTheClockGameScreen.tsx` line 117, `X01GameScreen.tsx` lines
  187-188). `headToHead.ts`'s current-streak walk and `trends.ts`'s
  first-half/second-half direction heuristic are both simple and correct
  for what they claim to be (not over-claiming precision).
- **`LeaderboardScreen.tsx`** — read fresh, no gaps found. Its own use of
  "primary player" is cosmetic only (a "YOU" badge), not a functional gate,
  so it's unaffected by item #2 above.
- **`CameraScoringScreen`'s navigation integration** (route params, not
  internals): `CameraScoring: { onConfirm: (darts: Dart[]) => void }` passes
  a function through a React Navigation route param, which is technically
  outside React Navigation's serializable-params convention. Investigated
  whether this is a live risk: `RootNavigator.tsx` has no `onStateChange`/
  `initialState` navigation-persistence wiring at all (confirmed by reading
  the full file), so nothing in this app ever attempts to serialize or
  restore navigation state — the non-serializable param is inert in
  practice, not a real bug. Not proposing a change.
- **Killer risk affordance** — not re-examined this round; nothing new
  since Round 2's reassessment, no reason to re-litigate a third time
  without new evidence.

---

# Round 4 Report — 2026-07-27

Proposal-only, no application code touched. **Honest headline: this round
found one real, well-evidenced bug and confirmed the rest of the backlog is
genuinely thin.** `src/utils/` (all six modules), the storage layer's
`.then()`/`.catch()` coverage app-wide, and a repo-wide dead-code/type-safety
grep all read clean — see "Areas checked, nothing proposed" below for the
specifics of each. The one finding below is new territory: a concrete
interaction gap between two features that shipped in separate rounds
(bot opponents, added long before this cycle, and the PB/achievement
celebration, shipped in Rounds 1-2) that nobody had reason to cross-check
until this round's prompt explicitly asked "do recently-added features
interact correctly."

## 1. Bot opponents can trigger "NEW BEST"/"UNLOCKED" celebrations for
   themselves — because bots have no stable identity across matches

**What/why:** `GameSetupScreen.tsx` generates a brand-new random id for
every bot every time one is added to a lineup: `id: \`bot-${generateId()}\``
(line 189) — bots are never persisted `Player` records, so this id is
thrown away the moment the match ends; a bot added to five different
matches gets five unrelated ids. `GameSummaryScreen.tsx`'s celebration
wiring (lines 134-139) computes `newPersonalBestsFromMatch(matches,
found.winnerId, found.id)` and `newAchievementsFromMatch(matches,
found.winnerId, found.id)` unconditionally whenever `match.winnerId` is
set — there is no check anywhere in this path for whether the winner is a
bot (confirmed by grep: `isBot`/`botPlayerIds` appear zero times in either
`src/logic/personalBests.ts` or `src/logic/achievements.ts`). Both
functions work purely off `matches.filter((m) => m.results[playerId])`
(`personalBests.ts` line 50, and the equivalent pattern in
`achievements.ts`'s `AchievementContext.matches` construction) — they have
no concept of "is this id a real player," they just diff match history for
whatever id they're handed.
Trace the consequence end to end: a human loses to a bot in 501. `match
.winnerId` is set to that match's one-off `bot-xxxxx` id. `newPersonalBestsFromMatch`
runs `computePersonalBests` twice for that id — once with the full history,
once without this match — and since **no other match in storage has ever
used that exact bot id** (it was generated fresh this match and will never
recur), the "without this match" computation always finds zero prior
qualifying matches. Every stat the bot happened to clear a qualifying
threshold on this one match (e.g. any checkout, any 100+ visit, any
completed leg) reads as "first-ever record" and fires the full ceremony:
green "NEW BEST" cell tint + medal badge + caption on the bot's stat card,
the `haptic.rigid()` accent tick (line 217), and the same treatment for
achievements (an "UNLOCKED · <title>" chip for whatever threshold-crossing
achievement the bot's single-match stats happen to satisfy, e.g. "throw a
180" or "win via double" on the very first bot win that does it). This
isn't a rare edge case — it fires on every winning bot performance that
clears any tracked threshold, which for weaker/mid bots losing occasionally
and stronger bots winning often is a routine occurrence, not a corner case.
Concretely wrong from the user's perspective: the celebration UI reads as
"you/this player just set a personal record," but it's being shown for an
opponent who has no persistent identity and, by construction, can never
*not* look like it just set a record the first time it wins with any
qualifying stat.
**Scope:** The cleanest fix is a guard at the point of use, not a change to
either logic module (both are correct, general-purpose functions — the bug
is that they're being called with a bot's ephemeral id at all, not that
they compute incorrectly). `GameSummaryScreen.tsx`'s two `setNewBests`/
`setNewAchievements` calls (lines 134-139) should short-circuit to `[]`
when the winner is a bot — the match record already carries
`match.botPlayerIds` (populated by `guestIdentityMaps` in
`src/utils/guestMaps.ts`, confirmed it's persisted on every `MatchRecord`),
so the check is a one-line `found?.botPlayerIds?.includes(found.winnerId)`
alongside the existing `found?.winnerId` check — no new data, no signature
change to `personalBests.ts`/`achievements.ts`, no persisted-shape change.
Owner: **Logic/Systems** (it's a guard condition in a `.then()` callback,
not a visual change) — trivial diff, one file.
**Size:** Small — a boolean guard added to two existing conditional
expressions in one file.
**Risk:** None. Purely additive guard condition; doesn't touch
`src/logic/` game-rule modules, doesn't touch persisted `MatchRecord`
shape (reads a field, `botPlayerIds`, that already exists and is already
populated), doesn't change celebration behavior for any human winner.
**Recommendation: build this now.** It's the most concrete, cheapest,
lowest-risk item this round, and it's a genuine correctness bug (a
celebration that reads as personally meaningful firing for a non-persistent
opponent identity) rather than a polish nice-to-have.

---

## Areas checked, nothing proposed

- **`src/utils/` — all six modules read fresh, all clean.** `overview.ts`
  (`computeHomeOverview`'s "primary player = earliest-created" pattern is
  the same one Round 3 already confirmed is intentional/cosmetic
  elsewhere); `playerDisplay.ts` (`resolvePlayerDisplay`/
  `resolvePlayerDisplayFromMatch` both have a sane `FALLBACK` for missing
  ids); `guestMaps.ts` (`guestIdentityMaps` — confirmed correct, and is
  exactly the field the bug above leans on); `id.ts` (trivial, correct);
  `shuffle.ts` (`shuffled`/`randomInsert`, both standard, correct
  Fisher-Yates and correct insert-at-random-index math); `dartAnnouncer.ts`
  already fixed in a prior round, re-read fresh, no new issues.
- **Storage-layer error handling, app-wide (not just game screens).** Ran a
  repo-wide count: 44 `.then(` call sites across 30 files vs. 51 `.catch(`
  call sites across 31 files — every file with a `.then()` has a matching
  `.catch()` in the same file, no orphans found. Spot-checked the two files
  the brief named directly: `src/logic/backup.ts` uses `await` throughout
  with no bare unhandled promise (its export/import entry points are called
  from `BackupRestoreScreen.tsx`, which wraps them); `src/storage/tournament.ts`'s
  `readJson`/`writeJson` helpers — `readJson` already try/catches and falls
  back to the caller-supplied default on any parse/read failure; `writeJson`
  propagates failures up to its caller by design (same pattern as every
  other storage module in `src/storage/`), and every call site that invokes
  it is itself inside a `.then()`/`await` chain with its own `.catch()`.
  No new gap found.
- **Type safety / dead code, repo-wide grep.** Searched all of `src/` for
  `: any`, `@ts-ignore`, `// TODO`, `// FIXME`, and `console.log(` (not
  `console.error`). The only match across the entire tree is
  `CameraScoringScreen.tsx` — already covered by Round 3's escalation
  (`DEBUG_SAVE_FRAMES`) and explicitly off-limits per `CLAUDE.md`. Nothing
  new to propose here; the codebase is unusually clean on this axis for a
  four-round-deep audit cycle.
- **Practice mode / celebration-feature interaction, beyond the bot bug
  above.** `Practice170GameScreen.tsx` does route through
  `GameSummaryScreen` (`navigation.replace('GameSummary', { matchId:
  record.id })`, confirmed at line 186/189) so it already gets the full
  PB/achievement ceremony — no gap there. `CheckoutTrainerScreen.tsx` does
  *not* route through `GameSummaryScreen` at all (confirmed: zero
  `GameSummary`/`navigation.replace` references in the file) and never
  creates a `MatchRecord` — it's a standalone streak-drill, not a "match,"
  so it structurally can't participate in match-based celebrations. This is
  correct as-is, not a gap: `computePersonalBests`/`computeAchievements`
  are both defined purely in terms of `MatchRecord[]` history, and
  Checkout Trainer's per-player best-streak (fixed this cycle, per
  `head-log.md`) is already its own distinct, appropriately-scoped stat.
- **Onboarding / zero-player first-launch state.** Traced `HomeScreen.tsx`,
  `AchievementsScreen.tsx`, `StatsScreen.tsx`, and `GameSetupScreen.tsx`
  fresh with a zero-player lens. All four degrade sensibly: `HomeScreen`'s
  stats band shows honest zeros (0 matches/0%/0 streak) rather than
  misleading placeholders, and the "New Match" CTA is always reachable
  regardless of player count; `AchievementsScreen` shows a proper
  `EmptyState` ("No players yet — Add a player profile to start earning
  badges") gated on `players.length === 0`; `GameSetupScreen`'s "Start"
  button is disabled (`canStart = selectedIds.length >= minPlayers &&
  hasHuman`) until a valid lineup exists, so there's no dead-end path to
  starting a playerless match. No rough edges found specific to the
  empty-app state that a longtime tester's data-rich device would mask —
  this area reads like it already had deliberate attention, not an
  oversight.
- **Killer risk affordance** — not re-examined again this round per the
  brief's explicit instruction not to re-litigate a fourth time without new
  evidence; nothing new surfaced incidentally either.

**Recommendation for Round 5 and beyond:** with `src/utils/`, the storage
layer, and a type-safety/dead-code sweep all now confirmed clean across
four rounds, and only one small bug found this round, the polish/feature
backlog for this app is close to exhausted. Suggest the Head Agent consider
shifting future cycles toward a broader QA/regression sweep (exercising
actual game flows end-to-end rather than static reads, which is a
different failure mode than anything the last four rounds have been
positioned to catch) once the one escalated item (`DEBUG_SAVE_FRAMES`) gets
a human decision, rather than continuing to commission fresh proposal
rounds against an increasingly dry well.

---

# Round 5 Report — 2026-07-27

Proposal-only, no application code touched. Per the brief's own framing —
two consecutive clean sweeps just happened (Roadmap Round 4's honest "little
left" verdict, then a Head-Agent-originated design-consistency audit on the
5 least-visited screens) — this round did not expect much, and mostly
confirmed that expectation: tournament seeding math, `stats.ts`'s per-match
computations, and most of the bot difficulty curve all read correctly on a
fresh trace. But one of the four assigned angles turned up a genuine,
concrete, previously-unexamined **correctness bug**, not just polish — see
#1 below. Ordered by build priority.

## 1. The "Sound effects" Settings toggle does not mute the darts announcer
   — turning it off leaves the announcer calling out every score

**What/why:** `SettingsScreen.tsx`'s only sound-related control is a single
`SwitchRow` labeled **"Sound effects"** (line 116), backed by
`setSoundEnabled(v)` (`src/sound/soundManager.ts`). Read `soundManager.ts`
end to end: `playSound()` (the module's one playback entry point, used for
`dartScored`/`bust`/`checkout`/`win`/`oneEighty`/`killerEliminated`/
`becomeKiller`) correctly gates on the module-level `soundEnabled` flag at
line 96 (`if (!soundEnabled) return;`) — that half works exactly as
labeled. But `src/utils/dartAnnouncer.ts` — the separate module that powers
the "announcer calls out your score" feature wired into `X01GameScreen.tsx`
(`announceScore`/`announceGameOn`/`announceGameShot`, lines 110/229/253/326)
— is a fully independent audio pipeline with **its own preload
(`preloadAnnouncerSounds`), its own playback path (`playClip`), and no
reference anywhere in the file to `soundEnabled` or any other mute flag**.
Confirmed by reading the entire file (323 lines): `announceScore`,
`announceGameOn`, `announceGameShot`, and `playClip` all call
`sound.playAsync()` unconditionally whenever invoked — there is no gate, no
`soundEnabled` import, nothing. Confirmed by repo-wide grep for
`announcerEnabled`/`announcer.*Enabled`/`setAnnouncer`: zero matches
anywhere in `src/`. Concretely: a player who taps "Sound effects" off in
Settings — the app's only audio control, and the one this cycle's own
silent-mode fix (`docs/agent-comms/head-log.md`, "Priority interrupt:
announcer bug + silent-mode requirement") went out of its way to make sure
plays reliably even with the phone's hardware silent switch on — will
still hear a voice calling out "twenty-six," "game shot," etc. on every
visit in X01/Practice170, the two modes the announcer is wired into. This
reads as a real, user-facing bug: the toggle's own label makes no
distinction between "sound effects" and "the announcer voice," and there
is no second toggle anywhere that could plausibly be read as covering it.
This is exactly the kind of interaction gap the brief's performance/asset
angle was aimed at finding (I went in checking whether the 183-clip eager
preload — deliberately batched last cycle to fix a launch freeze — was
wasteful in some way, and while the batching itself is a sound, already-
reasoned tradeoff not worth re-litigating, tracing the actual playback path
end-to-end surfaced this instead).
**Scope:** The cleanest fix mirrors the existing `haptics.ts`/
`motionPreference.ts` pattern already used twice this cycle for exactly
this shape of problem (module-level flag + setter, checked at the one
playback choke point): either (a) export a `isSoundEnabled()` getter from
`soundManager.ts` and have `dartAnnouncer.ts`'s `playClip()` check it before
calling `sound.playAsync()`, or (b) give the announcer its own
`setAnnouncerMuted()`-style flag driven by the same Settings toggle (if the
Head Agent decides the announcer should be independently controllable in a
future cycle — not proposing that scope now, just flagging it as an option).
Option (a) is the smaller, more consistent fix: one new export + one guard
clause in `playClip()`, no new `AppSettings` field, no new UI. Owner:
**Logic/Systems** — a guard condition + one export, not a visual change.
**Size:** Small — two files, no persisted-shape change (reuses the
existing `soundEnabled` runtime flag, doesn't add a new settings key).
**Risk:** None. Purely additive (`isSoundEnabled()` export) plus a guard
clause at the top of an existing function; doesn't touch `src/logic/`
game-rule modules, doesn't change the preload path (clips still load the
same way — only playback is gated), doesn't affect the silent-mode fix
(`playsInSilentModeIOS` stays exactly as configured; this is a separate
concern from whether iOS mutes the app, it's whether the *user* asked the
app to be quiet).
**Recommendation: build this now.** It's the most concrete finding this
round — a genuine correctness bug in the app's one and only audio control,
not a nice-to-have, and it directly involves a feature (the announcer) that
got significant, careful attention just last cycle for a different bug in
the same file.

---

## 2. `CareerStats.avgFirstNine` is computed but displayed nowhere

**What/why:** Per the brief's ask to re-read `stats.ts` fresh rather than
only incidentally: `aggregateCareerStats()` (`src/logic/stats.ts` line 90)
computes `avgFirstNine` correctly — a darts-standard stat (average of the
first three visits/nine darts of each match, isolating "how hard you throw
before checkout mode kicks in," distinct from the overall `avgThreeDart`)
via a proper weighted average across matches (line 136). But a repo-wide
grep for `avgFirstNine` turns up exactly 3 hits, all inside `stats.ts`
itself (the field declaration, its zero-init, and the one line that sets
it) — **zero consumers anywhere else in the codebase.**
`PlayerProfileScreen.tsx` (the only screen that calls
`aggregateCareerStats`) already displays `career.avgThreeDart`'s per-match
analog (`firstNineAvg`) is shown once, per-match, on `GameSummaryScreen.tsx`
("First 9", line 380) — so the number matters enough to celebrate right
after a match, but the career-level rollup of that same stat, sitting right
next to `career.checkoutPercent`/`career.count140Plus`/`career.winRate` in
the exact same `CareerStats` object those `StatPill`s already read from, is
simply never read. This is a clean, low-risk surfacing gap in the same
family as Round 1's already-shipped "surface `computePersonalBests` outside
PlayerProfile" proposal — no new computation, no logic change, purely a
missing `StatPill`.
**Scope:** Add one `StatPill label="First 9 Avg" value={career.avgFirstNine.toFixed(1)}`
(or similar) to `PlayerProfileScreen.tsx`'s existing career-stats grid,
alongside `avgThreeDart`/`checkoutPercent`. Owner: **UI/Design** — read-only
consumption of an existing, already-correct pure function; no `src/logic/`
change needed at all.
**Size:** Small — one file, one new `StatPill`.
**Risk:** None — purely additive UI reading an existing computed field.

---

## 3. Deleting a player mid-tournament silently orphans their bracket slot
   into an anonymous, indistinguishable "Player" — the specific
   cross-cutting interaction the brief asked to trace

**What/why:** Traced the exact interaction the brief named: what happens
to an in-progress tournament bracket if a player seeded into it is deleted
via `PlayerEditScreen.tsx`'s "DELETE PLAYER" button. `PlayerEditScreen.tsx`'s
`remove()` (lines 113-127) calls `PlayerStorage.remove(editingId)`
unconditionally — confirmed by reading `PlayerStorage.remove` in
`src/storage/storage.ts` (lines 47-57 region): it's a flat filter-and-write
against `AsyncStorage`'s players list, with **no check against
`TournamentStorage`, `ActiveMatchStorage`, or anything else** — the
confirmation dialog's own copy ("Remove {name}? Match history will be
kept.") only reassures about match history, saying nothing about
tournaments, because the code genuinely doesn't check.
Traced what happens next: `TournamentBracketScreen.tsx`'s `playMatchup()`
(lines 56-70) reads `matchup.playerAId`/`playerBId` straight out of the
persisted `Tournament` object and passes them into `GameConfig.playerIds`
with no existence check, then `navigation.navigate('Game', { config, ... })`.
Downstream, `X01GameScreen.tsx` (and every other game screen) builds its
entire `MatchState.players` array directly from `config.playerIds` (line
60) — it never looks the ids up in `PlayerStorage` to validate they exist,
so **the match itself doesn't crash or get blocked**; it plays through
completely normally. The only place a missing player matters is display:
`resolvePlayerDisplay()`/`resolvePlayerDisplayFromMatch()`
(`src/utils/playerDisplay.ts`) both fall through to a hardcoded
`FALLBACK: PlayerDisplay = { name: 'Player', color: colors.primary }`
(line 11) when the id isn't found in the players map and isn't a guest
either. So the concrete end-to-end outcome: start a 4+ player tournament,
delete one seeded player from `PlayersListScreen`/`PlayerEditScreen` before
their bracket match is played, and when that matchup comes up the
scoreboard, `GameSummaryScreen`, and `MatchDetailScreen` all show a plain,
generic **"Player"** for that slot — indistinguishable from any other
deleted player if more than one happens to be in the same bracket, with
zero warning at delete time and zero indication at match time that
anything is unusual (no "this player no longer exists" messaging, just a
name that happens to read as a placeholder). The match completes normally
and reports back into the bracket correctly (since `recordMatchResult`
only needs the id, not a live player record), so there's no data
corruption — this is a pure identity/display gap, not a crash risk, but a
real one: playing (or spectating) a tournament match against a fully
anonymous, unlabeled opponent reads as broken, and the deletion flow gives
no hint this is about to happen.
**Scope:** Two independent, additive options, either alone is a real
improvement (doing both is not required):
(a) **Warn at delete time** — `PlayerEditScreen.tsx`'s `remove()` checks
`TournamentStorage.getAll()` for any `status !== 'completed'` tournament
whose `rounds[].matchups[]` reference `editingId` in `playerAId`/`playerBId`
and not yet decided (`!winnerId`), and if found, adds a line to the existing
`Alert.alert` confirmation copy naming the in-progress tournament(s) so the
user makes an informed choice rather than being surprised later. No
blocking needed — this is a heads-up, not a hard stop (the player may
legitimately want to delete them and accept the tournament plays out with a
placeholder name, e.g. a one-off guest who's since been removed).
(b) **Better fallback identity** — give `FALLBACK` in `playerDisplay.ts` a
slightly more honest label than a bare "Player" when it's specifically a
tournament-bracket lookup miss (e.g. "Deleted Player") so it at least reads
as intentional rather than as a bug, and so two different deleted players
in the same bracket aren't visually identical. Smaller, standalone change,
independent of (a).
Owner: **Logic/Systems** for (a) (a read-only cross-storage check + a
string appended to existing alert copy, no schema change), **UI/Design** or
**Logic/Systems** for (b) (a one-line string change to an existing
constant/fallback).
**Size:** Small for either half; both together still small — no persisted-
shape change, no `src/logic/` game-rule change (bracket propagation/
`recordMatchResult` itself is untouched either way).
**Risk:** None. (a) only reads additional storage before showing an
existing confirmation dialog; (b) only changes a display-string constant
already designed to be a graceful fallback. Neither touches
`AsyncStorage` shapes or game-rule modules.

---

## Areas checked, nothing proposed

- **`src/logic/tournament.ts` — full fresh trace of `createBracket`,
  `seedOrder`, `propagate`, `recordMatchResult`.** Odd player counts:
  `nextPowerOfTwo`/`seedOrder` correctly spread byes across round-0 so a bye
  is never paired against another bye (traced a 5-player and a 6-player
  case by hand against the seed-order recursion — both produce the expected
  bye distribution). Single-player tournaments are correctly rejected
  (`createBracket` throws `'A tournament needs at least 2 players'` for
  `playerIds.length < 2`) — confirmed `TournamentSetupScreen.tsx` also
  independently gates its own "Start" button on 2+ selected players, so the
  throw path is a defensive backstop, not a reachable crash. Re-seeding
  after mid-tournament removal doesn't exist as a concept anywhere in the
  code (the bracket is generated once at creation and never regenerated) —
  see item #3 above for what actually happens instead, which is a display
  gap rather than a missing re-seed feature; re-seeding a live bracket
  mid-tournament would itself be a much bigger, riskier feature (renumbering
  already-decided matchups) not worth proposing speculatively.
  `recordMatchResult`'s defensive guards (winner-must-be-in-matchup,
  can't-redecide-a-different-match) were already confirmed correct in
  Round 2 — re-confirmed still in place and untouched.
- **`src/logic/stats.ts` — every other field besides `avgFirstNine`.**
  `computeX01PlayerResult`'s `doublesHit` field is computed but its only
  consumer is `dailyChallenges.ts` (challenge progress tracking) — its own
  type comment says "for challenge tracking," so this is intentional, not a
  gap. `legsPlayed`'s only consumer is two `achievements.ts` threshold
  definitions — also intentional (a derived stat that exists specifically
  to power an achievement, not meant for a standalone display). Every other
  `CareerStats` field (`winRate`, `checkoutPercent`, `highestCheckout`,
  `highestVisit`, `oneEighties`, `count100Plus`, `count140Plus`,
  `bestLegDarts`, `bestThreeDartAvg`) is displayed somewhere in
  `PlayerProfileScreen.tsx`/`GameSummaryScreen.tsx`. `computeWinStreak` and
  `countOpponentLegs` both read correctly on a fresh trace.
- **Sound/asset loading, beyond the announcer-toggle bug above.**
  `soundManager.ts`'s 7 SFX files are small, correctly cached after first
  load (`loadSound`'s `cache` check), and volume-balanced — no waste found
  there. `dartAnnouncer.ts`'s 183-clip eager preload at launch (regardless
  of whether the user ever plays X01/Practice170, the only two modes wired
  to it) is a real, non-trivial resident-memory footprint held for the
  app's entire lifetime, but this is a deliberate, already-reasoned
  tradeoff from last cycle's freeze-fix work (`PRELOAD_BATCH_SIZE = 8`,
  extensively commented in the file explaining exactly why full-serial and
  full-concurrent preload both failed) — not re-proposing a change to it
  without a concrete new problem, since "preload everything so first-use
  has zero latency" is a reasonable, explicit design choice for a small
  (audio-only) asset set, not an oversight. No redundant re-fetch-on-focus
  patterns found beyond the expected, correct kind (screens re-reading
  `PlayerStorage`/`MatchStorage` on focus so lists reflect changes made
  elsewhere — every one of the 18 files using `useFocusEffect` is doing
  exactly that, not duplicating work already done).
- **`src/logic/bot.ts` — fresh read across every mode it plays.** X01's
  `decideX01Dart` is the most sophisticated (real checkout-table lookups,
  separate double-vs-non-double success chance, a documented straight-out
  special case for the F9 fix). Cricket/ATC/Killer/Shanghai/HalveIt's
  decision functions all follow the same shape (a `hitChance` scaled off
  `profile.skill`, then a multiplier roll scaled off skill again) — none
  reads as structurally weaker or simplistic relative to the others; the
  different exact formulas per mode are appropriate to each mode's
  different mechanics (e.g. Killer's target-selection logic sensibly biases
  stronger bots toward the lowest-life opponent via `chance(profile.skill)`,
  while ATC/Shanghai have no "target selection" concept at all since
  there's only one target per turn). `decideKillerClaim` (picking which
  number becomes a bot's own Killer number) is uniform-random regardless of
  difficulty — confirmed this is correct, not an oversight: claiming your
  assigned number in real Killer isn't a skill-based decision, there's
  nothing to bias. Confirmed `Bobs27` has no bot decision function in
  `bot.ts` at all — checked `GameSetupScreen.tsx` and found this is by
  design (`BOT_UNSUPPORTED_MODES: GameConfig['gameType'][] = ['practice170',
  'bobs27']`, line 40), so there's no gap to fill, not a missing mode.
  `avgTarget` on `BotProfile` is display-only (shown as "~N avg" on the
  difficulty picker in `GameSetupScreen.tsx`) and isn't wired into any
  decision function's actual math — worth noting as a minor, low-value
  observation (the label is an approximation, not a verified guarantee of
  what each difficulty actually averages), but not proposing a fix since
  re-tuning five bot profiles' underlying `skill`/`doubleAccuracy` numbers
  to hit an exact target average is speculative busywork without a report
  of the bots actually feeling miscalibrated in play.
- **Minor naming-only observation, not a bug:** `src/theme/index.ts`
  aliases `neonGreen`/`neonCyan`/`neonRed` to `COLORS.positive`/
  `COLORS.textSub`/`COLORS.bust` (lines 27-29) — the values themselves are
  already correct, on-palette, non-neon colors (confirmed by reading the
  actual hex/token chain), so this is not a design-system violation and
  nothing renders incorrectly. It's leftover naming debt from what was
  presumably an earlier, differently-themed version of the app, and it's
  the kind of thing a hex/neon grep for *values* (which every prior round's
  design audits have correctly run) will never catch, since the token
  *names* say "neon" while the *values* don't. Flagging only because it's
  genuinely new territory (no prior round looked at token names, only
  values), not proposing a rename — purely cosmetic to source readability,
  zero user-facing effect, and touches `theme/index.ts` plus every call
  site using these three aliases for a rename with no functional benefit.

---

**Bottom line for this round:** one real, well-evidenced, build-now bug
(#1, the announcer/sound-toggle mismatch — genuinely new territory, not a
re-hash), one small clean surfacing gap (#2), and one real but lower-
severity UX/identity gap in a cross-cutting interaction the brief
specifically asked to trace (#3). This is *not* "nothing found" — but it's
also thinner than Rounds 1-3, consistent with the two clean sweeps just
before it. **Recommendation: build #1 now** (it's a genuine correctness bug
a real user would notice and be confused by), take #2 and #3 as small
follow-ups whenever convenient, and after this round, it's reasonable for
the Head Agent to treat the *proactive* improvement phase of this cycle as
substantially wound down — future proposal rounds are likely to keep
finding smaller and smaller things (as this one did relative to the last),
so weighting future sessions toward direct user requests, the still-open
`DEBUG_SAVE_FRAMES` decision, or an occasional broad QA/regression sweep
(per Round 4's own recommendation, which this round's findings don't
contradict) is a reasonable way to spend future cycles rather than
commissioning a sixth static-read pass by default.
