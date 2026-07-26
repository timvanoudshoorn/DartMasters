# Collab spec: Achievement-unlock celebration on the win screen

Fast-follow to the already-shipped personal-best celebration
(`docs/agent-comms/collab-pb-celebration.md`) — same 3-stage pattern,
same win-screen ceremony, this time for `src/logic/achievements.ts`
instead of `personalBests.ts`.

**Head Agent decision on multi-badge sequencing:** if a single match both
sets a new personal best AND unlocks an achievement, treat it as one
combined celebration pass — reuse the same badge slot/mechanism and the
same single haptic accent already built for PBs, don't stack two separate
pops/haptic beats in one ceremony. The Animation stage should make sure a
match with both PB(s) and achievement(s) still fires only one accent
haptic total, matching the existing "one `haptic.rigid()` per ceremony,
not per badge" rule from the PB work.

## Sequencing (same as collab-pb-celebration.md)

1. Logic/Systems Agent writes its section first — the pure function.
2. UI Agent reads it, builds the badge, appends its section.
3. Animation Agent reads both, adds motion/haptic, appends its section.
4. QA/Integration Agent reviews the finished collab as a whole.

---

## Logic/Systems Agent — pure function contract (fill in below)

**Function** (`src/logic/achievements.ts`, appended after `computeAchievements`):

```ts
export function newAchievementsFromMatch(
  matches: MatchRecord[],
  playerId: string,
  thisMatchId: string
): AchievementStatus[]
```

Pure diffing wrapper, structured exactly like `newPersonalBestsFromMatch` in
`personalBests.ts`: calls `computeAchievements(matches, playerId)` once with
the full history (including the just-finished match) and once with
`thisMatchId` filtered out of `matches`, then returns every status from the
"with" run whose `earned` flipped `false -> true` relative to the "without"
run (or didn't exist/wasn't earned before at all). `computeAchievements`
itself, its existing call sites (only `AchievementsScreen.tsx`), and its
return shape are untouched — this is additive only.

