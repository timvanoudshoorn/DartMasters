# DartMasters — Full-App Audit & Improvement Plan

One-pass, cross-domain audit (UI / animation / logic) of the entire app,
2026-07-26. Every screen, component, logic module, storage module, and the
sound/haptic layer was read end-to-end in a single session before any
finding was written down, so cross-domain links below are traced, not
guessed. The prior UI-only redesign (docs/ui-redesign/) was treated as an
input; its assumptions were re-verified against actual state/logic
behavior — two of its "fixed" items are re-qualified below (F14).

**Domain tags:** `[UI]` visual, `[ANIM]` animation/motion, `[LOGIC]`
game/derived logic, `[STATE]` React state/timing, `[AUDIO]`/`[HAPTIC]`
feedback layer, `[DATA]` persisted records. **Kind:** `judgment` (needs
design/architectural choice) vs `mechanical` (fully specified, executable
by a separate session without clarification).

---

## 1. Inventory

- **Logic (pure):** `x01.ts`, `cricket.ts`, `killer.ts`, `shanghai.ts`,
  `aroundTheClock.ts`, `bobs27.ts`, `halveIt.ts`, `bot.ts`, `stats.ts`,
  `tournament.ts`, plus derived: `achievements.ts`, `headToHead.ts`,
  `personalBests.ts`, `trends.ts`, `challengeProgress.ts`, `search.ts`,
  `backup.ts`. Data: `checkoutTable.ts`, `gameModes.ts`, `rules.ts`,
  `dailyChallenges.ts`.
- **Game screens (state-heavy):** X01, Practice170, Cricket, Killer (3
  phases), Shanghai, AroundTheClock, Bobs27, HalveIt + `GameScreen`
  dispatcher, `BullOffScreen`, `GameSummaryScreen`, `CheckoutTrainerScreen`.
- **Flow screens:** Home, ModeSelect, GameSetup, TournamentSetup/Bracket,
  Stats, StatsTrends, MatchDetail, Leaderboard, Challenges, Achievements,
  HeadToHead, PlayersList/Profile/Edit, Search, Rules, Settings,
  BackupRestore. (`CameraScoringScreen` untouched per standing rule.)
- **Feedback layer:** `haptics.ts` (vocabulary + patterns),
  `soundManager.ts` (7 audio files; `miss`/`buttonTap` triggers are
  deliberately haptic-only — no assets exist for them),
  `useSoundEffects.ts` (sound+haptic bundles), `PressableScale` (contact
  haptic + optional release sound), `dartAnnouncer.ts`.
- **Animation primitives:** `MountReveal` (launch-safe), `AnimatedScore`
  (pop on change, accepts strings), `CountUp`, `EventStinger`, `Confetti`,
  `ScreenFlash`, `useShake`, `GameHud` dart-dots, per-screen Reanimated
  `entering=` stagger.

**Verified sound (no findings):** `evaluateDart` bust/checkout/gating math;
Cricket close/overflow/win logic; Killer life/killer-status transitions;
ATC bull gating & skip-ahead clamping; Shanghai scoring + instant-win;
Bob's 27 round math; Halve It scoring/halving; checkout table entries
(spot-checked arithmetic) incl. impossible finishes; bracket seeding/bye
propagation; stats aggregation (career, head-to-head, streaks, first-nine);
`GameScreen`'s stale-tournament-pointer clearing; splash/launch-animation
safety (`HomeScreen` uses only `MountReveal`); timeout cleanup on unmount
in X01/Practice170.

---

## 2. Fixed in this session (cross-domain judgment fixes)

Each was verified against the relevant logic module before and after; the
only automated check (`npx tsc --noEmit`) passes clean after all six.

**F1. Undo clobbered during bust window — X01 + Practice170**
`[STATE→UI]` The bust path schedules `finishVisit` on a timeout whose
closure captures pre-tap state, but the Undo button stayed enabled during
the window (only the DartPad was disabled). Undo during the flash reverted
state on screen, then the timeout re-applied the bust from stale state —
the undo silently un-happened, presenting as a ghost visual glitch.
*Fix:* Undo disabled while `bustFlash` is true in both screens
(`X01GameScreen.tsx`, `Practice170GameScreen.tsx`).

