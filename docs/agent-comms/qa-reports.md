# QA/Integration Agent — reports

## Round: Reduce Motion collab + announcer fix + backup field + UI work + regression sweep

`npx tsc --noEmit` — clean (no output) at both the start and end of this pass.

### 1. Reduce Motion feature — PASS

- **Default off, additive:** `src/storage/storage.ts:17,29` —
  `reducedMotionEnabled: boolean` in `AppSettings`, `false` in
  `DEFAULT_SETTINGS`. `SettingsStorage.get()` (line 102-104) merges
  `{...DEFAULT_SETTINGS, ...stored}`, so pre-existing persisted blobs get
  `false` automatically. `src/theme/motionPreference.ts` module-level flag
  also defaults `false`. Confirmed no behavior change until a user opts in.
- **Flag actually gates, traced not just called:**
  - `Confetti.tsx:46-70` — `reduced` computed once, both the `pieces` memo
    guard and the render `if (!active || reduced) return null` check the
    same const; no path renders pieces without also being gated.
  - `ScreenFlash.tsx:21` — the whole `withSequence` wash is skipped inside
    an `if (trigger && !isReducedMotionEnabled())`.
  - `useShake.ts:10` — `trigger()` returns before building the sequence.
  - `MountReveal.tsx:33-36` — `effectiveDelay/Duration/Distance` all
    collapse (delay 0, duration capped 120ms, distance 0) when reduced;
    mechanism (core RN `Animated.timing`) unchanged, satisfying the
    launch-safety hard rule in CLAUDE.md.
  - `EventStinger.tsx:44-61` — fast-forwarded not skipped as claimed: hold
    900→350ms, scale starts at 1 instead of a 2.4x overshoot, fade
    durations shortened. Still renders the event text either way — no
    information lost. (Minor: the effect assigns `scale.value` twice in a
    row — the `reduced ? 1 : 2.4` immediate assignment on line 46 is
    immediately clobbered by the `withSequence` assignment on lines
    56-61. Dead code, not a bug — the second assignment wins in both
    branches — not worth a fix-commit for a functionally inert line.)
  - `EmptyState.tsx:31-40` — title/subtitle/action cascade delays route
    through `reducedMs()`.
  - `GameSummaryScreen.tsx:130-135,153-190,322-325` — `R` object built
    from `reducedMs()` once per render; `PulseRing` (line 336-368)
    fully no-ops (`if (reduced) return null` at both the effect and the
    render) under reduced motion; `CountUp` calls keep counting
    (duration collapses to 150ms, not 0) so the actual stat value is
    still visibly delivered, never hidden.
- **Nothing that conveys game state was silenced:** confirmed
  `CricketMark`/`LifeDots`/per-throw `entering=` in
  `X01GameScreen.tsx`/`CricketGameScreen.tsx`/`GameHud.tsx`/`DartSlots.tsx`/
  `BotThinkingBadge.tsx` were left ungated, as claimed — grepped these
  files for `isReducedMotionEnabled`/`reducedMs`, zero hits, confirming no
  accidental gating crept in.
- **Settings toggle wired end to end:** `SettingsScreen.tsx:17,53,125-129`
  — `SwitchRow` bound to `settings.reducedMotionEnabled`, `update()` calls
  `setReducedMotionEnabled(patch.reducedMotionEnabled)` when the key is
  present, mirroring the sound/haptics pattern exactly. `App.tsx:43` calls
  `setReducedMotionEnabled(s.reducedMotionEnabled)` in the launch effect
  alongside sound/haptics init.
- **Mechanically-migrated screens spot-checked** (`git show a322a76`):
  `ChallengesScreen.tsx`, `KillerGameScreen.tsx`, `ShanghaiGameScreen.tsx`
  — all three are faithful 1:1 swaps (`i * STAGGER_MS` → `staggerDelay(i)`,
  fixed section delays → `reducedMs(...)`), no off-by-one or altered
  multiplier found in any of the three diffs.
- **Known, already-flagged gap (not a new finding):** `StatsScreen.tsx`,
  `StatsTrendsScreen.tsx`, `AchievementsScreen.tsx`, `HeadToHeadScreen.tsx`,
  `SettingsScreen.tsx` still have raw `i * STAGGER_MS` (confirmed at
  `StatsTrendsScreen.tsx:90`) — correctly out of scope this cycle per the
  head log, queued as a future follow-up. Not blocking.
- **Sheet.tsx / Header.tsx** — confirmed ungated as reported: `Sheet.tsx`
  still uses a bare `SlideInDown.springify()...` (on-demand modal, not a
  passive cascade), `Header.tsx` still a single non-cascading
  `FadeInDown.duration(280)`. Judgment call, not a bug — agree with the
  reasoning, no action taken.

### 2. Dart announcer fix — PASS

- `App.tsx:39-53` — `SettingsStorage.get().then(...)` runs independently
  of `configureAudioMode().then(() => { preloadSounds(); preloadAnnouncerSounds(); })`;
  the audio-mode call is awaited before either preload call, as required.