**Existing `AchievementStatus` shape** (unchanged, just documenting it here
for the UI Agent since it's simpler than `PersonalBestRecord`):

```ts
interface AchievementStatus {
  definition: AchievementDefinition; // { id, title, description, icon: IconName, target, getProgress }
  progress: number;                  // clamped 0..target
  earned: boolean;
}
```

For badge copy: use `definition.title` (short, e.g. "Big Fish") as the
headline, `definition.description` (e.g. "Hit a checkout of 100 or more.")
as the subtext, and `definition.icon` (an `IconName` from
`components/icons/Icon.tsx`, Feather-family) as the badge glyph — there is
no separate "flavor" field, `title`/`description` are the only copy the
definition carries. `progress`/`target` are available if the badge wants to
show e.g. "10/10" but every status returned by `newAchievementsFromMatch` is
by definition freshly `earned: true`, so `progress === definition.target`
for all of them — probably not worth surfacing on the badge itself.

**Judgment calls:**
- No "which direction is improvement" concept needed (unlike PBs' `LOWER_IS_BETTER`
  list) — `earned` is a plain boolean, and achievement progress is monotonic
  non-decreasing as more matches are added, so a strict `false -> true` flip
  is unambiguous; no tie-breaking or "which match currently owns this"
  logic is needed the way `PersonalBestRecord.matchId` required.
- Unlike `PersonalBestRecord`, `AchievementStatus` carries no `matchId`/`date`
  of its own — there's nothing here for the UI to tap through to
  MatchDetail with. If the UI Agent wants tap-through, it would need to pass
  `thisMatchId` through separately (the caller already has it, since it's
  the match that just finished) rather than expecting it on the returned
  object.
- Returns full `AchievementStatus` objects (not just ids), same rationale as
  `newPersonalBestsFromMatch` — callers read `definition.title` etc. directly
  without a second lookup against `ACHIEVEMENTS`.

**Head Agent's combined-sequencing note** (re-read above): when a match
produces both new PBs and new achievements, only one haptic accent should
fire for the whole ceremony — that's an Animation-stage concern layered on
top of both Logic outputs; this function doesn't need to know about PBs at
all, it only computes achievement-side unlocks.

---

## UI Agent — badge implementation (fill in below)

**File:** `src/screens/GameSummaryScreen.tsx` only (no other files touched).

**Data wiring:** added `newAchievements: AchievementStatus[]` state,
populated in the screen's existing data-loading effect right next to
`newBests`: `found?.winnerId ? newAchievementsFromMatch(matches,
found.winnerId, found.id) : []`. Same `matches` array, same
`found.winnerId`/`found.id` already resolved for the PB call one line
above — no new storage call, no new load pattern. Losers never get
achievement chips (only computed for `match.winnerId`) and a genuine tie
(`winnerId` null) produces `[]`, same as the PB path.

**Rendering — every unlocked achievement is a standalone chip:**
achievements never correspond to one of this screen's existing numeric
stat cells (they're accomplishments like "throw a 180" or "win 10
matches," not stats already on the grid), so unlike the PB work there's no
cell-badging step here at all — every entry in `newAchievements` renders
as a chip, always, the same way the PB work already handles its two
no-matching-cell categories (`bestVisit`/`longestWinStreak`).

**Reused the exact same chip:** the achievement chips are rendered with
the identical `styles.extraBestChip`/`styles.extraBestText` component
already built for the PB "standalone chip" categories — no new chip style
was created. Only the content differs: `Icon name={ach.definition.icon}`
in place of the fixed `"medal"` icon, and text reads `UNLOCKED ·
{ach.definition.title}` instead of `NEW BEST · {nb.label} {nb.formatted}`
(achievements have no numeric value worth surfacing on the badge itself,
per the Logic section above, so title alone is the copy).

**Combined-pass placement — satisfies the "one celebration" decision
directly:** `extraNewBests.map(...)` and the new `extraAchievements.map(...)`
sit inside the exact same `styles.extraBestsRow` `<View>`, gated by a single
combined condition (`extraNewBests.length > 0 || extraAchievements.length >
0`). A match that sets both a new PB and unlocks an achievement therefore
renders all its chips together in one row automatically — there is no
special-case merge code, because both arrays were always going to share
one container once achievements were added here. This is what the Head
Agent's "one combined celebration pass" decision described: reuse the same
badge slot/mechanism rather than adding a second visual section.

**Empty-case confirmed:** `newAchievements = []` (the default/common case)
makes `extraAchievements = []` for every player card; combined with
`extraNewBests = []` the row's render condition is false and nothing extra
renders — output identical to before this change. Verified via `npx tsc
--noEmit` (clean) and a read-through of the diff.

**Explicitly out of scope (left for Animation Agent, Stage 3):** no new
haptic/sound and no dedicated entrance was added for the achievement
chips specifically — they ride the same `ZoomIn.delay(delay +
R.newBestPop)...` entrance already written for the PB standalone chips
(unchanged), which itself still has no haptic of its own; the existing
single `haptic.rigid()` accent (gated on `newBests.length > 0` only) does
**not** yet also fire for achievement-only matches — that's exactly the
Head Agent's "one combined haptic accent" requirement, and it's Animation's
job next round to extend that gate to `newBests.length > 0 ||
newAchievements.length > 0` (or equivalent) so an achievement-only win
still gets its one accent tick. Flagging this explicitly so Stage 3 doesn't
miss it: as shipped by this stage, an achievement unlock with zero new PBs
currently produces a silent chip pop with no haptic at all, since the
existing haptic effect's dependency/gate only checks `newBests.length`.

---

## Animation Agent — motion/haptic (fill in below)

**File:** `src/screens/GameSummaryScreen.tsx` only (no other files touched).

**Motion — already correct as shipped by UI Stage 2, no change needed:** on
reading the standing code, the achievement chips (`extraAchievements.map`,
around line 344) were already wrapped in the identical entrance UI had
given the PB standalone chips one line above them — same
`Animated.View` / `entering={ZoomIn.delay(delay + R.newBestPop)
.springify().damping(SPRING_BOUNCY.damping).stiffness(SPRING_BOUNCY.stiffness)}`,
same `R.newBestPop` (the existing `reducedMs(REVEAL.newBestPop)` beat), same
`styles.extraBestChip` container. No second timing constant was invented —
achievement chips land in exactly the same beat as PB chips, as instructed.
This is because both arrays (`extraNewBests`, `extraAchievements`) are
mapped inside the same `extraBestsRow` block and UI's Stage 2 diff reused
the whole chip-rendering pattern verbatim rather than writing a parallel
one. Confirmed by reading the full render path top to bottom — nothing to
add here.

**Haptic gate — the actual bug, fixed:** the single `useEffect` right above
(originally gated `if (!match?.winnerId || newBests.length === 0) return;`,
deps `[match?.winnerId, newBests.length]`) has been changed to:

```ts
if (!match?.winnerId || (newBests.length === 0 && newAchievements.length === 0)) return;
...
}, [match?.winnerId, newBests.length, newAchievements.length]);
```

`haptic.rigid()` still fires at most once per ceremony, still timed to
`reducedMs(REVEAL.stats) + reducedMs(REVEAL.newBestPop)` (unchanged —
matches the winner's first-card badge/chip pop delay, cardIndex 0), it now
just also considers achievements as a trigger. Comments above the effect
were reworded to describe both badge and chip sources instead of only
"NEW BEST" badges.

**Traces:**

(a) **Achievement-only win (no PB):** `newBests = []`, `newAchievements =
[<1+ entries>]`. Gate: `newBests.length === 0` is true, but
`newAchievements.length === 0` is false, so the combined `&&` is false →
the early return does *not* fire → `setTimeout` schedules `haptic.rigid()`
at the usual `R.stats + R.newBestPop` mark. Before this fix, this exact
case returned early (silent chip pop) — now fixed.

(b) **PB-only win (no achievement):** `newBests = [<1+ entries>]`,
`newAchievements = []`. `newBests.length === 0` is false, so the `&&`
short-circuits to false regardless of the achievements side → gate passes
→ haptic fires exactly once, identical timing and behavior to before this
change. No regression.

(c) **Both PB(s) and achievement(s) in the same match:** both arrays
non-empty → gate passes (as it already did before, via `newBests.length`
alone) → still exactly **one** `setTimeout`/`haptic.rigid()` call from this
one `useEffect` — there is only one effect, one `setTimeout`, no per-item
loop, so there was never a risk of double-firing; adding
`newAchievements.length` to the condition doesn't add a second effect or a
second timer. Confirms the Head Agent's "one combined celebration pass,
one haptic total" requirement holds for the both-case exactly as it does
for PB-only.

(d) **Reduced motion, achievement chip pop:** `isReducedMotionEnabled()`
true → `R.newBestPop = reducedMs(REVEAL.newBestPop) = 0` (same collapse PB
chips already got) → achievement chip's `ZoomIn.delay(delay + 0)` fires
simultaneously with its parent card instead of visibly after it, but the
`SPRING_BOUNCY` overshoot itself still plays in full (only the pre-delay
collapses, matching the "fast-forward the choreography, don't skip the
flourish" precedent already set for PB chips/badges in
`collab-pb-celebration.md`). With reduced motion **on**, the haptic gate
fix also means an achievement-only win now gets its `haptic.rigid()` at
`reducedMs(REVEAL.stats) + reducedMs(REVEAL.newBestPop) = 0`, i.e.
immediately on mount — consistent with how the PB-only reduced-motion trace
already behaved (documented in the PB collab file), just now also reachable
via the achievements branch of the condition.

**Confirms all 3 stages of this collab are now closed:** Logic's
`newAchievementsFromMatch` diffing (Stage 1), UI's chip rendering sharing
the PB chip's exact component/placement (Stage 2), and this stage's haptic
gate fix plus confirmation that the existing entrance treatment already
satisfied the "same beat as PB chips" requirement (Stage 3) — no further
work flagged for QA/Integration beyond the standard review pass.

**Not touched:** `newAchievementsFromMatch`'s diffing logic, the chip
JSX/copy/icon mapping, and the PB badge/chip code paths are all unchanged
by this stage — only the haptic `useEffect`'s condition and dependency
array were edited, plus surrounding comments.
