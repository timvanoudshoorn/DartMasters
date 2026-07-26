# Animation Agent reports

## Reduce Motion gating (2026-07-27)

**Summary:** Implemented the "Reduce motion" gating described in
`docs/agent-comms/collab-reduce-motion.md` against the Logic/Systems
Agent's finished `src/theme/motionPreference.ts` flag. Full detail,
file list, and a code-traced flag-on/flag-off walkthrough are in that
collab file's "Animation Agent — implementation" section — this is the
short version for Head Agent/QA.

**What shipped:**
- Two new helpers in `src/theme/motion.ts`: `reducedMs(ms)` (collapses
  to 0 when reduced motion is on) and `staggerDelay(index, step?)`
  (per-index stagger delay built on `reducedMs`).
- Gated at the source, so every existing call site benefits with zero
  screen-level changes: `MountReveal` (delay/distance/duration all
  collapse), `Confetti` (skips outright), `ScreenFlash` (skips outright),
  `useShake` (no-ops), `EmptyState`'s internal title/subtitle/action
  cascade.
- `EventStinger` fast-forwards rather than skips (it names the event —
  ONE EIGHTY etc. — so hiding it would lose information): no oversized
  starting scale, no spring overshoot, hold time cut from 900ms to 350ms.
- `GameSummaryScreen`'s full staged reveal (`REVEAL` constants, trophy/
  name/stat-card/action entrances, haptic-echo timeouts) now routes
  through `reducedMs()`; the two pulse rings behind the winner avatar are
  skipped outright as pure decoration.
- Mechanical `i * STAGGER_MS` → `staggerDelay(i)` swap across 16 screens
  with list-cascade entrances (Challenges, BullOff, AroundTheClock,
  Bobs27, Killer, HalveIt, Shanghai, MatchDetail, Leaderboard,
  PlayerProfile, ModeSelect, PlayersList, Rules, Search,
  TournamentBracket, GameSetup, TournamentSetup).
- `npx tsc --noEmit` is clean.

**Judgment calls:**
- **CricketMark / LifeDots**: left ungated, per the collab file's explicit
  call for judgment. Both animate in direct response to a live game event
  (a mark just landed, a life was just gained/lost) — that's functional
  feedback, not passive decoration, so I treated it like
  `PressableScale`/`CheckoutBanner` (out of scope) rather than like
  `Confetti`. Same reasoning applied to per-throw `entering=` in
  `X01GameScreen`, `CricketGameScreen`, `GameHud`, `DartSlots`,
  `BotThinkingBadge`, `PlayerSelectGrid` — all in-the-moment game-state
  feedback, all left alone.
- **GameSummaryScreen**: not on the excluded-files list, and it's the
  single highest-visibility staged reveal in the app, so I went ahead and
  gated it fully rather than flagging it — see the collab file for the
  line-by-line trace.
- **Sheet.tsx**: its `SlideInDown` spring is an on-demand modal open in
  response to user action, not a passive entrance cascade — I left it
  ungated (closer to `SwitchRow` in spirit). Flagging this one
  specifically in case QA/Head Agent wants it gated too — it'd be a
  one-line change.
- **EventStinger**: chose "fast-forward" over "skip" from the contract's
  either/or, because the stinger carries information (which event fired).

**Flagged instead of touched (did not edit, per instructions):**
- `StatsScreen.tsx`, `StatsTrendsScreen.tsx`, `AchievementsScreen.tsx`,
  `HeadToHeadScreen.tsx`, `SettingsScreen.tsx` — all five still have
  un-gated `STAGGER_MS`-based list entrances (same pattern as the 16
  screens above). Owned by other agents this cycle; the fix is the same
  one-line `staggerDelay()` swap whenever they're next touched.

**What QA should verify (I have no device to visually confirm):**
- Toggle "Reduce motion" on in Settings, finish a match, confirm the
  GameSummary screen assembles near-instantly with no confetti/pulse
  rings, then toggle off and confirm the full staged reveal (confetti,
  pulse rings, cascading stat cards) is unchanged from before this
  change.
- Trigger a ONE EIGHTY / big checkout with the flag on, confirm the
  stinger still names the event but holds only ~350ms instead of ~900ms.
- Spot-check one list screen (e.g. PlayersList or Leaderboard) with the
  flag on/off to confirm rows assemble together vs. cascade in.