- **Single call site verified:** `grep -rn "setAudioModeAsync"` across the
  whole repo (excluding `.claude/worktrees/`, which are stale untracked
  worktree copies from earlier sessions, not part of the app) returns
  exactly one call: `src/sound/soundManager.ts:17` inside
  `configureAudioMode()`. `playsInSilentModeIOS: true` is present there
  (line 18). No leftover second call site in `dartAnnouncer.ts` or
  `App.tsx` — both were confirmed to have had theirs removed.
- **Per-clip error isolation preserved:** `dartAnnouncer.ts:236-245` — the
  `Promise.all` batch maps each clip through its own `try/catch` that
  `console.error`s and continues; a failed clip doesn't reject the
  `Promise.all` for its batch (caught inside the mapped async fn, not
  outside it) and doesn't block subsequent batches.
- **X01GameScreen.tsx untouched by the other cycle's changes, and no
  interference:** `announceGameOn`/`announceScore`/`cancelAnnouncements`/
  `announceGameShot` call sites (lines 110, 229, 252-253, 326) are exactly
  where the Logic Agent's own report says they were left; grepped the same
  file for `staggerDelay`/`reducedMs`/`STAGGER_MS` — zero hits, confirming
  Animation Agent's reduce-motion gating didn't touch this file at all
  (X01GameScreen wasn't in its migration list), so there's no shared-file
  interaction to worry about here.

### 3. Backup staleness field — PASS

- `src/storage/storage.ts:17-19,29-30` — `lastBackupAt: number | null`,
  default `null`, additive, same pattern as `reducedMotionEnabled`. No
  migration risk.
- `BackupRestoreScreen.tsx:35-36` — write site exactly as reported,
  inside the existing try block after `Share.share` resolves.
- **Confirmed genuinely dormant:** `grep -rn "lastBackupAt" src/` (outside
  the two files above) returns nothing — no half-built display code, no
  broken read site anywhere. Safe to leave for a future UI task.

### 4. UI work — PASS

- **`PlayerPairChips.tsx` / `HeadToHeadScreen.tsx` behavior parity —
  verified by reading the actual state logic, not the component:** the
  ordering/selection logic lives in `HeadToHeadScreen.tsx:48-54`
  (`togglePick`), not in the (purely presentational) chip component:
  ```
  if (prev.includes(id)) return prev.filter((x) => x !== id);   // re-tap deselects
  if (prev.length >= MAX_PICKED) return [prev[1], id];           // 3rd tap: evict oldest (prev[0]), shift prev[1] into slot A
  return [...prev, id];                                          // fills next open slot in order
  ```
  This is correct oldest-out eviction and matches the claimed parity.
  `PlayerPairChips.tsx` itself just renders `orderIndex = pickedIds.indexOf(p.id)` as the slot badge — correctly derived, not independently stateful.
- **`StatsTrendsScreen.tsx` records section guard — verified safe for a
  player with no personal bests:** guard at line 83
  (`personalBests.some((pb) => pb.value !== null)`) only renders the strip
  if at least one record qualifies, but the `.map` beneath it (line 87-95)
  still renders every record including null-valued ones. Verified this
  can't render garbage: `src/logic/personalBests.ts`'s `record()` helper
  always produces `formatted: '—'` for any null-value record (checked all
  six: highestCheckout, bestThreeDartAvg, most180sInMatch, bestLegDarts,
  bestVisit, longestWinStreak — every one has an explicit `'—'` fallback
  string). So a player with exactly one qualifying record shows the strip
  with that one real value and up to five "—" placeholder pills, not a
  crash or blank/undefined text.
- **`SearchScreen.tsx`'s `EmptyState` `fill` prop — no regression to other
  call sites:** grepped every `<EmptyState` usage in `src/` (11 call sites
  across Achievements/HeadToHead/Leaderboard/Search/Stats/PlayersList/
  PlayerProfile/StatsTrends). Only `SearchScreen.tsx:78` passes `fill`
  explicitly (`fill={suggestedPlayers.length === 0}`); every other site
  passes no `fill` prop at all, and `EmptyState.tsx:24`'s default
  (`fill = true`) preserves their original always-`flex:1`-centered
  behavior exactly. No breakage.

### 5. General regression sweep — PASS

- Spot-checked `git show a322a76` for `ChallengesScreen.tsx`,
  `KillerGameScreen.tsx`, `ShanghaiGameScreen.tsx` (see section 1) — all
  three are faithful mechanical swaps, no stagger-math drift found in the
  sample.
- `npx tsc --noEmit` clean before and after this review (no fixes were
  needed, so no re-run was required, but confirmed at session end anyway).

## Fixed directly

Nothing needed fixing — no commits made this round. Everything reviewed
traced correctly against its own report and against the actual code, not
taken on faith.

## Flagged, not actioned (judgment calls, not bugs)

1. **`EventStinger.tsx`'s double `scale.value` assignment** (lines
   44-46/56-61 area) — the reduced-motion branch briefly assigns
   `scale.value = 1` and then immediately overwrites it with a
   `withSequence(...)` that also starts at 1. Functionally inert
   (the second assignment always wins, in both the reduced and
   non-reduced branch), so not a real bug — flagging only as a minor
   cleanup candidate for whichever agent next touches this file, not
   worth a standalone commit.
