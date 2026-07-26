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

## Personal-best celebration — motion + haptic (Stage 3, 2026-07-27)

**Summary:** This closes out the 3-stage `collab-pb-celebration.md` collab
(Logic → UI → Animation). Logic's `newPersonalBestsFromMatch` and UI's
"NEW BEST" badge/chip placement in `GameSummaryScreen.tsx` were already
done and reviewed; my piece was motion + haptic on top, described in full
(with a line-by-line flag-on/flag-off trace) in that collab file's new
"Animation Agent — motion/haptic" section. Short version below.

**What shipped (`src/screens/GameSummaryScreen.tsx` only):**
- Badge medal icon + "NEW BEST" caption (the 4 in-grid cells) and the
  standalone win-streak/best-visit chips now each get their own
  `Animated.View`/`Animated.Text` with `entering={ZoomIn...springify()}`
  tuned to `SPRING_BOUNCY` — a distinct celebratory overshoot, not just
  riding the parent stat card's plain `FadeInDown`.
- New `REVEAL.newBestPop = 300`ms constant: the extra beat between a
  card's own entrance and its badge popping, so it reads as "card lands,
  then a badge appears on it." Reduced-motion-gated via `reducedMs`
  alongside the rest of this screen's existing `REVEAL` constants.
- New optional `RevealStat` prop `newBestPopDelay` (non-breaking — falls
  back to the existing `delay` prop, i.e. simultaneous with the card, at
  every call site that doesn't pass it).
- One new `haptic.rigid()` accent, fired at most once per ceremony (not
  once per badge) via a new `useEffect`, timed to land alongside the
  winner's first badge pop.
- `npx tsc --noEmit` clean.

**Judgment calls (detail + reasoning in the collab file):**
- **Reduced motion → fast-forward, not skip.** Only the 300ms head-start
  delay collapses to 0; the badge's `SPRING_BOUNCY` pop always plays in
  full. Reasoning: a personal-best badge is a fact ("you just set a
  record"), not ambient decoration like `Confetti`/`PulseRing` — closer to
  `EventStinger`'s "fast-forward" precedent from the reduce-motion collab
  than to something that gets hidden outright.
- **One haptic tick total, not one per badge.** Up to ~4 cell badges + 2
  chips can be `newBest` in the same match, and the trophy-thump
  (`haptic.heavy`) and name-slam (`haptic.success`) already fire moments
  earlier in this exact sequence — stacking a tick per badge would read
  as buzzing. `haptic.rigid` was picked specifically because it's
  otherwise unused anywhere in this screen's ceremony, so it reads as a
  new, distinct accent rather than a repeat.

**Traced, not device-tested (no visual confirmation possible from here):**
flag-off: card lands at 900ms, badge pops + haptic.rigid fires together
at 1200ms, ~300ms after the card visibly settles. flag-on: all delays
collapse to 0, badge still plays its full spring pop simultaneously with
the card, haptic fires at 0ms alongside the (now compressed) trophy/name
haptics — compressed timeline, nothing skipped. Full trace with exact ms
math is in `collab-pb-celebration.md`.

**Status: all 3 stages of `collab-pb-celebration.md` are now complete**
(Logic's diffing function, UI's badge/chip placement, this motion/haptic
pass). Ready for QA/Integration Agent's cross-check per that file's
sequencing note (step 4).

## Reduce Motion gating — remaining 5 screens (2026-07-27)

**Summary:** Closes out the 5 screens flagged as not-yet-migrated in the
previous Reduce Motion round above (`StatsScreen.tsx`,
`StatsTrendsScreen.tsx`, `AchievementsScreen.tsx`, `HeadToHeadScreen.tsx`,
`SettingsScreen.tsx`). Same mechanical swap as the earlier 16-screen pass:
raw `STAGGER_MS` arithmetic → `staggerDelay()`/`reducedMs()`. Each file
committed individually; `npx tsc --noEmit` stayed clean after every edit.

**File-by-file:**
- **`src/screens/StatsScreen.tsx`** — 1 call site: match-history row
  `FadeInDown.delay(Math.min(i, 8) * STAGGER_MS)` → `staggerDelay(Math.min(i, 8))`.
  Import swapped from `STAGGER_MS` to `staggerDelay`. Faithful 1:1 — same
  ms output when the flag is off, collapses to 0 when on.
- **`src/screens/StatsTrendsScreen.tsx`** — 2 call sites: the `.map()`
  loop over personal-best pills (`i * STAGGER_MS` → `staggerDelay(i)`),
  and the fixed non-looped stats-grid delay (`STAGGER_MS` →
  `reducedMs(STAGGER_MS)`, following the same convention used in
  `Bobs27GameScreen`/`HalveItGameScreen`/`ShanghaiGameScreen` for
  sequential non-looped sections). No behavior change when off.
- **`src/screens/AchievementsScreen.tsx`** — 3 call sites: badge card
  `FadeInDown` (`index * STAGGER_MS` → `staggerDelay(index)`), the
  earned-checkmark `ZoomIn` (`index * STAGGER_MS + 150` →
  `staggerDelay(index) + reducedMs(150)`), and the progress-fill sweep
  delay prop (same pattern) — matches the identical
  `ChallengeCard`/`ProgressFill` precedent in `ChallengesScreen.tsx`
  exactly. No behavior change when off.
- **`src/screens/HeadToHeadScreen.tsx`** — 1 call site: shared
  match-history row (`Math.min(i, 8) * STAGGER_MS` →
  `staggerDelay(Math.min(i, 8))`), same shape as `StatsScreen`'s fix.
  Import swapped from `STAGGER_MS` to `staggerDelay`. No behavior change
  when off.
- **`src/screens/SettingsScreen.tsx`** — 3 call sites: the three
  sequential (non-looped) card entrances — `FadeInDown.duration(260)`
  (no delay, untouched), `FadeInDown.delay(STAGGER_MS)` →
  `FadeInDown.delay(reducedMs(STAGGER_MS))`, and
  `FadeInDown.delay(STAGGER_MS * 2)` →
  `FadeInDown.delay(reducedMs(STAGGER_MS * 2))`. Closes the ironic gap
  where the screen owning the "Reduce motion" toggle didn't itself
  respect it. No behavior change when off.

**Celebratory-effect check (all 5 files):** confirmed by full read, not
assumed — none of `Confetti`, `ScreenFlash`, `useShake`, or
`EventStinger` appear anywhere in these 5 files. They're all
data/list/settings screens, not win-ceremony screens, so there was
nothing else to gate.

**Faithful-swap confirmation:** every edit is a pure delay-computation
substitution — no spacing, layout, duration, spring config, or logic
touched. With the "Reduce motion" flag off (default), `staggerDelay(i)`
and `reducedMs(x)` return exactly `i * STAGGER_MS` / `x`, so visual output
is byte-for-byte identical to before this change; with the flag on, both
collapse toward 0 as designed.

**Status:** all 21 screens flagged across both Reduce Motion rounds (16 +
these 5) are now migrated. No remaining `i * STAGGER_MS`-style call sites
are known to me outside game-logic-owned files I was told to stay out of
this round.
