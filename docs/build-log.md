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

### Next Up

- Sweep for other spots where `ActiveMatchPointer`/tournament resume
  interacts with match summary — specifically confirm `GameSummaryScreen`
  reads `PendingTournamentMatchStorage` (not route params) so the F15 fix
  is sufficient on its own. (Quick verification, not expected to need a
  code change.)
- Begin self-directed roadmap: candidates to evaluate next cycle —
  (a) HalveIt/Shanghai/ATC ceremony parity with X01's leg-won beat now
  that the pattern exists in one place, (b) a lightweight settings toggle
  for reduced haptics/motion (accessibility), (c) Stats/Trends screen
  polish pass, (d) sound asset coverage for `miss`/`buttonTap` (currently
  permanently silent by design — confirm this is still the desired
  long-term state or worth an actual asset).