2. **Stale `.claude/worktrees/` directory** (untracked, shows in
   `git status`) — contains ~12 old agent worktree copies of the repo
   from prior sessions, including pre-fix versions of `App.tsx`/
   `dartAnnouncer.ts` that still have the old dual
   `Audio.setAudioModeAsync()` calls. This is not part of the shipped app
   (untracked, outside the real source tree) and had zero effect on any
   verification above, but it does pollute repo-wide greps for anyone
   auditing this codebase later and should probably be cleaned up by
   whoever owns repo hygiene — flagging for the Head Agent rather than
   deleting it myself (destructive, and ownership/intent of those
   worktrees wasn't part of my brief).
3. **The five screens still on raw `i * STAGGER_MS`** (Stats,
   StatsTrends, Achievements, HeadToHead, Settings) — already correctly
   queued as a follow-up per the head log; re-confirming it's real and
   still open, not re-flagging as new.

## Overall verdict: SHIP AS-IS

All five review areas pass with direct evidence from the code, not just
from agent self-reports. `npx tsc --noEmit` is clean. No regressions
found; the one dead-code line in `EventStinger.tsx` and the stale
worktrees directory are the only items worth a human's attention, and
neither blocks shipping this cycle's work.

## Round: Personal-best celebration collab (Logic + UI + Animation, 3-stage)

`npx tsc --noEmit` — clean (no output) before and after this pass. No
fixes were needed; every area below passed on direct code inspection.

### 1. `src/logic/personalBests.ts` — PASS

- **Additive, existing call sites untouched:**
  `src/screens/PlayerProfileScreen.tsx:117` —
  `computePersonalBests(matches, playerId)`, unchanged signature/return.
  `src/screens/StatsTrendsScreen.tsx:55` — same. `newPersonalBestsFromMatch`
  (lines 198-231) is a new export only; `computePersonalBests` itself
  (lines 85-166) has no diff markers touching its math or return shape.
- **Tie handling traced, not just read:** `newPersonalBestsFromMatch`
  (lines 203-230) runs `computePersonalBests` twice — `withMatch` on the
  full array, `withoutMatch` on `matches.filter(m => m.id !== thisMatchId)`
  (line 204-207). Loop at 211: skips any category where
  `withRec.matchId !== thisMatchId` (line 213) — this is the mechanism
  that excludes ties for free, since `computePersonalBests`'s internal
  accumulation (lines 97, 100, 103, 106, 109 — all strict `>`/`<`, never
  `>=`/`<=`) only ever reassigns `matchId` on strict improvement. Confirmed
  by reading the accumulation loop itself (lines 95-112), not just trusting
  the writeup: a match tying the existing best value fails the strict
  comparison, so the earlier match keeps the `matchId`, and the tying
  match is filtered out at line 213 before the improvement check even
  runs. Second guard (`beforeRec === null || beforeRec.value === null`,
  line 217) correctly treats "first-ever qualifying record" as newly-set
  without needing a numeric comparison.
- **`bestLegDarts` direction correct in both places:** accumulation
  (line 106): `r.bestLegDarts < bestLegDarts.value` — lower wins, matches
  "fewest darts" semantics. Diffing (lines 171, 223-225):
  `LOWER_IS_BETTER = ['bestLegDarts']`, and `improved` is computed as
  `withRec.value < beforeRec.value` for that id vs `>` for every other
  category — correct direction, not inverted.

### 2. `src/screens/GameSummaryScreen.tsx` wiring — PASS

- **Winner-only:** line 128,
  `found?.winnerId ? newPersonalBestsFromMatch(matches, found.winnerId, found.id) : []`.
  Per-card gating at line 283/287: `isWinner = id === match.winnerId`;
  `newBestCellLabels` is `null` for non-winners (line 287-289), and
  `extraNewBests` is `[]` for non-winners (line 290-292) — losers cannot
  render a badge or chip regardless of `newBests` contents.
- **Draw safety:** `found?.winnerId` is falsy for a draw (`winnerId: null`
  per existing F12 tie handling, confirmed via `types/index.ts:239,262`
  `winnerId?: string | null`) → `newBests` set to `[]`, no call into the
  logic function at all. No crash path.
- **X01-only leak check:** the four cell-mapped categories
  (`highestCheckout`/`bestThreeDartAvg`/`most180sInMatch`/`bestLegDarts`)
  only ever get passed as `newBest=` inside the `{isX01 && (...)}` block
  (lines 329-349); the Cricket branch (350-357) and the catch-all branch
  (358-365) never pass a `newBest` prop at all, so those `RevealStat`
  calls always default to `undefined`/falsy regardless of `newBests`
  content — can't leak visually even if the data were somehow present.
  Additionally verified the data itself can't leak: `computePersonalBests`
  only assigns a `matchId` for these four categories from `x01Matches`
  (line 87, 95), so a non-X01 match's id could never equal `thisMatchId`
  for those categories in the first place — belt and suspenders.
- **Standalone chips (`bestVisit`/`longestWinStreak`):** `extraNewBests`
  (lines 290-292, rendered 309-327) is **not** gated by `isX01`, matching
  spec ("regardless of game type"). Checked this can't produce a false
  positive on a non-X01 summary: `bestVisit` is only ever attributed a
  `matchId` from `x01Matches` (same reasoning as above), so it can only
  appear when the match being summarized is itself X01 — consistent with
  the collab doc. `longestWinStreak` is genuinely game-type-agnostic by
  design and correctly unconditional.
- **Empty-array no-op:** with `newBests = []`, `newBestCellLabels` for the
  winner becomes `new Set()` (not `null` — only losers get `null`), so
  `.has(...)` calls return `false` rather than `undefined`. This is a
  minor inaccuracy versus the collab doc's claim of literally
  `newBest={undefined}` for the winner's cells in the common case, but
  `!!false === !!undefined === false` inside `RevealStat`'s
  `isNewBest = !!newBest && value !== null` (line 436), so output is
  byte-for-byte identical either way — not a real bug, just an imprecise
  writeup. `extraNewBests` is `[]` → the `{extraNewBests.length > 0 && ...}`
  block (line 309) renders nothing, no stray `View`. Confirmed no console
  errors possible from an empty `.map()` (line 311) — no-op by definition.

### 3. Reduced-motion timing — PASS

- `reducedMs` (`src/theme/motion.ts:43-45`) is exactly
  `isReducedMotionEnabled() ? 0 : ms` — confirmed by reading the
  implementation, not assuming.
- Badge pop delay: `newBestPopDelay = delay + R.newBestPop` where
  `R.newBestPop = reducedMs(REVEAL.newBestPop)` (line 216). With motion on:
  winner is always `cardIndex 0` (line 225-227 sorts winner first), so
  `delay = R.stats + 0 * R.statStep = R.stats`, giving
  `popDelay = R.stats + R.newBestPop`. With reduced motion,
  `R.stats = R.newBestPop = 0`, so `popDelay = 0` — pops simultaneously
  with its card (`delay` for the card is also 0), never *later* than the
  rest of the reveal. Matches the collab doc's traced math exactly.
- Haptic: `setTimeout(() => haptic.rigid(), reducedMs(REVEAL.stats) + reducedMs(REVEAL.newBestPop))`
  (line 201) — same sum as the badge's own pop delay for cardIndex 0, so
  visual and haptic land together in both motion states. Cross-checked
  against the screen's pre-existing haptic effect (lines 179-187,
  `reducedMs(REVEAL.trophy) + 120` and `reducedMs(REVEAL.name) + 100`):
  under reduced motion these become `120` and `100`ms while the new PB
  haptic fires at `0`ms — PB haptic fires *first*, not last, which is
  fine (it's gated on `newBests.length > 0`, an independent condition)
  and does not conflict with or delay the pre-existing sequence.

### 4. Haptic layering — PASS

- Full haptic timeline in this screen, as it stands: `haptic.heavy()` at
  `reducedMs(280)+120`, `haptic.success()` at `reducedMs(560)+100`, new
  `haptic.rigid()` at `reducedMs(900)+reducedMs(300)`. Grepped the file
  for `hapticPattern` (win/checkout/legWon/oneEighty etc.) — zero matches;
  those patterns fire in the per-mode game screens before navigation, not
  here, so there's no cross-screen double-fire risk to trace. Within this
  screen, `rigid` is otherwise unused (confirmed via read of both existing
  `useEffect`s, lines 179-187 and 199-203) — no collision with
  `heavy`/`success`. Multi-badge dedup confirmed: the haptic effect fires
  once per mount gated on `newBests.length > 0` (line 200), not once per
  category/chip — matches the "one tick, not one per badge" design intent.

### 5. Tournament branch interaction — PASS

- The tournament-result effect (lines 147-175,
  `PendingTournamentMatchStorage`/`recordMatchResult`/`tournamentResult`
  state) and the two PB-related effects (data load 119-137, PB haptic
  199-203) are fully independent — no shared state, no read of
  `tournamentResult` anywhere in the PB code path, no read of
  `newBests`/PB state in the tournament code path. The PB badge rendering
  (cell badges + chips) lives entirely inside the player-card `.map()`
  (lines 279-369), which renders identically whether or not
  `tournamentResult` is set — only the bottom action buttons (377-407)
  branch on `tournamentResult`, well below and unrelated to the stat
  cards. A tournament match still flows through the same
  `newPersonalBestsFromMatch` call and the same `RevealStat`/chip
  rendering; nothing in the new code assumes a non-tournament context.

## Overall verdict: SHIP AS-IS

All three collab stages (logic, UI, animation) hold up under direct code
inspection — every claim in `docs/agent-comms/collab-pb-celebration.md`
was independently traced against the actual diff rather than taken on
faith, and all five review areas pass. `npx tsc --noEmit` is clean. No
regressions in `computePersonalBests`'s existing consumers
(`PlayerProfileScreen`, `StatsTrendsScreen`). No bugs required a fix this
round — only one cosmetic writeup inaccuracy noted above (Section 2,
`undefined` vs `false` for `newBest` on the winner's cells), which has
zero functional or visual effect and isn't worth a commit.

## Round: Achievement-celebration collab + tournament abandon banner + CheckoutTrainer per-player storage

`npx tsc --noEmit` — clean (no output) before and after this pass. No
fixes were needed anywhere; all three areas verified directly against
code, not against the collab doc / build-log prose.

### 1. Achievement-celebration collab — PASS

- **`newAchievementsFromMatch` is genuinely additive:**
  `src/logic/achievements.ts:186-197` (`computeAchievements`) has no diff
  markers — untouched. Grepped `computeAchievements` call sites repo-wide:
  only `AchievementsScreen.tsx` and the new `newAchievementsFromMatch`
  itself (`achievements.ts:223,224`) call it — matches the "only existing
  call site is `AchievementsScreen.tsx`" claim exactly.
- **False→true diffing read directly, not trusted from the writeup:**
  `achievements.ts:218-234` — `withMatch = computeAchievements(matches, ...)`,
  `withoutMatch` on `matches.filter(m => m.id !== thisMatchId)`, then
  `withMatch.filter(withStatus => withStatus.earned && (!beforeStatus ||
  !beforeStatus.earned))`. Correct: catches both "never existed before"
  (`!beforeStatus`, can't happen today since `ACHIEVEMENTS` is a fixed list,
  but correctly defensive) and the real case, "was false, now true."
  `earned` is `progress >= target` (line 195), and `getProgress` functions
  are all monotonic non-decreasing as more matches accumulate (win counts,
  streaks, elimination counts, etc.) — a strict boolean flip is unambiguous
  here, no tie-breaking needed, matches the doc's own reasoning.
- **`GameSummaryScreen.tsx` combined row, verified in the actual JSX**
  (`GameSummaryScreen.tsx:296-363`): `extraAchievements = isWinner ?
  newAchievements : []` (line 315) sits right next to `extraNewBests`
  (line 306-308), both mapped inside the same `<View style=
  {styles.extraBestsRow}>` (line 332-333), gated by one combined condition
  `extraNewBests.length > 0 || extraAchievements.length > 0` (line 332).
  A match with both a new PB and a new achievement renders every chip in
  one row — no second section, no duplicate container. Achievement chips
  reuse `styles.extraBestChip`/`styles.extraBestText` verbatim (lines
  349-361); only the icon (`ach.definition.icon`) and text (`UNLOCKED ·
  {ach.definition.title}`) differ from the PB chip. Confirmed no new chip
  style was invented.
- **Haptic gate fix confirmed actually in place, not just claimed:**
  `GameSummaryScreen.tsx:216,219` —
  `if (!match?.winnerId || (newBests.length === 0 && newAchievements.length
  === 0)) return;` with deps `[match?.winnerId, newBests.length,
  newAchievements.length]`. Traced all three cases directly: achievement-
  only (`newBests=[]`, `newAchievements=[x]`) → `&&` is false → gate passes
  → `haptic.rigid()` fires (this was the bug, confirmed fixed). PB-only
  (`newBests=[x]`, `newAchievements=[]`) → unchanged from before, still
  fires. Both non-empty → still exactly one `setTimeout`/one `haptic.rigid()`
  call, since there's only one `useEffect` and no per-item loop (line 217).
  No double-firing possible structurally, not just by observation.
- **Losers never see achievement chips:** `extraAchievements = isWinner ?
  newAchievements : []` (line 315) — same `isWinner` scoping as
  `extraNewBests` one line above, no separate gating logic to get wrong.
- **Draw safety:** `GameSummaryScreen.tsx:137-139` —
  `setNewAchievements(found?.winnerId ? newAchievementsFromMatch(...) : [])`.
  A draw has `winnerId: null` (existing F12 behavior), so this short-
  circuits to `[]` without ever calling into `achievements.ts` — no crash
  path, identical pattern to the PB call one line above.
- **No interference between the two collabs, the specific cross-check this
  round exists for:** both `newBests` and `newAchievements` are independent
  state populated from independent function calls in the same effect
  (lines 134-139), both read the same `matches`/`found.winnerId`/`found.id`
  already resolved once — no double-fetch, no shared mutable state. They
  only ever meet at two points: the shared `extraBestsRow` container
  (rendering) and the shared haptic gate (lines 216-219) — both confirmed
  correct above. `newBestCellLabels` (X01 grid-cell badges) and
  `newAchievements` never overlap: achievements have no cell-mapping logic
  at all (line 315 doesn't touch `newBestCellLabels`), so there's no shared
  lookup table where one feature's ids could collide with the other's.

### 2. Tournament resume/abandon banner — PASS

- **"Both banners visible" reasoning traced, not accepted on prose:**
  `HomeScreen.tsx:89-102` (`continueTournamentInfo`) — line 91:
  `if (activeMatch?.tournamentContext?.tournamentId === activeTournament.id)
  return null;`. Confirmed this is a real id comparison against the same
  `ActiveMatchStorage` pointer `continueMatchInfo` reads (line 73-80), not
  a separate/stale source. So: mid-match tournament state → `activeMatch`
  is set with `tournamentContext.tournamentId` equal to the in-progress
  tournament's id → `continueTournamentInfo` returns `null` → only Continue
  Match shows. Idle-between-matches state → `activeMatch` is `null` (cleared
  by `GameScreen`'s unmount cleanup, `activeMatch.ts`/`GameScreen.tsx:21-26`)
  → id comparison is `undefined === activeTournament.id` → false → Continue
  Tournament shows. No case produces both banners for the same tournament.
- **Abandon action:** `TournamentBracketScreen.tsx:72-88` —
  `Alert.alert` destructive-confirm, `onPress` does
  `await TournamentStorage.remove(tournament.id); navigation.popToTop();`.
  Removes the correct tournament (closure over the loaded `tournament`
  object, not a stale id) and returns to Home, where the removed tournament
  will no longer appear in `TournamentStorage.getAll()` on next focus.
  `TournamentBracketScreen.tsx:47`'s `if (!tournament) return <Screen />`
  guard means no crash if a stray re-render happens between `remove()` and
  `popToTop()` unmounting the screen.
- **Dangling-pointer edge case, traced through actual navigation paths
  rather than assumed:** confirmed `TournamentBracketScreen` is only
  reachable via three call sites (`GameSummaryScreen.tsx:420` replace-after-
  finishing, `HomeScreen.tsx:194` Continue Tournament banner, and
  `TournamentSetupScreen.tsx:164` replace-after-creating) — no standalone
  tournament list screen exists. Traced the specific worry (abandon leaving
  a stale `ActiveMatchStorage`/`PendingTournamentMatchStorage` pointer):
  - `GameScreen.tsx:21-26` sets `ActiveMatchStorage` on mount, clears it on
    unmount unconditionally. Since Continue Tournament is suppressed
    whenever `activeMatch` points at the same tournament (above), the only
    way to reach the Abandon button is when `activeMatch` is *already*
    `null` for that tournament (either GameScreen cleanly unmounted, or a
    crash-resume was itself resolved) — so there is no reachable state
    where Abandon fires while `ActiveMatchStorage` still points at the
    tournament being deleted.
  - `PendingTournamentMatchStorage` is cleared by `GameSummaryScreen.tsx:177`
    immediately after every tournament match result is recorded, and is
    only ever re-set by `GameScreen.tsx:34-40` when the *next* matchup
    starts. The idle-between-matches window Abandon targets is therefore
    always a window where this pointer is already empty. Even in the crash
    variant (pointer left set from a matchup that never finished), the very
    next match played anywhere in the app — tournament or casual — either
    overwrites or clears it at `GameScreen.tsx:34-40` before
    `GameSummaryScreen` could ever read it, and `GameSummaryScreen` is only
    reachable via `navigation.replace` immediately after a match completes
    (confirmed via repo-wide grep for `'GameSummary'`), never independently
    for an old match. **No dangling-pointer bug found** through this trace.
  - Noted, not a regression from this collab: if two tournaments are
    `'inProgress'` simultaneously, `HomeScreen.tsx:50` only surfaces
    `tournaments.find(t => t.status === 'inProgress')` (the first one) —
    a pre-existing single-active-tournament assumption baked into the
    whole feature (per Roadmap's own scoping in the head log — "multiple
    concurrent tournaments isn't a real use case"), not something this
    round introduced or needs to fix.

### 3. CheckoutTrainer per-player storage + picker — PASS

- **Migration fallback confirmed correct by reading the code:**
  `storage.ts:154-166` (`getBest`) — legacy plain-number shape returns
  directly (every not-yet-migrated player sees it, since the raw value is
  re-read fresh on every call rather than consumed/deleted). Once any
  player calls `setBest` (`storage.ts:167-174`), the legacy number is
  folded into `blob[LEGACY_FALLBACK_FIELD]` (not discarded) and only the
  calling player's own key is written — every other player's next
  `getBest` still finds `LEGACY_FALLBACK_FIELD in raw` and returns the
  preserved legacy value, not 0. Confirmed this holds for *every* reader by
  reading `getBest`'s fallback chain (`playerId in raw` → `LEGACY_FALLBACK_FIELD
  in raw` → `0`) rather than trusting the report's description.
- **Switching players resets streak state correctly:**
  `CheckoutTrainerScreen.tsx:70-84` — the `activePlayerId` effect calls
  `CheckoutTrainerStorage.getBest(activePlayerId)` for the new player's
  best *and* unconditionally does `setStreak(0); setResult(null);` in the
  same effect body. No stale streak carries over; the in-progress streak
  belongs to whoever's currently throwing, matching the in-code comment.
- **Zero-players case clean:** `CheckoutTrainerScreen.tsx:192-197` renders
  `EmptyState` in place of the whole trainer UI when `players.length === 0`.
  Read the full file (`storage.ts` imports, `CheckoutTrainerStorage`/
  `PlayerStorage` usage) — no leftover single-global-key code path, no
  unused imports, no dead placeholder logic from the pre-picker interim
  state the Logic Agent had built. Picker itself (`PlayerFilterChips`,
  line 200-202) only renders when `players.length > 1`, matching the
  existing `AchievementsScreen`/`StatsTrendsScreen` convention for the same
  component.

## Fixed directly

Nothing needed fixing this round — all three areas passed on direct
inspection.

## Flagged, not actioned (judgment calls, not bugs)

1. Pre-existing single-active-tournament assumption (`HomeScreen.tsx:50`
   only surfaces one `'inProgress'` tournament) — not a regression from
   this round's abandon-banner work, already a scoped-out design choice
   per the head log. No action needed unless multi-tournament support is
   ever requested.

## Overall verdict: SHIP AS-IS

All three areas hold up under direct tracing against the actual code —
achievement/PB collab interaction (shared `extraBestsRow` container,
shared haptic gate) has no interference, the achievement-only haptic fix
is genuinely in place, losers and draws are both safe. Tournament
abandon's dangling-pointer worry was traced end to end through
`GameScreen`'s mount/unmount lifecycle and found structurally impossible
to hit, not merely "probably fine." CheckoutTrainer's migration fallback
and per-player streak reset both check out by reading the implementation
directly. `npx tsc --noEmit` clean throughout. No commits needed.

## Round: Whole-app regression sweep (post 8+ round session)

Broader than a per-round pass: read `head-log.md` and `build-log.md` in
full first, then traced 5 cross-cutting areas fresh rather than
re-verifying individual features already QA'd. `npx tsc --noEmit` clean
before and after.

### 1. Core scoring/checkout math, 4 modes re-traced fresh — PASS

Picked Shanghai, Halve It, Bob's 27, Around the Clock (X01/Cricket/Killer/
Practice170 had more recent deep touches logged this cycle already).
Traced the full path screen → `src/logic/*` for each, not just the
specific bug each had previously fixed:

- **Shanghai** (`src/screens/game/ShanghaiGameScreen.tsx`,
  `src/logic/shanghai.ts`): `scoreShanghaiVisit` sums `multiplier * target`
  per hit and detects the instant-win via `Set` membership of 1/2/3 among
  the visit's multipliers — correct. `getShanghaiLeader` returns `null` on
  a tie (draw), matches `GameSummaryScreen`'s "TIED RESULT" branch. Single-
  leg only, correctly has no leg-won ceremony wiring (matches the F10/F22
  build-log decision that Shanghai/Bob's/HalveIt are single-leg).
- **Halve It** (`HalveItGameScreen.tsx`, `src/logic/halveIt.ts`):
  `scoreHalveItDart` correctly gates each target kind (`number`/`bull`/
  `anyDouble`/`anyTriple`); `applyHalveItRound` sums qualifying darts or
  halves (`Math.floor`) the score if the round scored zero. Toast timer
  (`toastTimer` ref) has proper unmount cleanup (F17 pattern intact).
- **Bob's 27** (`Bobs27GameScreen.tsx`, `src/logic/bobs27.ts`):
  `applyBobs27Round`'s `roundValue = round * 2` correctly matches the
  D1..D20 progression; score goes negative on a miss with no elimination,
  confirmed still consistent with the F20 build-log decision (full
  20-round drill, not classic elimination). `nextActiveIndex` correctly
  skips already-finished players.
- **Around the Clock** (`AroundTheClockGameScreen.tsx`,
  `src/logic/aroundTheClock.ts`): `applyAtcThrow`'s bull-phase branch
  correctly locks at `BULL_INDEX` (double bull finishes outright, single/
  triple both bank one of two needed hits, never over-advances past bull).
  Skip-ahead mode (`atcDoublesMode`) advances 1/2/3 targets per hit type,
  clamped to never skip past the bull. Leg-won ceremony (`hapticPattern.legWon()`)
  present for non-match-ending leg wins, matching the F10/F22 decision this
  mode explicitly needed it (multi-leg, unlike the three single-leg modes
  above).

No drift found in any of the four from the cycle's haptic/reduced-motion/
undo churn.

### 2. `GameSummaryScreen.tsx`, read fully top to bottom — PASS

739 lines, read in full. No dead code, no orphaned state (`match`,
`players`, `newBests`, `newAchievements`, `tournamentResult` are all read
and all written). No duplication between the PB and achievement paths —
both flow through the same `extraBestsRow`/`extraNewBests`/
`extraAchievements` rendering block and the same combined haptic gate
(`newBests.length === 0 && newAchievements.length === 0` at line 227),
confirmed this is genuinely one shared code path, not two copies that
could diverge.

Traced the full haptic/timer timeline for the maximal case (checkout +
leg-won ceremony fired earlier in the game screen, then PB + achievement
both land here): three independent `setTimeout`s in this file, each with
proper `clearTimeout` cleanup —
- `haptic.heavy()` at `reducedMs(REVEAL.trophy) + 120` (≈400ms default)
- `haptic.success()` at `reducedMs(REVEAL.name) + 100` (≈660ms default)
- `haptic.rigid()` at `reducedMs(REVEAL.stats) + reducedMs(REVEAL.newBestPop)`
  (≈1200ms default)

All three land at distinct, increasing offsets with real separation
(~260-540ms apart) — no stacking, no overlapping windows, confirmed by
reading the actual constants (`REVEAL` object, lines 90-103) rather than
estimating. Confetti runs continuously in the background (not a discrete
timed event) so it doesn't compete with these beats. `PulseRing`'s
`withRepeat`/reduced-motion early-return is self-contained and doesn't
touch any of the above. This reads as a deliberately paced sequence, not
chaos, under both motion settings.

### 3. Undo (F8), re-traced in 4 modes — PASS

Checked X01 (has a bust-flash deferred-commit window, the interesting
case), plus Shanghai/Halve It/Bob's 27/Around the Clock (all have simple
synchronous-commit undo, no flash window). X01's `HudUndoButton disabled=
{history.current.length === 0 || bustFlash}` (`X01GameScreen.tsx:436`)
correctly blocks undo during the bust-flash window, where `visitDarts` has
already been updated but `finishVisit` (which mutates `state.players`) is
still pending in a `scheduleTimeout` — undoing mid-flash would pop a
snapshot that's inconsistent with the currently-displayed (but not yet
committed) dart. Once the flash resolves and `finishVisit` commits, `state`
and `visitDarts` are both settled and undo correctly rolls back the whole
visit. The other four modes have no such deferred-commit path (no flash,
state commits synchronously in the same tick as the dart), so `disabled=
{history.current.length === 0}` alone is correct and sufficient — confirmed
by reading each mode's `throwDart`/`registerDart` function directly, not
assuming parity with X01. Leg-won ceremony timing (haptic `setTimeout`
fired *after* the state has already committed in every mode checked) never
races the undo stack in any of them.

### 4. AsyncStorage `.then()`/`.catch()`, fresh repo-wide pass — 2 BUGS FOUND, FIXED

Ran a `.then(` vs `.catch(` count comparison across every file in `src/`
with any `.then(`, then read every file with a nonzero count mismatch (and
several matched-count files, since equal counts don't guarantee correct
pairing) to confirm real pairing rather than trusting the count alone.

**Found and fixed** (commit `769b18a`):
- `App.tsx:40` — the launch-time `SettingsStorage.get().then((s) => {...})`
  that seeds sound/haptics/reduced-motion state had no `.catch`. Fixed to
  chain `.catch()` with a `console.error`, matching every other read in the
  app (e.g. `HomeScreen.tsx`'s load effect).
- `App.tsx:50` (pre-fix) — `configureAudioMode().then(() => {
  preloadSounds(); preloadAnnouncerSounds(); })` also had no `.catch`.
  Same fix applied.
- `src/screens/BackupRestoreScreen.tsx:54` — the focus-effect
  `SettingsStorage.get().then((settings) => { setLastBackupAt(...) })` read
  (added when the last-backup-timestamp nudge shipped) had no `.catch`.
  Fixed the same way.

These three were the only real gaps found. `App.tsx` isn't under `src/`,
so it wasn't covered by a `src/`-scoped grep in any prior round's audit —
worth noting for future passes to check repo-wide, not just `src/`.
Every other `.then()` in the codebase (30 files, ~40 call sites across
game screens, flow screens, `soundManager.ts`, `dartAnnouncer.ts`) was
read directly and confirmed to already have a matching `.catch()` in the
same chain.

### 5. `SettingsScreen.tsx`, read fully — PASS

236 lines, read in full. All three toggles (Sound/Haptics/Reduce Motion)
share one `update()` function (line 45-54) that: updates local state,
persists via `SettingsStorage.save()` (now with a `.catch`, pre-existing),
and calls the matching flag-module setter (`setSoundEnabled`/
`setHapticsEnabled`/`setReducedMotionEnabled`) — confirmed all three
setters exist and are imported. Traced the full round-trip for app
relaunch: `App.tsx`'s launch effect reads `SettingsStorage.get()` and
calls all three setters in the same order this screen uses, so a toggle
flipped here and the app restarted correctly re-applies all three, not
just the newest one. `sectionTitle` style correctly uses
`typography.overline` (post-consolidation), no duplicated style found, no
layout inconsistency across the three settings sections (Match Rules /
Manage Players / Data) — each already used the same `Card`/`Animated.View`
+ stagger pattern before this cycle's additions.

## Fixed directly

- `App.tsx` — two uncaught `.then()` calls now have `.catch()` handlers.
- `src/screens/BackupRestoreScreen.tsx` — one uncaught `.then()` now has a
  `.catch()` handler.

Commit: `769b18a`. `npx tsc --noEmit` clean after the fix.

## Flagged, not actioned

None this round — no ambiguous judgment calls surfaced, only the three
clear-cut missing-catch bugs above, which were small and unambiguous
enough to fix directly per the standing QA Agent mandate.

## Overall verdict: SHIP AS-IS

All 5 areas pass after fixing the 2 uncaught-promise bugs found in area 4
(a 3rd call site in the same file family). No game-logic drift found
across the 4 freshly re-traced modes, no dead code or diverging logic in
`GameSummaryScreen.tsx`, undo's bust-flash guard is still correctly
scoped, and Settings' three-toggle round-trip persists and reloads
correctly. This closes out the whole-app sweep — no blocking issues
remain.