**F2. Practice170 bust timing split — turn advanced under the flash**
`[STATE→ANIM]` `finishVisit` fired at 550 ms but the flash cleared at
700 ms, so the next player's ring rendered red/shaking for 150 ms.
*Fix:* single 700 ms timeout does both, matching X01's pattern.

**F3. Cut-throat Cricket scored zero for everything**
`[LOGIC→AUDIO+DATA]` `gained` was measured as the *thrower's* score delta,
which is always 0 in cut-throat (points land on opponents). Every
cut-throat dart read as scoreless: no `dartScored` sound, and whole
matches persisted with `totalScored: 0`, `threeDartAvg: 0`,
`highestVisit: 0`. *Fix:* `gained` now measures the whole-table score
delta (identical to own-delta in standard cricket, equals points dealt in
cut-throat). Sound, `visitPoints`, and accumulated stats all inherit the
fix. Note: in cut-throat, `totalScored` now means "points dealt to
opponents" — documented in-code.

**F4. Triple bull possible in Cricket (human input only)**
`[LOGIC]` The multiplier selector allowed T×Bull = 3 marks; a triple bull
doesn't exist (the bot already capped it, DartPad caps it, Halve It's
buttons never offer it — Cricket's human path was the one gap). *Fix:*
bull capped to double in `throwDart`.

**F5. Practice170 match records lost guest identity**
`[DATA→UI]` `finalizeMatch` omitted `guestNames`/`guestColors` (every
other mode records them), so guests in 170-practice history rendered as
the "Player" fallback. *Fix:* maps added to the record.

**F6. Cricket save had no `.catch`**
`[STATE]` The one remaining `MatchStorage.save().then()` without a catch
(BUGLOG claimed all were fixed); a failed save stranded the match on the
game screen. *Fix:* catch added, navigating to summary regardless,
matching all other modes.

---

## 3. Findings for later execution (prioritized)

### P1 — high impact

**F7. Haptic double-fire + wrong weight on every non-X01 dart input**
`[HAPTIC]` `mechanical` — Files: `CricketGameScreen.tsx`,
`ShanghaiGameScreen.tsx`, `AroundTheClockGameScreen.tsx`,
`HalveItGameScreen.tsx`, `KillerGameScreen.tsx`, `Bobs27GameScreen.tsx`.
`SegmentButton` fires a contact haptic on press-in (`medium` for accent
variant, `light` otherwise) and then the handlers *also* fire
`hapticPattern.dartHit(mult)` / bundled patterns — two haptics per dart,
and the contact one has fixed weight, violating "physical weight tracks
the dart". X01's DartPad does it right (`haptic="none"` tiles, weighted
pattern in the handler). *Spec:* pass a `haptic` override through
`SegmentButton` → `PressableScale` (`haptic="none"`) for every dart-input
SegmentButton in game screens (Cricket target grid + MISS; Shanghai
S/D/T/MISS; ATC HIT/DOUBLE/TRIPLE/MISS; HalveIt all input buttons; Killer
MISS; Bobs27 HIT DOUBLE/MISS), leaving navigation/settings SegmentButtons
untouched. `SegmentButton` needs a `haptic?: HapticKind` prop (default
current behavior). *Done:* exactly one haptic per dart tap, weighted by
multiplier where the mode has one. Note ATC/Killer handlers currently fire
only bundled `dartScored` (weight 1) — while there, pass the real
multiplier to `hapticPattern.dartHit` in ATC (`double`→2, `triple`→3) and
Killer (`overrideMultiplier ?? multiplier`).

**F8. No undo outside X01/Practice170**
`[STATE→UI]` `judgment` — Files: Cricket, Killer, Shanghai, ATC, Bobs27,
HalveIt game screens. A mis-tap in Killer can eliminate a player with no
recovery; Cricket/Shanghai/HalveIt mis-taps permanently skew a match. X01
and Practice170 already have snapshot/undo. *Spec sketch:* same
snapshot-stack pattern (deep-copy relevant state slices before each dart,
cap 80). Killer needs the full tuple (players, turn, darts, eliminations,
everKiller); judgment needed on whether undo may cross a leg boundary in
Cricket/ATC (X01 allows it). *Done:* every game screen has an undo control
in a consistent location (GameHud has no action slot — see F13) that
reverts exactly one dart.

