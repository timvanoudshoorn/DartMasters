# DartMasters — Build Log

Single source of truth for what has already happened. Read this and
`docs/full-audit/plan.md` at the start of every session (including
resumed ones) before touching anything.

Only automated check: `npx tsc --noEmit`. No test suite exists.

---

## 2026-07-26 — Session start (Sonnet 5, continuous build mode)

**Baseline read:** `docs/full-audit/plan.md` (Fable 5 audit, six in-session
fixes F1-F6) and `docs/ui-redesign/qa-report.md` (Phase 5 QA, verdict:
ship as-is). Git history shows the P1/P2 backlog from plan.md was already
executed in commit `02ea234` before this session started: F7 (haptic
double-fire), F8 (undo everywhere), F9 (bot straight-out finish), F10
(legWon ceremony), F11 (guest avatars persisted), F12 (draw naming), F13
(GameHud rightAction slot), F16 (tournament result validation), F17 (toast
timer cleanup), F19 (Bob's 27 checkout signature), F21 (bot-only lineup
blocked). Verified via `git log --stat -1 02ea234`, not retaken on faith.

**Remaining backlog from plan.md**, triaged this session:

- **F15 — done this session.** Tournament context lost on crash-resume.
  Worse than the plan described: `ActiveMatchStorage` never stored
  `tournamentContext`, so `GameScreen`'s cleanup effect (which calls
  `PendingTournamentMatchStorage.clear()` whenever `tournamentContext` is
  `undefined`) actively destroyed a still-valid pending-tournament pointer
  the moment a crashed match was resumed from Home's "Continue match"
  card — not just a silent downgrade to casual, an active wipe.
  *Fix:* `ActiveMatchPointer` gains an optional `tournamentContext` field
  (additive, no migration — absent means casual, matches every existing
  persisted record); `ActiveMatchStorage.set` takes it as a second arg;
  `GameScreen` passes its route param through on mount; `HomeScreen`'s
  continue-match `onPress` now forwards `activeMatch.tournamentContext`
  into the `Game` navigation params. Files: `src/storage/activeMatch.ts`,
  `src/screens/GameScreen.tsx`, `src/screens/HomeScreen.tsx`.
  `npx tsc --noEmit` clean.

- **F18 — documentation decision, no code change.** Cricket's multiplier
  selector stays armed after each dart (confirmed current behavior:
  `CricketGameScreen.tsx` has no `setMultiplier(1)` reset in `throwDart`),
  unlike X01/DartPad which resets to single per dart. Decision: keep as
  intentional — cricket players routinely throw three darts at the same
  treble in a single visit, so persisting the arm reduces taps for the
  common case. Documented as a rule in `CLAUDE.md`.

- **F20 — documentation decision, no code change.** Bob's 27 "classic"
  rule (score below 0 → eliminated) is not implemented; the app already
  documents its own rule in `data/rules.ts` as "highest score after all 20
  rounds wins" with no elimination clause, and `applyBobs27Round` simply
  lets score go negative and play continues. Decision: keep the
  full-20-rounds drill variant — it's self-consistent with the app's own
  stated rules and matches how most digital Bob's 27 implementations play
  it. Not adopting elimination.

- **F14** — informational only in the original audit, no action needed
  (re-qualifies a QA claim; no bug exists).
- **F22** — tied to F10, which is now done (legWon beat + GAME SHOT
  stinger wired). Leg-reset AnimatedScore pop was already covered by that
  fix; no separate action needed.
- **F23** — explicitly "leave as-is" in the original audit unless F13
  touched the deck header. F13 added a HUD rightAction slot but did not
  touch X01's magic-number paddings; leaving them per the audit's own
  note.

**Plan.md backlog is now fully triaged** (all items resolved, documented,
or explicitly deferred with reasoning). From this point on, new work is
self-directed: polish, features, edge cases, UX improvements, generated
and prioritized each cycle by this session.

- Verified `GameSummaryScreen` reads tournament context from
  `PendingTournamentMatchStorage` directly, not route params — the F15
  fix (above) is sufficient on its own, no further change needed there.

- **Leg-won ceremony parity — done this session.** X01/Practice170 fire
  `hapticPattern.legWon()` on a leg win that doesn't end the match (F10);
  Cricket and Around the Clock also support multi-leg matches
  (`config.legsToWin`) but had zero ceremony on leg reset — instant snap
  back with no beat. Shanghai/HalveIt/Bob's 27 are single-leg
  (`legsToWin: 1` always) so they have no non-match-ending leg transition
  to cover. *Fix:* added `hapticPattern.legWon()` immediately before the
  leg-reset state updates in both `CricketGameScreen.tsx` and
  `AroundTheClockGameScreen.tsx` (both already imported `hapticPattern`;
  no `scheduleTimeout` needed since neither has a flash/delay before the
  reset, unlike X01's checkout-flash timing). `npx tsc --noEmit` clean.

- **Haptics accessibility toggle — done this session.** No app-wide way
  to reduce haptics existed, only sound had a Settings toggle. *Fix:*
  `AppSettings.hapticsEnabled` (additive, default `true`); `haptics.ts`
  gained a module-level flag + `setHapticsEnabled()` gating every
  `haptic.*` call at its one choke point (every game screen and
  `PressableScale` already route through `haptic`/`hapticPattern`, so no
  per-call-site changes needed); `App.tsx` initializes it from storage on
  launch alongside `setSoundEnabled`; `SettingsScreen` gained a "Haptics"
  `SwitchRow` next to "Sound effects". `backup.ts` round-trips
  `AppSettings` generically, so restore needed no changes. `npx tsc
  --noEmit` clean.

### Next Up

- Self-directed roadmap candidates for next cycle, in rough priority
  order: (a) Stats/Trends screen polish pass, (b) sound asset coverage for
  `miss`/`buttonTap` (currently permanently silent by design — confirm
  this is still the desired long-term state or worth an actual asset),
  (c) general sweep of `src/screens/` flow screens (Achievements,
  HeadToHead, Search, BackupRestore, Settings) against the design system
  now that game screens have had two full passes — flow screens were
  audited but not as deeply iterated on, (d) a "Reduce motion" companion
  toggle for Reanimated `entering=`/stinger animations, following the same
  pattern established by sound/haptics, for users who want the tactile
  feedback but not the motion.
