# Feature Build Log

Working branch: `feature-build` (backend/logic/systems only, no visual styling changes).

## Session 2026-07-07

### Camera detection accuracy (backlog #1)
- Debug frame logging was already in place (`DEBUG_SAVE_FRAMES` saves each
  analyzed frame to a "DartMasters Debug" photo album and logs the raw
  Vision API response).
- Root cause per brief: oblique camera angle foreshortens the ring
  ellipses, especially on the far side of the board from the camera.
  Two changes address this:
  - `USER_PROMPT` now explicitly tells the model the image is likely an
    oblique shot, explains that ring width varies by position under
    perspective, and instructs it to judge ring membership by radial
    distance on the same side of the board rather than absolute pixel
    width. It also asks for a "low" confidence + note instead of a guess
    when the angle is too oblique to tell.
  - Added live on-screen tilt guidance using `expo-sensors` `DeviceMotion`
    (device pitch/beta) shown during the idle/aiming phase, coaching the
    user to hold the phone level with the board before throwing — this
    reduces the very foreshortening that confuses detection. Installed
    `expo-sensors` via `npx expo install`.

### Bull Off N-1 logic (backlog #2)
- Verified: `BullOffScreen.tsx` already auto-resolves the last remaining
  human's position the instant only one is left (`remainingHumans.length
  === 1` effect), without waiting for a redundant tap. No change needed.

### Game mode logic audit (backlog #3)
Reviewed every mode's logic module against CLAUDE.md/standard rules; all
complete, no gaps found:
- `x01.ts` — double-in gating, bust rules (including the outMode !=
  straight "leaves 1" bust), double/master/straight-out validation. Fine.
- `cricket.ts` — closing at 3 marks, cut-throat vs standard scoring,
  winner requires all-closed AND score >= max among all players. Fine.
- `killer.ts` — number claiming, life-building on own number, killer
  status gated on exact max lives, attacks only land from a Killer,
  losing killer status when dropped below max, elimination at 0 lives.
  `KillerGameScreen.tsx` correctly skips eliminated players in turn
  rotation (`nextActiveIndex`). Fine.
- `shanghai.ts` — instant win requires single+double+triple of the round
  target in one visit; wired to end the match immediately in
  `ShanghaiGameScreen.tsx`. Fine.
- `aroundTheClock.ts` — skip-ahead mode, bull can't be skipped into, two
  hits (or one double) needed to finish on bull. Fine.
- `bobs27.ts` — 20 rounds (doubles 1-20), correct win/lose scoring per
  round. Fine.
- `Practice170GameScreen.tsx` — shared checkout target passed between
  players each turn, double-out enforced. Fine.

### Daily Challenges wiring (backlog #4)
- `computeDailyChallengeReport` recomputes from `MatchStorage`/
  `BullOffStorage` on every call using `new Date()`, filtering to same
  calendar day — no persisted "last reset" state, so it can't go stale
  and resets correctly at local midnight automatically.
- `ChallengesScreen.tsx` re-runs the report on every screen focus
  (`useFocusEffect`), so today's progress is always fresh.
- Traced every producer field the challenge defs read (`oneEighties`,
  `bestLegDarts`, `checkoutHits`, `count100Plus`, `threeDartAvg`,
  `highestCheckout`, `doublesHit`, `missCount`, `marksPerRound`,
  `eliminationsCount`, `killerEverPlayerIds`, `legWinnerHistory`,
  `outscoredEveryRound`) back to where each game screen sets it — all
  are wired, none are dead reads. Fine.

## Autonomous pass beyond the backlog
Went looking for any other incomplete systems and found none — the
codebase's game logic is in solid shape. Stopping here rather than
inventing busywork, per instructions.

## Session 2026-07-07 (cont.)

Checked BUGLOG.md, VISUAL_LOG.md, AUDIO_LOG.md (each in the other
agents' own worktrees) for `@features:` tags — none found. Nothing to
pick up from other agents this session.

Freshly re-verified the whole backlog against current code (camera tilt
guidance + prompt still intact, Bull Off N-1 logic still correct,
`npx tsc --noEmit` still clean), then did a second, deeper pass over
systems not read closely last session:
- `stats.ts` (`computeX01PlayerResult`, `aggregateCareerStats`,
  `computeWinStreak`) — correct, including multi-player `legsPlayed`
  aggregation.
- `bot.ts` — every bot-supported mode (X01, Cricket, Around the Clock,
  Killer, Shanghai) has a working decision function. Bob's 27 and
  Practice170 have none, but that's intentional:
  `GameSetupScreen.tsx`'s `BOT_UNSUPPORTED_MODES` excludes both from
  bot play at setup time, so there's no dangling bot-less game state.
- `checkoutTable.ts` — standard double-out suggestions, impossible
  finishes correctly excluded (169/168/166/165/163/162/159).
- `storage/activeMatch.ts` + its `GameScreen.tsx`/`HomeScreen.tsx`
  wiring — crash/interrupt detection and resume-into-same-config both
  wired correctly; it only persists config, not turn-by-turn state,
  which is a deliberate scope choice, not a gap.

No further gaps found. Nothing outstanding — stopping here rather than
manufacturing more work.

## Session 2026-07-08

Checked all three cross-agent logs for `@features:` tags:
- `BUGLOG.md` (bugfix-sweep) — none. New fixes since yesterday (splash
  screen freeze, uncleared timeouts in X01/Practice170, missing
  `.catch()` handlers across game/data screens) are all bug fixes on
  their own branch, nothing tagged for features work.
- `VISUAL_LOG.md` (visual-polish) — explicitly logged "`@features:` none
  found this session." Their pass also independently re-confirmed no
  game logic or camera code was touched by the visual overhaul.
- `AUDIO_LOG.md` (audio-pipeline) — none; unchanged since yesterday.

Nothing to pick up from other agents. Re-verified my own worktree is
still clean and `npx tsc --noEmit` still passes, then read through the
few screens/modules from the backlog I'd only grepped or skimmed
before, to make sure nothing was missed:
- `CricketGameScreen.tsx` — full read. Multi-leg rotation, cut-throat
  toast for closed targets, accum stats all correct. Noted that tapping
  a target already closed by every player at the table is blocked with
  a "Closed" toast rather than consuming one of the 3 darts — a
  deliberate simplification (matches how digital scorers typically grey
  out fully-dead numbers), not a scoring-math bug, left as-is.
- `AroundTheClockGameScreen.tsx` — full read. Skip-ahead doubles mode,
  bull-finish rule, per-leg miss tracking and reset, all correct.
- `ShanghaiGameScreen.tsx` — full read. Round = target number, instant
  win on single+double+triple, leader-by-score fallback at the last
  round. Correct.
- `Bobs27GameScreen.tsx` — full read. Per-dart hit/miss tallied into a
  3-dart round result, applied via `applyBobs27Round`. Correct.
- `storage/storage.ts` — plain AsyncStorage wrappers for players,
  matches, bull-off log, settings. No gaps.

No new gaps found anywhere. Every backlog item and every game/logic
module has now had a full line-by-line read across the two sessions.
Stopping here — there is genuinely nothing left to do.