**F9. Bot can never finish straight-out legs**
`[LOGIC]` `mechanical` — File: `bot.ts` (`decideX01Dart`). The `_outMode`
param is ignored; the double-out checkout table has no entry for 1, and
the throw pool has no S1, so a bot sitting on 1 in straight-out busts or
misses forever. *Spec:* when `outMode === 'straight'` and
`remaining <= 20`, aim `{segment: remaining, multiplier: 1}` with the
skill-based success chance (miss → `neighborOf`); also accept
`remaining <= 40, even` → D(remaining/2) as an alternative. *Done:* a
legend bot at 1 in straight-out finishes within a few visits; existing
double-out behavior unchanged.

**F10. `hapticPattern.legWon` is dead — leg wins have no moment**
`[HAPTIC+ANIM]` `judgment` — Files: `X01GameScreen.tsx`,
`Practice170GameScreen.tsx` (+ Cricket/ATC multi-leg resets). Defined in
the documented vocabulary, used nowhere. A non-match-ending checkout
plays the checkout signature then everything snaps back to the start
score with zero ceremony (X01 only stings 100+ finishes). *Spec sketch:*
fire `hapticPattern.legWon` + a brief "LEG — <name>" `EventStinger` (or
reuse the existing stinger) on leg transitions that don't end the match.
Judgment: whether to pause turn handoff ~600 ms for it.

### P2 — medium

**F11. Guest avatars never persisted to match records**
`[DATA→UI]` `mechanical` — Files: all 8 game-screen `finalizeMatch`
functions. `MatchRecord.guestAvatars` exists and
`resolvePlayerDisplayFromMatch` reads it, but no screen writes it — guest
icon avatars degrade to initials in history/summary. *Spec:* alongside the
existing `guestNames`/`guestColors` maps add
`guestAvatars: Object.fromEntries(entries.map(([id, g]) => [id, g.avatar]))`
(skip undefined). *Done:* a guest with an icon avatar shows it in
GameSummary/MatchDetail after the match.

**F12. Draw endings are silent and jarring**
`[LOGIC→UI/ANIM]` `judgment` — Shanghai/Bobs27/HalveIt can end tied →
`winnerId: null`. GameSummary falls back to a bare "MATCH COMPLETE" with
no confetti and no explanation, and the tie itself is never mentioned.
Also `getShanghaiLeader`-style tie → null flows into head-to-head as
"draws", which is correct data-wise. *Spec sketch:* a proper draw state on
GameSummary (e.g. "DRAW — tied at N") listing tied players; optionally a
sudden-death round (bigger judgment). Tournament formats (X01/Cricket
only) can't tie, so no bracket interaction.

**F13. GameHud has no action slot (Undo landed in two different homes)**
`[UI]` `judgment` — Files: `GameHud.tsx`, X01, Practice170 (+F8 screens
later). Phase-4 relocation put X01's undo in the deck header and
Practice170's in a floating corner — two idioms for the same action, and
F8 will need a third home per screen. *Spec sketch:* optional
`rightAction?: ReactNode` on GameHud rendered in place of the dart dots
(or beside them), used by every game screen for Undo. Supersedes the
placement half of qa-report item 2.

**F14. Re-qualified items from the UI-redesign QA**
`[AUDIO]` `informational` — The Phase-4 "double-fired miss sound" fix and
its QA verification were reasoned against `playSound('miss')` calls that
are actually no-ops (`SOUND_FILES` has no `miss`/`buttonTap` assets —
haptic-only triggers by design). No audible bug existed; no audible bug
exists now. The *haptic* double-fire those same buttons cause is real and
is F7. Also `SegmentButton`'s `soundTrigger` prop is currently decorative
(both allowed values are silent) — fold its removal or an actual asset
decision into F7.

