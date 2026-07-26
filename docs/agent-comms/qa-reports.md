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