**F15. Tournament context lost on crash-resume**
`[STATE→DATA]` `judgment` — Files: `activeMatch.ts`, `GameScreen.tsx`,
`HomeScreen.tsx`. `ActiveMatchStorage` persists only the config; resuming
a crashed tournament match from Home replays it as a casual match (and
`GameScreen` then clears the pending pointer), so the bracket never gets
the result. *Spec sketch:* persist `tournamentContext` alongside the
config in `ActiveMatchStorage.set` (additive field — no migration:
absent = casual) and pass it through Home's continue-match navigation.
Flagging per stop-conditions since it touches a persisted shape —
additive-optional, no existing data affected.

**F16. `recordMatchResult` trusts its caller**
`[LOGIC]` `mechanical` — File: `tournament.ts`. No validation that
`winnerId` is one of the matchup's players or that the matchup is
undecided. Currently unreachable-in-practice, but one navigation change
away from silent bracket corruption. *Spec:* return the tournament
unchanged (or throw) if `winnerId` ∉ {playerAId, playerBId} or
`matchup.winnerId` already set with a different `matchId`. *Done:* unit
of defensive logic + comment.

### P3 — low / polish

**F17.** `[STATE]` `mechanical` — Toast timers in Cricket + HalveIt
(`showToast`) use untracked `setTimeout`; can setState after unmount when
a match ends within 1.1 s of a toast. Use the `scheduleTimeout` pattern
X01 uses (add the ref + cleanup effect) or guard with a mounted ref.
**F18.** `[UI/UX]` `judgment` — Cricket's multiplier stays armed after
each dart; X01/DartPad reset to single. Decide one policy (cricket
players often do throw 3 at the same treble — persisting may be right)
and document it in CLAUDE.md either way.
**F19.** `[HAPTIC]` `judgment` — Bob's 27 plays the full `checkout`
signature for every hit double (20× per game); `dartHit(2)` +
`dartScored` fits the vocabulary better; reserve `checkout` for the final
round or drop. Also its HIT DOUBLE button double-fires per F7.
**F20.** `[LOGIC]` `judgment` — Bob's 27 classic rule "score below 0 =
eliminated" not implemented (score goes negative and plays on, shown in
red). App's own rules.ts is self-consistent, so this is a rules-variant
decision, not a bug. If adopted: `applyBobs27Round` gains an
`eliminated` outcome; screen + summary handle it.
**F21.** `[STATE]` `mechanical` — Solo-bot games are configurable
(GameSetup allows a single bot as the only player; min players = 1 for
most modes). ATC solo-bot can stall its turn effect (deps unchanged when
a leg ends on the first dart of a visit: same player, same
`dartsThisTurn`); nothing meaningful is lost by requiring ≥1 human.
*Spec:* in GameSetup, `canStart` additionally requires
`selectedIds.some(id => !guestEntryIsBot(id))`. *Done:* start button
stays disabled for bot-only lineups.
**F22.** `[ANIM]` `judgment` — Leg reset in X01 makes `AnimatedScore`
pop 32→501 instantly with the generic change-pop; fine, but combined
with F10's missing ceremony the transition reads as a glitch. Solve
together with F10.
**F23.** `[UI]` `mechanical` — `X01GameScreen` still has a handful of
magic numbers vs the spacing scale (8/12/13/16 paddings, noted as
deliberate one-offs in phase4 docs) — leave unless F13 touches the deck
header anyway; listed for completeness only.

---

## 4. Execution notes for the follow-up session

- Run `npx tsc --noEmit` after every file; it's the only automated check.
- Never touch `CameraScoringScreen.tsx`, `src/screens/game/` logic beyond
  the specs above, or any persisted shape except F15's additive field
  (flag before doing F15).
- F7 + F13 + F8 interact: do F13 (GameHud slot) first, then F8 (undo
  everywhere, into that slot), then F7 (haptic pass over the same files)
  to avoid triple-editing the six screens.
- Sound layer principle (established, keep): components own *contact
  haptics* only; screens own *outcome* sound/haptic via their handlers;
  `miss`/`buttonTap` sound triggers are silent by design.
